import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const APP_AUTH_URL = "https://clinica-estetica-br.lovable.app/auth";

async function requireTeamAccess(userId: string, organizationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("organization_members")
    .select("role, permissions")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const permissions = data?.permissions;
  const hasEditPermission =
    !!permissions &&
    typeof permissions === "object" &&
    !Array.isArray(permissions) &&
    (permissions as Record<string, unknown>)["equipe.editar"] === true;
  if (!data || (!["owner", "manager"].includes(data.role) && !hasEditPermission)) {
    throw new Error("Você não pode criar acessos para a equipe.");
  }
  return supabaseAdmin;
}

export const inviteCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        professionalId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["manager", "reception", "professional"]),
        permissions: z.record(z.string(), z.boolean()).default({}),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireTeamAccess(context.userId, data.organizationId);
    const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: APP_AUTH_URL,
      data: { invited_by_aura: true },
    });
    let userId = invited.data.user?.id;
    if (!userId) {
      const users = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = users.data.users.find(
        (user) => user.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) {
        throw new Error(invited.error?.message ?? "Não foi possível enviar o convite.");
      }
      userId = existing.id;
    }
    const member = await supabaseAdmin
      .from("organization_members")
      .upsert(
        {
          organization_id: data.organizationId,
          user_id: userId,
          role: data.role,
          active: true,
          professional_id: data.professionalId,
          permissions: data.permissions,
        },
        { onConflict: "organization_id,user_id" },
      )
      .select("id")
      .single();
    if (member.error) throw new Error(member.error.message);
    const professional = await supabaseAdmin
      .from("professionals")
      .update({ user_id: userId })
      .eq("id", data.professionalId)
      .eq("organization_id", data.organizationId);
    if (professional.error) throw new Error(professional.error.message);
    await context.supabase.rpc("write_audit_log", {
      _organization_id: data.organizationId,
      _action: "invite_collaborator",
      _entity: "organization_members",
      _entity_id: member.data.id,
      _meta: { email: data.email, role: data.role, professional_id: data.professionalId },
      _after: { user_id: userId, permissions: data.permissions },
      _severity: "info",
    });
    return { memberId: member.data.id, userId };
  });

export const resendCollaboratorInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid(), email: z.string().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireTeamAccess(context.userId, data.organizationId);
    const result = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: APP_AUTH_URL },
    });
    if (result.error) throw new Error(result.error.message);
    return { actionLink: result.data.properties.action_link };
  });

export const generateCollaboratorAccessLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid(), email: z.string().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireTeamAccess(context.userId, data.organizationId);
    const result = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: data.email,
      options: { redirectTo: APP_AUTH_URL },
    });
    if (result.error || !result.data.properties.action_link) {
      throw new Error(result.error?.message ?? "Não foi possível gerar o link de acesso.");
    }
    return { actionLink: result.data.properties.action_link };
  });
