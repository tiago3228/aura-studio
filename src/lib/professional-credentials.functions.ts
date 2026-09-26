import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const loginEmail = (username: string) => `${username.toLowerCase()}@login.aura.local`;

export const createProfessionalCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        professionalId: z.string().uuid(),
        username: z
          .string()
          .trim()
          .min(3)
          .max(40)
          .regex(/^[a-zA-Z0-9._-]+$/),
        password: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const access = await supabaseAdmin
      .from("organization_members")
      .select("role, permissions")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (access.error) throw new Error(access.error.message);
    const permissions = access.data?.permissions;
    const allowed =
      access.data &&
      (["owner", "manager"].includes(access.data.role) ||
        (!!permissions &&
          typeof permissions === "object" &&
          !Array.isArray(permissions) &&
          (permissions as Record<string, unknown>)["equipe.editar"] === true));
    if (!allowed) throw new Error("Você não pode criar acessos para a equipe.");
    const professional = await supabaseAdmin
      .from("professionals")
      .select("id, name, user_id")
      .eq("id", data.professionalId)
      .eq("organization_id", data.organizationId)
      .single();
    if (professional.error) throw new Error(professional.error.message);
    const email = loginEmail(data.username);
    let userId = professional.data.user_id;
    if (userId) {
      const updated = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
      });
      if (updated.error) throw new Error(updated.error.message);
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { login_username: data.username, invited_by_aura: true },
      });
      if (created.data.user) {
        userId = created.data.user.id;
      } else {
        const users = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = users.data.users.find(
          (user) => user.email?.toLowerCase() === email.toLowerCase(),
        );
        if (!existing) {
          throw new Error(created.error?.message ?? "Não foi possível criar o usuário.");
        }
        const updated = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: data.password,
          user_metadata: { login_username: data.username, invited_by_aura: true },
        });
        if (updated.error) throw new Error(updated.error.message);
        userId = existing.id;
      }
    }
    const updatedProfessional = await supabaseAdmin
      .from("professionals")
      .update({ user_id: userId, login_username: data.username.toLowerCase() })
      .eq("id", data.professionalId);
    if (updatedProfessional.error) throw new Error(updatedProfessional.error.message);
    const member = await supabaseAdmin.from("organization_members").upsert(
      {
        organization_id: data.organizationId,
        user_id: userId,
        professional_id: data.professionalId,
        role: "professional",
        active: true,
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
    if (member.error) throw new Error(member.error.message);
    return { username: data.username.toLowerCase(), loginEmail: email };
  });

export const resolveProfessionalLogin = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().trim().min(3).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const professional = await supabaseAdmin
      .from("professionals")
      .select("login_username")
      .ilike("login_username", data.username)
      .eq("active", true)
      .maybeSingle();
    if (professional.error || !professional.data?.login_username)
      throw new Error("Usuário ou senha incorretos.");
    return { email: loginEmail(professional.data.login_username) };
  });
