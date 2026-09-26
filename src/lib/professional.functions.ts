import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        name: z.string().trim().min(1).max(160),
        specialty: z.string().trim().max(160).nullable(),
        bio: z.string().trim().max(2000).nullable(),
        certifications: z.string().trim().max(2000).nullable(),
        phone: z.string().trim().max(40).nullable(),
        commissionDefault: z.number().min(0).max(100000),
        commissionType: z.enum(["percentual", "fixo"]),
        workStart: z.string().regex(/^\d{2}:\d{2}$/),
        workEnd: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const organization = await supabaseAdmin
      .from("organizations")
      .select("id, created_by")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (organization.error) throw new Error(organization.error.message);
    if (!organization.data) throw new Error("Clínica não encontrada.");

    const member = await supabaseAdmin
      .from("organization_members")
      .select("role, active")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (member.error) throw new Error(member.error.message);
    const platform = await context.supabase.rpc("is_platform_admin");
    const allowed =
      platform.data === true ||
      organization.data.created_by === context.userId ||
      ["owner", "manager"].includes(member.data?.role ?? "");
    if (!allowed) throw new Error("Você não pode criar profissionais nesta clínica.");

    const inserted = await supabaseAdmin
      .from("professionals")
      .insert({
        organization_id: data.organizationId,
        name: data.name,
        specialty: data.specialty || null,
        bio: data.bio || null,
        certifications: data.certifications || null,
        phone: data.phone || null,
        commission_default: data.commissionDefault,
        commission_type: data.commissionType,
        work_start: data.workStart,
        work_end: data.workEnd,
      })
      .select("id")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    return inserted.data;
  });
