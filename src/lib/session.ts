import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type Membership = {
  organization: Organization;
  role: AppRole;
  userId: string;
};

/** Organização ativa do usuário autenticado (multi-tenant: RLS já filtra tudo). */
export function useMembership() {
  return useQuery({
    queryKey: ["membership"],
    staleTime: 30_000,
    queryFn: async (): Promise<Membership | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organization_id, organizations(*)")
        .eq("user_id", auth.user.id)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.organizations) return null;
      return {
        organization: data.organizations as Organization,
        role: data.role,
        userId: auth.user.id,
      };
    },
  });
}

export const isAdminRole = (role?: AppRole | null) => role === "owner" || role === "manager";

export const roleLabel: Record<AppRole, string> = {
  owner: "Proprietária",
  manager: "Gerente",
  reception: "Recepção",
  professional: "Profissional",
};

/** Permissões granulares por perfil (RBAC de interface; o banco reforça via RLS). */
const PERMISSIONS: Record<AppRole, string[]> = {
  owner: ["*"],
  manager: ["*"],
  reception: ["dashboard", "agenda", "clientes", "procedimentos", "pacotes", "anamnese", "crm"],
  professional: ["dashboard", "agenda", "clientes", "anamnese", "comissoes", "pacotes"],
};

export const can = (role: AppRole | undefined | null, area: string) => {
  if (!role) return false;
  const list = PERMISSIONS[role];
  return list.includes("*") || list.includes(area);
};
