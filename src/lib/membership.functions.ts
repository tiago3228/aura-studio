import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrentMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("organization_members")
      .select("role, organization_id, professional_id, permissions, organizations(*)")
      .eq("user_id", context.userId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.organizations) return null;
    return {
      organization: data.organizations,
      role: data.role,
      userId: context.userId,
      professionalId: data.professional_id,
      permissions: data.permissions,
    };
  });
