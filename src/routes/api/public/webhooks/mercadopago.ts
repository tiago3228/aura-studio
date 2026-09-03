import { createFileRoute } from "@tanstack/react-router";

const MP_API = "https://api.mercadopago.com";

const STATUS_MAP: Record<string, string> = {
  authorized: "active",
  paused: "paused",
  cancelled: "canceled",
  pending: "pending",
};

async function mpGet(path: string, token: string) {
  const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, any>;
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? process.env["MERCADOPAGO_ACCESS_TOKEN"];
        if (!token) return new Response("not configured", { status: 200 });

        let payload: Record<string, any> = {};
        try {
          payload = (await request.json()) as Record<string, any>;
        } catch {
          payload = {};
        }
        const url = new URL(request.url);
        const type = payload["type"] ?? payload["topic"] ?? url.searchParams.get("type") ?? "";
        const id = String(payload["data"]?.id ?? payload["id"] ?? url.searchParams.get("id") ?? "");
        if (!id) return new Response("ok");

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
          const preapprovalId = pay["metadata"]?.preapproval_id ?? pay["preapproval_id"];
          const orgId = pay["external_reference"] as string | undefined;

          const sub = orgId
            ? await supabaseAdmin.from("subscriptions").select("*").eq("organization_id", orgId).maybeSingle()
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
              .update({ status: "active", current_period_end: next.toISOString(), canceled_at: null })
              .eq("id", sub.data.id);
          }
          if (pay["status"] === "rejected") {
            await supabaseAdmin.from("subscriptions").update({ status: "past_due" }).eq("id", sub.data.id);
          }
        }

        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});
