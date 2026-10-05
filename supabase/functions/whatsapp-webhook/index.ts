import { admin, constantTimeHexEqual, hmacSha256Hex, sha256Hex } from "../_shared/whatsapp.ts";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

type WebhookMessage = {
  id?: unknown;
  from?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
  image?: unknown;
  audio?: unknown;
  video?: unknown;
  document?: unknown;
  location?: unknown;
};
type WebhookStatus = {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  errors?: Array<{ code?: unknown }>;
};
type WebhookValue = {
  metadata?: { phone_number_id?: unknown; display_phone_number?: unknown };
  contacts?: Array<{ wa_id?: unknown; profile?: { name?: unknown } }>;
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
};
type MetaWebhookPayload = {
  entry?: Array<{ id?: unknown; changes?: Array<{ field?: unknown; value?: WebhookValue }> }>;
};
type WebhookEventClaim = { id: string; claimedAt: string };

function constantTimeTextEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function plainResponse(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function registerWebhookEvent(
  eventId: string,
  eventType: string,
  payloadHash: string,
  organizationId: string,
  integrationId: string,
) {
  const claimedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("whatsapp_webhook_events")
    .insert({
      organization_id: organizationId,
      integration_id: integrationId,
      provider: "meta_cloud",
      provider_event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      payload: {},
      status: "received",
      received_at: claimedAt,
    })
    .select("id")
    .single();
  if (!error && data?.id) return { id: data.id as string, claimedAt };
  if (error?.code !== "23505") throw new Error("WEBHOOK_EVENT_INSERT_FAILED");

  const { data: existing, error: lookupError } = await admin
    .from("whatsapp_webhook_events")
    .select("id, status, received_at")
    .eq("provider", "meta_cloud")
    .eq("provider_event_id", eventId)
    .maybeSingle();
  if (lookupError || !existing?.id) throw new Error("WEBHOOK_EVENT_LOOKUP_FAILED");
  if (["processed", "ignored"].includes(existing.status)) return null;

  const staleBefore = new Date(Date.now() - 120_000).toISOString();
  const canReclaim =
    existing.status === "failed" ||
    (existing.status === "received" && existing.received_at < staleBefore);
  if (!canReclaim) throw new Error("WEBHOOK_EVENT_BUSY");

  const retryClaimedAt = new Date().toISOString();
  const reclaimQuery = admin
    .from("whatsapp_webhook_events")
    .update({
      status: "received",
      error_message: null,
      payload_hash: payloadHash,
      received_at: retryClaimedAt,
      processed_at: null,
    })
    .eq("id", existing.id)
    .eq("status", existing.status);
  const conditionalReclaimQuery =
    existing.status === "received" ? reclaimQuery.lt("received_at", staleBefore) : reclaimQuery;
  const { data: reclaimed, error: reclaimError } = await conditionalReclaimQuery
    .select("id")
    .maybeSingle();
  if (reclaimError) throw new Error("WEBHOOK_EVENT_RECLAIM_FAILED");
  if (!reclaimed?.id) throw new Error("WEBHOOK_EVENT_BUSY");
  return { id: reclaimed.id as string, claimedAt: retryClaimedAt };
}

async function finishWebhookEvent(
  claim: WebhookEventClaim,
  status: "processed" | "ignored" | "failed",
) {
  const { data, error } = await admin
    .from("whatsapp_webhook_events")
    .update({
      status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      error_message: status === "failed" ? "PROCESSING_FAILED" : null,
    })
    .eq("id", claim.id)
    .eq("received_at", claim.claimedAt)
    .eq("status", "received")
    .select("id")
    .maybeSingle();
  if (error) throw new Error("WEBHOOK_EVENT_FINALIZE_FAILED");
  if (!data?.id) throw new Error("WEBHOOK_EVENT_CLAIM_LOST");
}

function messageKind(message: WebhookMessage) {
  const type = typeof message.type === "string" ? message.type : "text";
  return ["text", "image", "audio", "video", "document", "location"].includes(type) ? type : "text";
}

function messageBody(message: WebhookMessage) {
  const body = message.text?.body;
  if (typeof body === "string") return body.slice(0, 4096);
  const type = typeof message.type === "string" ? message.type : "message";
  return `[${type.slice(0, 32)}]`;
}

async function processIncomingMessage(
  organizationId: string,
  integrationId: string,
  profileName: string | null,
  message: WebhookMessage,
  payloadHash: string,
) {
  if (
    typeof message.id !== "string" ||
    typeof message.from !== "string" ||
    !/^\d{5,32}$/.test(message.from)
  )
    return;
  const providerEventId = `message:${message.id}`.slice(0, 512);
  const eventClaim = await registerWebhookEvent(
    providerEventId,
    "message_received",
    payloadHash,
    organizationId,
    integrationId,
  );
  if (!eventClaim) return;

  try {
    const { data: existingMessage, error: existingMessageError } = await admin
      .from("whatsapp_messages")
      .select("id, organization_id")
      .eq("provider_message_id", message.id)
      .maybeSingle();
    if (existingMessageError) throw new Error("MESSAGE_LOOKUP_FAILED");
    if (existingMessage) {
      if (existingMessage.organization_id !== organizationId) {
        throw new Error("MESSAGE_TENANT_MISMATCH");
      }
      await finishWebhookEvent(eventClaim, "processed");
      return;
    }

    const phone = `+${message.from}`;
    const { data: contact, error: contactError } = await admin
      .from("whatsapp_contacts")
      .upsert(
        {
          organization_id: organizationId,
          phone,
          ...(profileName ? { profile_name: profileName.slice(0, 160) } : {}),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,phone" },
      )
      .select("id, client_id")
      .single();
    if (contactError || !contact?.id) throw new Error("CONTACT_SAVE_FAILED");

    const createdAt =
      typeof message.timestamp === "string" && /^\d{10,13}$/.test(message.timestamp)
        ? new Date(
            Number(message.timestamp.length === 13 ? message.timestamp : `${message.timestamp}000`),
          ).toISOString()
        : new Date().toISOString();
    const body = messageBody(message);
    const { data: conversation, error: conversationLookupError } = await admin
      .from("whatsapp_conversations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("contact_id", contact.id)
      .maybeSingle();
    if (conversationLookupError) throw new Error("CONVERSATION_LOOKUP_FAILED");

    let conversationId: string;
    if (conversation?.id) {
      conversationId = conversation.id;
      const { error } = await admin
        .from("whatsapp_conversations")
        .update({
          integration_id: integrationId,
          client_id: contact.client_id,
          status: "aberta",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("organization_id", organizationId);
      if (error) throw new Error("CONVERSATION_UPDATE_FAILED");
    } else {
      const { data, error } = await admin
        .from("whatsapp_conversations")
        .insert({
          organization_id: organizationId,
          integration_id: integrationId,
          contact_id: contact.id,
          client_id: contact.client_id,
          status: "aberta",
        })
        .select("id")
        .single();
      if (error || !data?.id) throw new Error("CONVERSATION_CREATE_FAILED");
      conversationId = data.id;
    }

    const { error: messageError } = await admin.from("whatsapp_messages").insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      contact_id: contact.id,
      client_id: contact.client_id,
      integration_id: integrationId,
      direction: "inbound",
      message_type: messageKind(message),
      body,
      provider_message_id: message.id,
      delivery_status: "received",
      metadata: { source: "meta_webhook" },
      created_at: createdAt,
    });
    if (messageError) throw new Error("MESSAGE_SAVE_FAILED");
    await finishWebhookEvent(eventClaim, "processed");
  } catch {
    await finishWebhookEvent(eventClaim, "failed");
    throw new Error("INCOMING_MESSAGE_PROCESSING_FAILED");
  }
}

async function processStatus(
  organizationId: string,
  integrationId: string,
  status: WebhookStatus,
  payloadHash: string,
) {
  if (typeof status.id !== "string" || typeof status.status !== "string") return;
  const normalized = status.status.toLowerCase();
  if (!["sent", "delivered", "read", "failed"].includes(normalized)) return;
  const timestamp =
    typeof status.timestamp === "string" ? status.timestamp.slice(0, 20) : "unknown";
  const providerEventId = `status:${status.id}:${normalized}:${timestamp}`.slice(0, 512);
  const eventClaim = await registerWebhookEvent(
    providerEventId,
    `message_${normalized}`,
    payloadHash,
    organizationId,
    integrationId,
  );
  if (!eventClaim) return;

  const timestampDate =
    typeof status.timestamp === "string" && /^\d{10,13}$/.test(status.timestamp)
      ? new Date(
          Number(status.timestamp.length === 13 ? status.timestamp : `${status.timestamp}000`),
        ).toISOString()
      : new Date().toISOString();
  const errorCode =
    normalized === "failed" && typeof status.errors?.[0]?.code === "number"
      ? String(status.errors[0].code).slice(0, 32)
      : null;
  const update: Record<string, unknown> = {
    delivery_status: normalized,
    ...(normalized === "sent" ? { sent_at: timestampDate } : {}),
    ...(normalized === "delivered" ? { delivered_at: timestampDate } : {}),
    ...(normalized === "read" ? { read_at: timestampDate } : {}),
    ...(normalized === "failed"
      ? { failed_at: timestampDate, error_code: errorCode, error_message: null }
      : {}),
  };
  const { error } = await admin
    .from("whatsapp_messages")
    .update(update)
    .eq("organization_id", organizationId)
    .eq("provider_message_id", status.id);
  if (error) {
    await finishWebhookEvent(eventClaim, "failed");
    throw new Error("MESSAGE_STATUS_UPDATE_FAILED");
  }
  await finishWebhookEvent(eventClaim, "processed");
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode") ?? "";
    const suppliedToken = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (
      !verifyToken ||
      mode !== "subscribe" ||
      !challenge ||
      !constantTimeTextEqual(suppliedToken, verifyToken)
    ) {
      return plainResponse("Forbidden", 403);
    }
    return plainResponse(challenge);
  }
  if (request.method !== "POST") return jsonResponse({ ok: false }, 405);

  const appSecret = Deno.env.get("META_APP_SECRET");
  const signatureHeader = request.headers.get("x-hub-signature-256") ?? "";
  if (!appSecret || !signatureHeader.startsWith("sha256=")) return jsonResponse({ ok: false }, 401);
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.length > 1_000_000) return jsonResponse({ ok: false }, 413);
  const expected = await hmacSha256Hex(appSecret, raw);
  if (!constantTimeHexEqual(signatureHeader.slice(7), expected))
    return jsonResponse({ ok: false }, 401);

  let payload: MetaWebhookPayload;
  let rawText = "";
  try {
    rawText = new TextDecoder().decode(raw);
    payload = JSON.parse(rawText) as MetaWebhookPayload;
  } catch {
    return jsonResponse({ ok: false }, 400);
  }
  if (!Array.isArray(payload.entry)) return jsonResponse({ ok: false }, 400);
  const payloadHash = await sha256Hex(rawText);

  try {
    for (const entry of payload.entry) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages" || !change.value) continue;
        const phoneNumberId = change.value.metadata?.phone_number_id;
        if (typeof phoneNumberId !== "string" || !/^\d{5,32}$/.test(phoneNumberId)) continue;
        const { data: integration, error } = await admin
          .from("whatsapp_integrations")
          .select("id, organization_id")
          .eq("phone_number_id", phoneNumberId)
          .eq("provider", "meta_cloud")
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        if (error) throw new Error("INTEGRATION_LOOKUP_FAILED");
        if (!integration) continue;

        for (const message of change.value.messages ?? []) {
          const profile = change.value.contacts?.find((contact) => contact.wa_id === message.from)
            ?.profile?.name;
          await processIncomingMessage(
            integration.organization_id,
            integration.id,
            typeof profile === "string" ? profile : null,
            message,
            payloadHash,
          );
        }
        for (const status of change.value.statuses ?? []) {
          await processStatus(integration.organization_id, integration.id, status, payloadHash);
        }
        const { error: integrationAuditError } = await admin
          .from("whatsapp_integrations")
          .update({
            last_webhook_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", integration.id)
          .eq("organization_id", integration.organization_id);
        if (integrationAuditError) throw new Error("INTEGRATION_AUDIT_UPDATE_FAILED");
      }
    }
  } catch {
    // Intentionally omit request/body identifiers and provider response from logs.
    return jsonResponse({ ok: false, error: "PROCESSING_FAILED" }, 500);
  }
  return jsonResponse({ ok: true });
});
