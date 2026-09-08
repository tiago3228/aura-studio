import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PRO_PRICE = 49.9;
export const TRIAL_DAYS = 30;

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function currentOrg(supabase: {
  from: (t: string) => any;
}): Promise<{ id: string; role: string } | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.organization_id, role: data.role } : null;
}

/** Garante que a clínica tenha uma assinatura (inicia em teste de 30 dias). */
async function ensureSubscription(orgId: string, userId: string) {
  const admin = await adminClient();
  const existing = await admin.from("subscriptions").select("*").eq("organization_id", orgId).maybeSingle();
  if (existing.data) return existing.data;

  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
  const created = await admin
    .from("subscriptions")
    .insert({
      organization_id: orgId,
      plan: "pro",
      status: "trialing",
      amount: PRO_PRICE,
      trial_ends_at: trialEnd,
      current_period_end: trialEnd,
      created_by: userId,
    })
    .select("*")
    .single();
  return created.data;
}

export const getBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const org = await currentOrg(context.supabase as never);
    if (!org) return { subscription: null, events: [], configured: false };

    const subscription = await ensureSubscription(org.id, context.userId);
    const admin = await adminClient();
    const events = await admin
      .from("subscription_events")
      .select("id, kind, amount, status, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      subscription,
      events: events.data ?? [],
      configured: !!(process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? process.env["MERCADOPAGO_ACCESS_TOKEN"]),
      isAdmin: org.role === "owner" || org.role === "manager",
    };
  });

/** Cria a assinatura recorrente no Mercado Pago e devolve o link de cadastro do cartão. */
export const startProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ backUrl: z.string().url(), email: z.string().email().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const token = process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!token) return { ok: false as const, message: "Mercado Pago ainda não configurado." };

    const org = await currentOrg(context.supabase as never);
    if (!org) return { ok: false as const, message: "Clínica não encontrada." };
    if (org.role !== "owner" && org.role !== "manager")
      return { ok: false as const, message: "Apenas proprietária ou gerente pode assinar." };

    const sub = await ensureSubscription(org.id, context.userId);
    if (sub?.mp_preapproval_id && ["authorized", "active"].includes(sub.status))
      return { ok: false as const, message: "Já existe uma assinatura ativa." };
    if (sub?.mp_preapproval_id && sub.mp_init_point && sub.status === "pending")
      return { ok: true as const, url: sub.mp_init_point };

    const email = data.email ?? (context.claims as { email?: string }).email;
    if (!email) return { ok: false as const, message: "E-mail do responsável não encontrado." };

    const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
    const remainingDays = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));

    const body: Record<string, unknown> = {
      reason: "Aura PRO — gestão para clínicas",
      external_reference: org.id,
      payer_email: email,
      back_url: data.backUrl,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PRO_PRICE,
        currency_id: "BRL",
        ...(remainingDays > 0
          ? { free_trial: { frequency: remainingDays, frequency_type: "days" } }
          : {}),
      },
    };

    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${org.id}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
    };
    if (!res.ok || !json.id) {
      console.error("mercadopago preapproval error", res.status, json);
      return { ok: false as const, message: json.message ?? "Não foi possível iniciar a assinatura." };
    }

    const url = json.init_point ?? json.sandbox_init_point!;
    const admin = await adminClient();
    await admin
      .from("subscriptions")
      .update({
        status: "pending",
        mp_preapproval_id: json.id,
        mp_init_point: url,
        mp_payer_email: email,
      })
      .eq("organization_id", org.id);
    await admin.from("subscription_events").insert({
      organization_id: org.id,
      subscription_id: sub?.id ?? null,
      kind: "checkout_criado",
      status: "pending",
      external_id: json.id,
      amount: PRO_PRICE,
    });

    return { ok: true as const, url };
  });

export const cancelProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const org = await currentOrg(context.supabase as never);
    if (!org) return { ok: false as const, message: "Clínica não encontrada." };
    if (org.role !== "owner" && org.role !== "manager")
      return { ok: false as const, message: "Apenas proprietária ou gerente pode cancelar." };

    const admin = await adminClient();
    const sub = await admin.from("subscriptions").select("*").eq("organization_id", org.id).maybeSingle();
    if (!sub.data) return { ok: false as const, message: "Assinatura não encontrada." };

    const token = process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (token && sub.data.mp_preapproval_id) {
      const res = await fetch(`https://api.mercadopago.com/preapproval/${sub.data.mp_preapproval_id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) console.error("mercadopago cancel error", res.status, await res.text());
    }

    await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("organization_id", org.id);
    await admin.from("subscription_events").insert({
      organization_id: org.id,
      subscription_id: sub.data.id,
      kind: "cancelamento",
      status: "canceled",
    });

    return { ok: true as const, message: "Assinatura cancelada. Sem multa." };
  });
