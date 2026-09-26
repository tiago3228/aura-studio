import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrentMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data, error } = await supabaseAdmin
      .from("organization_members")
      .select("role, organization_id, professional_id, permissions, organizations(*)")
      .eq("user_id", context.userId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Self-heal links created before the collaborator flow was fully completed.
    if (!data) {
      const email = typeof context.claims.email === "string" ? context.claims.email : null;
      let query = supabaseAdmin
        .from("professionals")
        .select("id, organization_id, email, user_id")
        .eq("user_id", context.userId)
        .eq("active", true)
        .limit(2);
      if (email) {
        query = supabaseAdmin
          .from("professionals")
          .select("id, organization_id, email, user_id")
          .or(`user_id.eq.${context.userId},email.ilike.${email}`)
          .eq("active", true)
          .limit(2);
      }
      const result = await query;
      const professional = result.data?.length === 1 ? result.data[0] : null;
      if (professional) {
        if (
          !professional.user_id &&
          email &&
          professional.email?.toLowerCase() === email.toLowerCase()
        ) {
          await supabaseAdmin
            .from("professionals")
            .update({ user_id: context.userId })
            .eq("id", professional.id)
            .is("user_id", null);
        }
        const linked = await supabaseAdmin.from("organization_members").upsert(
          {
            organization_id: professional.organization_id,
            user_id: context.userId,
            role: "professional",
            active: true,
            professional_id: professional.id,
            permissions: {
              "dashboard.ver": true,
              "agenda.ver": true,
              "agenda.propria": true,
              "agenda.criar": true,
              "agenda.editar": true,
            },
          },
          { onConflict: "organization_id,user_id" },
        );
        if (linked.error) throw new Error(linked.error.message);
        ({ data, error } = await supabaseAdmin
          .from("organization_members")
          .select("role, organization_id, professional_id, permissions, organizations(*)")
          .eq("user_id", context.userId)
          .eq("active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle());
        if (error) throw new Error(error.message);
      }
    }

    if (!data?.organizations) return null;
    return {
      organization: data.organizations,
      role: data.role,
      userId: context.userId,
      professionalId: data.professional_id,
      permissions: data.permissions,
    };
  });
