const MP_API = "https://api.mercadopago.com";
const WEBHOOK_PATH = "/api/public/webhooks/mercadopago";

export type MpPayment = {
  id: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  date_approved?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

function accessToken() {
  const token =
    process.env["MERCADOPAGO_PROD_ACCESS_TOKEN"] ?? process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Mercado Pago ainda não configurado.");
  return token;
}

function publicBaseUrl() {
  return (process.env["APP_BASE_URL"] ?? "https://clinica-estetica-br.lovable.app").replace(
    /\/$/,
    "",
  );
}

function webhookUrl() {
  if (!process.env["MERCADOPAGO_WEBHOOK_SECRET"])
    throw new Error("Configure MERCADOPAGO_WEBHOOK_SECRET antes de gerar cobranças Pix.");
  return `${publicBaseUrl()}${WEBHOOK_PATH}`;
}

async function mpFetch<T>(path: string, init: { body?: unknown; idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken()}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;
  const response = await fetch(`${MP_API}${path}`, {
    method: init.body ? "POST" : "GET",
    headers,
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error("[mercadopago] request failed", {
      path,
      status: response.status,
      body: text.slice(0, 500),
    });
    throw new Error(`Mercado Pago respondeu ${response.status}.`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export async function createPixPayment(input: {
  organizationId: string;
  amount: number;
  payerEmail: string;
  idempotencyKey: string;
}) {
  return mpFetch<MpPayment>("/v1/payments", {
    idempotencyKey: input.idempotencyKey,
    body: {
      transaction_amount: input.amount,
      description: "Aura PRO — gestão para clínicas de estética",
      payment_method_id: "pix",
      external_reference: `aura-pix:${input.organizationId}:${input.idempotencyKey}`,
      notification_url: webhookUrl(),
      payer: { email: input.payerEmail },
    },
  });
}

export async function getPayment(id: string) {
  return mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}
