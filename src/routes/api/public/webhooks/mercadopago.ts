import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const MP_API = "https://api.mercadopago.com";

const STATUS_MAP: Record<string, string> = {
  authorized: "active",
  paused: "paused",
  cancelled: "canceled",
  pending: "pending",
};

type MpObject = Record<string, unknown>;

async function mpGet(path: string, token: string) {
  const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json()) as MpObject;
}

/** Verifica a assinatura x-signature do Mercado Pago (HMAC-SHA256). */
function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  if (!secret) return false;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;

  const parts: Record<string, string> = {};
  for (const kv of signature.split(",")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) return false;
    const timestamp = Number(ts);
    return Number.isFinite(timestamp) && Math.abs(Date.now() / 1000 - timestamp) <= 300;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token =
          process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? process.env["MERCADOPAGO_ACCESS_TOKEN"];
        if (!token) return new Response("not configured", { status: 200 });

        let payload: MpObject = {};
        try {
          payload = (await request.json()) as MpObject;
        } catch {
          payload = {};
        }
        const url = new URL(request.url);
        const payloadData = payload["data"];
        const dataId =
          payloadData && typeof payloadData === "object"
            ? (payloadData as MpObject)["id"]
            : undefined;
        const type = String(
          payload["type"] ?? payload["topic"] ?? url.searchParams.get("type") ?? "",
        );
        const id = String(dataId ?? payload["id"] ?? url.searchParams.get("id") ?? "");
        if (!id) return new Response("ok");

        if (!verifySignature(request, id))
          return new Response("invalid signature", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (type.includes("preapproval")) {
          const pre = await mpGet(`/preapproval/${id}`, token);
          if (!pre) return new Response("ok");
          const orgId = pre["external_reference"] as string | undefined;
          if (!orgId) return new Response("ok");
          const status = STATUS_MAP[pre["status"] as string] ?? String(pre["status"]);
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status,
              mp_preapproval_id: id,
              current_period_end: pre["next_payment_date"] ?? null,
              ...(status === "canceled" ? { canceled_at: new Date().toISOString() } : {}),
            })
            .eq("organization_id", orgId);
          await supabaseAdmin
            .from("subscription_events")
            .upsert(
              {
                organization_id: orgId,
                kind: "assinatura_atualizada",
                status,
                external_id: `pre-${id}-${status}`,
              },
              { onConflict: "kind,external_id", ignoreDuplicates: true },
            )
            .select();
          return new Response("ok");
        }

        if (type.includes("payment")) {
          const pay = await mpGet(`/v1/payments/${id}`, token);
          if (!pay) return new Response("ok");

          const dynamicPix = await supabaseAdmin
            .from("mercadopago_pix_payments")
            .select("id, organization_id, subscription_id, amount, status")
            .eq("provider", "mercado_pago")
            .eq("provider_payment_id", id)
            .maybeSingle();
          if (dynamicPix.data) {
            const paymentStatus = String(pay["status"] ?? "pending");
            const approved = paymentStatus === "approved";
            const now = new Date();
            const periodStart = approved ? now.toISOString() : null;
            const periodEnd = approved
              ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : null;

            await supabaseAdmin
              .from("mercadopago_pix_payments")
              .update({
                status: paymentStatus,
                status_detail: pay["status_detail"] ?? null,
                paid_at: approved ? (pay["date_approved"] ?? now.toISOString()) : null,
                period_start: periodStart,
                period_end: periodEnd,
              })
              .eq("id", dynamicPix.data.id);

            if (approved) {
              const subscription = await supabaseAdmin
                .from("subscriptions")
                .select("id, current_period_end")
                .eq("organization_id", dynamicPix.data.organization_id)
                .maybeSingle();
              const base = Math.max(
                Date.now(),
                subscription.data?.current_period_end
                  ? new Date(subscription.data.current_period_end).getTime()
                  : 0,
              );
              const accessEnd = new Date(base);
              accessEnd.setMonth(accessEnd.getMonth() + 1);
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  status: "active",
                  plan: "pro",
                  amount: Number(dynamicPix.data.amount ?? 49.9),
                  current_period_end: accessEnd.toISOString(),
                  canceled_at: null,
                })
                .eq("organization_id", dynamicPix.data.organization_id);
            }

            await supabaseAdmin.from("subscription_events").upsert(
              {
                organization_id: dynamicPix.data.organization_id,
                subscription_id: dynamicPix.data.subscription_id,
                kind: "pagamento_pix_mercado_pago",
                status: paymentStatus,
                amount: Number(pay["transaction_amount"] ?? dynamicPix.data.amount ?? 0),
                external_id: `pix-${id}-${paymentStatus}`,
              },
              { onConflict: "kind,external_id", ignoreDuplicates: true },
            );
            return new Response("ok");
          }

          const metadata = pay["metadata"];
          const preapprovalId =
            metadata && typeof metadata === "object"
              ? (metadata as MpObject)["preapproval_id"]
              : pay["preapproval_id"];
          const orgId = pay["external_reference"] as string | undefined;

          const sub = orgId
            ? await supabaseAdmin
                .from("subscriptions")
                .select("*")
                .eq("organization_id", orgId)
                .maybeSingle()
            : preapprovalId
              ? await supabaseAdmin
                  .from("subscriptions")
                  .select("*")
                  .eq("mp_preapproval_id", String(preapprovalId))
                  .maybeSingle()
              : { data: null };

          if (!sub.data) return new Response("ok");

          // idempotência: um evento por pagamento evita registro/cobrança duplicada
          const inserted = await supabaseAdmin
            .from("subscription_events")
            .upsert(
              {
                organization_id: sub.data.organization_id,
                subscription_id: sub.data.id,
                kind: "pagamento",
                status: String(pay["status"]),
                amount: Number(pay["transaction_amount"] ?? 0),
                external_id: String(id),
              },
              { onConflict: "kind,external_id", ignoreDuplicates: true },
            )
            .select();

          if (pay["status"] === "approved" && (inserted.data?.length ?? 0) > 0) {
            const next = new Date();
            next.setMonth(next.getMonth() + 1);
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
                current_period_end: next.toISOString(),
                canceled_at: null,
              })
              .eq("id", sub.data.id);
          }
          if (pay["status"] === "rejected") {
            await supabaseAdmin
              .from("subscriptions")
              .update({ status: "past_due" })
              .eq("id", sub.data.id);
          }
        }

        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});
