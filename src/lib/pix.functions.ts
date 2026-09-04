import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRO_PRICE } from "@/lib/billing.functions";

/** Chave Pix que recebe as assinaturas e e-mail do administrador da plataforma. */
export const PIX_KEY = "tiago3228@gmail.com";
export const PIX_KEY_TYPE = "E-mail";
export const PLATFORM_ADMIN_EMAILS = ["tiago3228@yahoo.com.br", "tiago3228@gmail.com"];

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

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

    const admin = await adminClient();
    const payments = await admin
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

    const admin = await adminClient();
    const pending = await admin
      .from("pix_payments")
      .select("id")
      .eq("organization_id", org.id)
      .eq("status", "pending")
      .maybeSingle();
    if (pending.data)
      return { ok: false as const, message: "Já existe um pagamento aguardando liberação." };

    const sub = await admin.from("subscriptions").select("id").eq("organization_id", org.id).maybeSingle();
    const orgRow = await admin.from("organizations").select("name").eq("id", org.id).maybeSingle();

    const inserted = await admin
      .from("pix_payments")
      .insert({
        organization_id: org.id,
        subscription_id: sub.data?.id ?? null,
        amount: PRO_PRICE * data.months,
        months: data.months,
        pix_key: PIX_KEY,
        payer_note: data.note ?? null,
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (inserted.error) return { ok: false as const, message: "Não foi possível registrar o pagamento." };

    await admin.from("subscription_events").insert({
      organization_id: org.id,
      subscription_id: sub.data?.id ?? null,
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
    const admin = await adminClient();
    const { data } = await admin
      .from("pix_payments")
      .select("id, organization_id, amount, months, status, payer_note, admin_note, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const orgIds = [...new Set((data ?? []).map((p) => p.organization_id))];
    const orgs = orgIds.length
      ? await admin.from("organizations").select("id, name").in("id", orgIds)
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

    const admin = await adminClient();
    const payment = await admin.from("pix_payments").select("*").eq("id", data.id).maybeSingle();
    if (!payment.data) return { ok: false as const, message: "Pagamento não encontrado." };
    if (payment.data.status !== "pending")
      return { ok: false as const, message: "Este pagamento já foi revisado." };

    await admin
      .from("pix_payments")
      .update({
        status: data.approve ? "approved" : "rejected",
        admin_note: data.note ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (data.approve) {
      const sub = await admin
        .from("subscriptions")
        .select("*")
        .eq("organization_id", payment.data.organization_id)
        .maybeSingle();
      const base = sub.data?.current_period_end ? new Date(sub.data.current_period_end) : new Date();
      const from = base.getTime() > Date.now() ? base : new Date();
      const end = new Date(from);
      end.setMonth(end.getMonth() + (payment.data.months ?? 1));

      await admin
        .from("subscriptions")
        .update({
          status: "active",
          plan: "pro",
          current_period_end: end.toISOString(),
          canceled_at: null,
        })
        .eq("organization_id", payment.data.organization_id);
    }

    await admin.from("subscription_events").insert({
      organization_id: payment.data.organization_id,
      subscription_id: payment.data.subscription_id,
      kind: data.approve ? "pix_liberado" : "pix_recusado",
      status: data.approve ? "active" : "rejected",
      amount: payment.data.amount,
    });

    return {
      ok: true as const,
      message: data.approve ? "Assinatura liberada por 1 período." : "Pagamento recusado.",
    };
  });
