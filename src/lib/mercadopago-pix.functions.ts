import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PRO_PRICE } from "@/lib/billing.functions";

export type AuraPixPayment = {
  id: string;
  amount: number;
  status: string;
  statusDetail: string | null;
  providerPaymentId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

function mapPayment(row: Record<string, unknown>): AuraPixPayment {
  return {
    id: row["id"] as string,
    amount: Number(row["amount"] ?? PRO_PRICE),
    status: (row["status"] as string) ?? "pending",
    statusDetail: (row["status_detail"] as string | null) ?? null,
    providerPaymentId: row["provider_payment_id"] as string,
    qrCode: (row["qr_code"] as string | null) ?? null,
    qrCodeBase64: (row["qr_code_base64"] as string | null) ?? null,
    ticketUrl: (row["ticket_url"] as string | null) ?? null,
    expiresAt: (row["expires_at"] as string | null) ?? null,
    paidAt: (row["paid_at"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
  };
}

async function currentOrganization(supabase: SupabaseClient<Database>) {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.organization_id as string, role: data.role as string } : null;
}

/** Lista pagamentos Pix automáticos e permite que a tela acompanhe o webhook. */
export const getMyMercadoPagoPixPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ payments: AuraPixPayment[] }> => {
    const org = await currentOrganization(context.supabase as SupabaseClient<Database>);
    if (!org) return { payments: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("mercadopago_pix_payments")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Não foi possível consultar seus pagamentos Pix.");
    return { payments: (data ?? []).map((row) => mapPayment(row as Record<string, unknown>)) };
  });

/** Cria ou reutiliza uma cobrança Pix pendente no Mercado Pago. */
export const createMercadoPagoPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const org = await currentOrganization(context.supabase as SupabaseClient<Database>);
    if (!org) throw new Error("Clínica não encontrada.");
    if (org.role !== "owner" && org.role !== "manager")
      throw new Error("Apenas proprietária ou gerente pode pagar a assinatura.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const { data: pending } = await supabaseAdmin
      .from("mercadopago_pix_payments")
      .select("*")
      .eq("organization_id", org.id)
      .in("status", ["pending", "in_process"])
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    if (pending?.[0])
      return { payment: mapPayment(pending[0] as Record<string, unknown>), reused: true };

    const email = (context.claims as { email?: string } | undefined)?.email;
    if (!email) throw new Error("E-mail da responsável não encontrado.");
    const { randomUUID } = await import("crypto");
    const idempotencyKey = `aura-pix-${org.id}-${randomUUID()}`;
    const { createPixPayment } = await import("./mercadopago.server");
    const remote = await createPixPayment({
      organizationId: org.id,
      amount: PRO_PRICE,
      payerEmail: email,
      idempotencyKey,
    });
    const transactionData = remote.point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code && !transactionData?.ticket_url)
      throw new Error("O Mercado Pago não retornou os dados do QR Code Pix.");

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("organization_id", org.id)
      .maybeSingle();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const externalReference = `aura-pix:${org.id}:${idempotencyKey}`;
    const { data: inserted, error } = await supabaseAdmin
      .from("mercadopago_pix_payments")
      .insert({
        organization_id: org.id,
        subscription_id: subscription?.id ?? null,
        amount: PRO_PRICE,
        currency: "BRL",
        provider: "mercado_pago",
        provider_payment_id: String(remote.id),
        external_reference: externalReference,
        status: remote.status ?? "pending",
        status_detail: remote.status_detail ?? null,
        qr_code: transactionData.qr_code ?? null,
        qr_code_base64: transactionData.qr_code_base64 ?? null,
        ticket_url: transactionData.ticket_url ?? null,
        payer_email: email,
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (error || !inserted) throw new Error("Não foi possível registrar o pagamento Pix.");
    return { payment: mapPayment(inserted as Record<string, unknown>), reused: false };
  });
