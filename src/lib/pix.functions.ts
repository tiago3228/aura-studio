import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRO_PRICE } from "@/lib/billing.functions";
import { reviewPixPaymentSecure } from "@/lib/secure-actions.functions";

/** Chave Pix que recebe as assinaturas e e-mail do administrador da plataforma. */
export const PIX_KEY = "tiago3228@gmail.com";
export const PIX_KEY_TYPE = "E-mail";
export const PLATFORM_ADMIN_EMAILS = ["tiago3228@yahoo.com.br", "tiago3228@gmail.com"];

function emailOf(context: { claims: unknown }) {
  return String((context.claims as { email?: string }).email ?? "").toLowerCase();
}

function isPlatformAdmin(context: { claims: unknown }) {
  return PLATFORM_ADMIN_EMAILS.includes(emailOf(context));
}

async function currentOrg(supabase: { from: (t: string) => any }) {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.organization_id as string, role: data.role as string } : null;
}

/** Notifica o administrador (registro no servidor; envio por e-mail ativa com o domínio configurado). */
async function notifyAdmin(subject: string, lines: string[]) {
  console.info(`[pix] ${PLATFORM_ADMIN_EMAILS[0]} · ${subject} · ${lines.join(" | ")}`);
}

/** Dados do Pix + histórico de solicitações da clínica. */
export const getPixInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const org = await currentOrg(context.supabase as never);
    if (!org) return { pixKey: PIX_KEY, keyType: PIX_KEY_TYPE, amount: PRO_PRICE, payments: [], isPlatformAdmin: false };

    const payments = await context.supabase
      .from("pix_payments")
      .select("id, amount, status, months, payer_note, admin_note, created_at, reviewed_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      pixKey: PIX_KEY,
      keyType: PIX_KEY_TYPE,
      amount: PRO_PRICE,
      payments: payments.data ?? [],
      isPlatformAdmin: isPlatformAdmin(context),
    };
  });

/** A clínica avisa que pagou via Pix; fica aguardando liberação manual. */
export const declarePixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ months: z.number().int().min(1).max(12).default(1), note: z.string().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const org = await currentOrg(context.supabase as never);
    if (!org) return { ok: false as const, message: "Clínica não encontrada." };
    if (org.role !== "owner" && org.role !== "manager")
      return { ok: false as const, message: "Apenas proprietária ou gerente pode informar o pagamento." };

    const orgRow = await context.supabase.from("organizations").select("name").eq("id", org.id).maybeSingle();
    const pending = await context.supabase
      .from("pix_payments").select("id").eq("organization_id", org.id).eq("status", "pending").limit(1);
    if (pending.data?.length) return { ok: false as const, message: "Já existe um pagamento aguardando liberação." };
    const subscription = await context.supabase.from("subscriptions").select("id").eq("organization_id", org.id).maybeSingle();
    const declared = await context.supabase.from("pix_payments").insert({
      organization_id: org.id,
      subscription_id: subscription.data?.id ?? null,
      amount: PRO_PRICE * data.months,
      months: data.months,
      pix_key: PIX_KEY,
      payer_note: data.note?.trim() || null,
      requested_by: context.userId,
    });
    if (declared.error) return { ok: false as const, message: "Não foi possível registrar o pagamento." };
    await context.supabase.from("subscription_events").insert({
      organization_id: org.id,
      subscription_id: subscription.data?.id ?? null,
      kind: "pix_informado",
      status: "pending",
      amount: PRO_PRICE * data.months,
    });

    await notifyAdmin("Novo pagamento Pix aguardando liberação", [
      `Clínica: ${orgRow.data?.name ?? org.id}`,
      `Valor: R$ ${(PRO_PRICE * data.months).toFixed(2)}`,
      `Responsável: ${emailOf(context)}`,
    ]);

    return { ok: true as const, message: "Pagamento informado! Assim que confirmado, o acesso é liberado." };
  });

/** Painel do administrador: todas as solicitações Pix. */
export const listPixPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isPlatformAdmin(context)) return { ok: false as const, items: [] };
    const { data } = await context.supabase
      .from("pix_payments")
      .select("id, organization_id, amount, months, status, payer_note, admin_note, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const orgIds = [...new Set((data ?? []).map((p) => p.organization_id))];
    const orgs = orgIds.length
      ? await context.supabase.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] as { id: string; name: string }[] };
    const nameById = new Map((orgs.data ?? []).map((o) => [o.id, o.name]));

    return {
      ok: true as const,
      items: (data ?? []).map((p) => ({ ...p, organizationName: nameById.get(p.organization_id) ?? "—" })),
    };
  });

/** Liberação (ou recusa) manual pelo administrador. */
export const reviewPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!isPlatformAdmin(context)) return { ok: false as const, message: "Acesso restrito." };

    try {
      await reviewPixPaymentSecure({ data: { paymentId: data.id, approve: data.approve, note: data.note ?? null } });
    } catch {
      return { ok: false as const, message: "Não foi possível revisar o pagamento." };
    }

    return {
      ok: true as const,
      message: data.approve ? "Assinatura liberada por 1 período." : "Pagamento recusado.",
    };
  });
