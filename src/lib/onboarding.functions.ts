import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createClinicForOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: z.string().max(40).optional().default(""),
        city: z.string().max(100).optional().default(""),
        description: z.string().max(500).optional().default(""),
        slug: z.string().trim().min(2).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orgId = crypto.randomUUID();
    const organization = await supabaseAdmin
      .from("organizations")
      .insert({
        id: orgId,
        name: data.name,
        phone: data.phone || null,
        city: data.city || null,
        description: data.description || null,
        booking_slug: data.slug,
        onboarding_done: true,
      })
      .select("id")
      .single();
    if (organization.error) throw new Error(organization.error.message);
    const member = await supabaseAdmin.from("organization_members").insert({
      organization_id: orgId,
      user_id: context.userId,
      role: "owner",
    });
    if (member.error) {
      await supabaseAdmin.from("organizations").delete().eq("id", orgId);
      throw new Error(member.error.message);
    }
    return { organizationId: orgId };
  });
