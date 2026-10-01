import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";

type MetaMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; mime_type?: string; id?: string };
  video?: { caption?: string; mime_type?: string; id?: string };
  audio?: { mime_type?: string; id?: string };
  document?: { caption?: string; mime_type?: string; id?: string; filename?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
};

type MetaStatus = {
  id: string;
  status: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: unknown[];
};

type MetaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
};

type MetaChange = { value?: MetaValue; field?: string };
type MetaPayload = { object?: string; entry?: Array<{ changes?: MetaChange[] }> };

const encoder = new TextEncoder();

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function messageType(type: string | undefined) {
  if (type === "image" || type === "audio" || type === "video" || type === "document" || type === "location") return type;
  return "text";
}

function messageBody(message: MetaMessage) {
  if (message.text?.body) return message.text.body;
  if (message.image?.caption) return message.image.caption;
  if (message.video?.caption) return message.video.caption;
  if (message.document?.caption) return message.document.caption;
  return `[${message.type ?? "message"}]`;
}

async function findIntegration(phoneNumberId: string | undefined) {
  if (!phoneNumberId) return null;
  const { data, error } = await supabase
    .from("whatsapp_integrations")
    .select("id, organization_id, provider")
    .eq("phone_number_id", phoneNumberId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findClient(organizationId: string, phone: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .or(`phone.eq.${phone},whatsapp.eq.${phone}`)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function upsertContact(organizationId: string, phone: string, profileName: string | null) {
  const clientId = await findClient(organizationId, phone);
  const { data, error } = await supabase
    .from("whatsapp_contacts")
    .upsert(
      {
        organization_id: organizationId,
        client_id: clientId,
        phone,
        display_name: profileName,
        profile_name: profileName,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,phone" },
    )
    .select("id, client_id")
    .single();
  if (error) throw error;
  return data;
}

async function upsertConversation(
  organizationId: string,
  integrationId: string,
  contactId: string,
  clientId: string | null,
) {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        organization_id: organizationId,
        integration_id: integrationId,
        contact_id: contactId,
        client_id: clientId,
        status: "aberta",
      },
      { onConflict: "organization_id,contact_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function insertIncomingMessage(
  integration: { id: string; organization_id: string; provider: string },
  value: MetaValue,
  message: MetaMessage,
) {
  const phone = normalizePhone(message.from);
  if (phone.length < 8) throw new Error("Número WhatsApp inválido");
  const profileName = value.contacts?.find((contact) => normalizePhone(contact.wa_id ?? "") === phone)?.profile?.name ?? null;
  const contact = await upsertContact(integration.organization_id, phone, profileName);
  const conversationId = await upsertConversation(
    integration.organization_id,
    integration.id,
    contact.id,
    contact.client_id,
  );
  const type = messageType(message.type);
  const createdAt = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString();
  const { error } = await supabase.from("whatsapp_messages").insert({
    organization_id: integration.organization_id,
    conversation_id: conversationId,
    contact_id: contact.id,
    client_id: contact.client_id,
    integration_id: integration.id,
    direction: "inbound",
    message_type: type,
    body: messageBody(message),
    provider_message_id: message.id,
    delivery_status: "received",
    metadata: { provider: integration.provider, raw_type: message.type, message },
    created_at: createdAt,
  });
  if (error && error.code !== "23505") throw error;
}

async function updateMessageStatus(
  integration: { id: string; organization_id: string },
  status: MetaStatus,
) {
  const normalizedStatus = ["sent", "delivered", "read", "failed"].includes(status.status)
    ? status.status
    : "failed";
  const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
  const patch: Record<string, unknown> = {
    delivery_status: normalizedStatus,
    metadata: { provider: "meta_cloud", status },
  };
  if (normalizedStatus === "sent") patch.sent_at = timestamp;
  if (normalizedStatus === "delivered") patch.delivered_at = timestamp;
  if (normalizedStatus === "read") patch.read_at = timestamp;
  if (normalizedStatus === "failed") {
    patch.failed_at = timestamp;
    patch.error_message = JSON.stringify(status.errors ?? []);
  }
  const { error } = await supabase
    .from("whatsapp_messages")
    .update(patch)
    .eq("organization_id", integration.organization_id)
    .eq("integration_id", integration.id)
    .eq("provider_message_id", status.id);
  if (error) throw error;
}

async function registerEvent(
  integration: { id: string; organization_id: string; provider: string } | null,
  providerEventId: string,
  eventType: string,
  payloadHash: string,
  payload: MetaPayload,
) {
  const { data, error } = await supabase
    .from("whatsapp_webhook_events")
    .insert({
      organization_id: integration?.organization_id ?? null,
      integration_id: integration?.id ?? null,
      provider: integration?.provider ?? "meta_cloud",
      provider_event_id: providerEventId,
      event_type: eventType,
      payload_hash: payloadHash,
      payload,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data.id as string;
}

async function finishEvent(eventId: string, status: "processed" | "ignored" | "failed", errorMessage?: string) {
  await supabase
    .from("whatsapp_webhook_events")
    .update({ status, error_message: errorMessage ?? null, processed_at: new Date().toISOString() })
    .eq("id", eventId);
}

async function processPayload(payload: MetaPayload, payloadHash: string) {
  if (payload.object !== "whatsapp_business_account") return;
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const integration = await findIntegration(value.metadata?.phone_number_id);
      if (integration) {
        await supabase
          .from("whatsapp_integrations")
          .update({ last_webhook_at: new Date().toISOString(), last_error: null })
          .eq("id", integration.id);
      }

      for (const message of value.messages ?? []) {
        const eventId = await registerEvent(integration, message.id, "message.received", payloadHash, payload);
        if (!eventId) continue;
        try {
          if (!integration) throw new Error("Nenhuma integração ativa para o phone_number_id recebido");
          await insertIncomingMessage(integration, value, message);
          await finishEvent(eventId, "processed");
        } catch (error) {
          await finishEvent(eventId, "failed", error instanceof Error ? error.message : String(error));
          throw error;
        }
      }

      for (const status of value.statuses ?? []) {
        const eventId = await registerEvent(
          integration,
          `${status.id}:${status.status}`,
          "message.status",
          payloadHash,
          payload,
        );
        if (!eventId) continue;
        try {
          if (!integration) throw new Error("Nenhuma integração ativa para o phone_number_id recebido");
          await updateMessageStatus(integration, status);
          await finishEvent(eventId, "processed");
        } catch (error) {
          await finishEvent(eventId, "failed", error instanceof Error ? error.message : String(error));
          throw error;
        }
      }
    }
  }
}

Deno.serve(async (request) => {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    if (!APP_SECRET) return new Response("Webhook secret not configured", { status: 500 });

    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256") ?? "";
    const expected = await hmacSha256Hex(APP_SECRET, rawBody);
    const received = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : "";
    if (!safeEqual(received, expected)) return new Response("Invalid signature", { status: 401 });

    const payload = JSON.parse(rawBody) as MetaPayload;
    await processPayload(payload, await sha256Hex(rawBody));
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("whatsapp-webhook", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
