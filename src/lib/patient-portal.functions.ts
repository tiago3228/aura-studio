import { randomBytes, createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createPatientPortalLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ clientId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const client = await context.supabase
      .from("clients")
      .select("id, organization_id")
      .eq("id", data.clientId)
      .single();
    if (client.error || !client.data) throw new Error("Paciente não encontrada.");
    const member = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", client.data.organization_id)
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (!member.data || !["owner", "manager"].includes(member.data.role))
      throw new Error("Somente a proprietária ou gerente pode gerar o link do portal.");
    await context.supabase
      .from("patient_portal_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("client_id", data.clientId)
      .is("revoked_at", null);
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const inserted = await context.supabase
      .from("patient_portal_tokens")
      .insert({
        organization_id: client.data.organization_id,
        client_id: data.clientId,
        token_hash: tokenHash,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (inserted.error) throw new Error("Não foi possível criar o link do portal.");
    return { token };
  });
