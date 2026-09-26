import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { getCurrentMembership } from "@/lib/membership.functions";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type PermissionKey = string;
export type PermissionMap = Record<string, boolean>;
export const PERMISSION_GROUPS = [
  { area: "Visão geral", permissions: [{ key: "dashboard.ver", label: "Visualizar" }] },
  {
    area: "Agenda",
    permissions: [
      "agenda.ver",
      "agenda.todos",
      "agenda.propria",
      "agenda.criar",
      "agenda.editar",
      "agenda.cancelar",
      "agenda.bloquear",
      "agenda.disponibilidade",
    ].map((key) => ({ key, label: key.replace("agenda.", "").replaceAll(".", " ") })),
  },
  {
    area: "Clientes",
    permissions: [
      "clientes.ver",
      "clientes.criar",
      "clientes.editar",
      "clientes.historico",
      "clientes.excluir",
    ].map((key) => ({ key, label: key.replace("clientes.", "").replaceAll(".", " ") })),
  },
  {
    area: "Procedimentos",
    permissions: [
      { key: "procedimentos.ver", label: "Visualizar" },
      { key: "procedimentos.editar", label: "Editar" },
    ],
  },
  {
    area: "Pacotes",
    permissions: [
      { key: "pacotes.ver", label: "Visualizar" },
      { key: "pacotes.editar", label: "Editar" },
    ],
  },
  {
    area: "Financeiro",
    permissions: [
      { key: "financeiro.ver", label: "Visualizar" },
      { key: "financeiro.editar", label: "Editar" },
    ],
  },
  {
    area: "Equipe",
    permissions: [
      { key: "equipe.ver", label: "Visualizar" },
      { key: "equipe.editar", label: "Gerenciar acessos" },
    ],
  },
  { area: "Relatórios", permissions: [{ key: "relatorios.ver", label: "Visualizar" }] },
  { area: "Ajustes", permissions: [{ key: "configuracoes.ver", label: "Visualizar" }] },
];

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
  professionalId: string | null;
  permissions: PermissionMap;
};
function parsePermissions(value: Json | null | undefined): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, allowed]) => typeof allowed === "boolean"),
  ) as PermissionMap;
}

/** Organização ativa do usuário autenticado (multi-tenant: RLS já filtra tudo). */
export function useMembership() {
  const resolveMembership = useServerFn(getCurrentMembership);
  return useQuery({
    queryKey: ["membership"],
    staleTime: 30_000,
    queryFn: async (): Promise<Membership | null> => {
      const data = await resolveMembership({ data: {} });
      if (!data?.organization) return null;
      return {
        organization: data.organization as Organization,
        role: data.role,
        userId: data.userId,
        professionalId: data.professionalId,
        permissions: parsePermissions(data.permissions),
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

export const can = (
  role: AppRole | undefined | null,
  area: string,
  permissions?: PermissionMap,
) => {
  if (!role) return false;
  if (isAdminRole(role)) return true;
  if (permissions && Object.keys(permissions).length > 0) {
    const key =
      area === "agenda"
        ? "agenda.ver"
        : area === "clientes"
          ? "clientes.ver"
          : area === "financeiro"
            ? "financeiro.ver"
            : area === "equipe"
              ? "equipe.ver"
              : `${area}.ver`;
    return permissions[key] === true;
  }
  return role === "reception"
    ? ["dashboard", "agenda", "clientes", "procedimentos", "pacotes"].includes(area)
    : ["dashboard", "agenda", "clientes", "pacotes"].includes(area);
};

export const hasPermission = (
  membership: Membership | null | undefined,
  permission: PermissionKey,
) => !!membership && (isAdminRole(membership.role) || membership.permissions[permission] === true);
