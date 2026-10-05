import {
  admin,
  authenticateUser,
  ensureMetaWebhookUnsubscribed,
  isMetaId,
  isUuid,
  jsonResponse,
  metaGraphVersion,
  metaRequest,
  originAllowed,
  userCanManageOrganization,
} from "../_shared/whatsapp.ts";

type TokenExchange = { access_token?: unknown; token_type?: unknown; expires_in?: unknown };
type PhoneNumbersResponse = {
  data?: Array<{ id?: string; display_phone_number?: string; verified_name?: string }>;
};

function preflight(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": Deno.env.get("PUBLIC_APP_ORIGIN") ?? "null",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

async function exchangeSignupCode(appId: string, appSecret: string, code: string) {
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);
  const response = await fetch(url, { method: "GET" });
  const result = (await response.json().catch(() => null)) as TokenExchange | null;
  if (!response.ok || typeof result?.access_token !== "string" || result.access_token.length < 16) {
    throw new Error("META_CODE_EXCHANGE_FAILED");
  }
  return result.access_token;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST")
    return jsonResponse(request, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  if (!originAllowed(request))
    return jsonResponse(request, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403);

  const user = await authenticateUser(request);
  if (!user) return jsonResponse(request, { ok: false, error: "UNAUTHENTICATED" }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12_000)
      return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 413);
    body = JSON.parse(raw);
  } catch {
    return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 400);
  }

  const organizationId = body.organization_id;
  const code = body.code;
  const wabaId = body.waba_id;
  const phoneNumberId = body.phone_number_id;
  const businessId = body.business_id;
  const finishEvent = body.finish_event;
  if (
    !isUuid(organizationId) ||
    typeof code !== "string" ||
    code.length < 16 ||
    code.length > 4096 ||
    !isMetaId(wabaId) ||
    !isMetaId(phoneNumberId) ||
    typeof body.phone_pin !== "string" ||
    !/^\d{6}$/.test(body.phone_pin) ||
    (businessId !== null && businessId !== undefined && !isMetaId(businessId))
  ) {
    return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 400);
  }
  if (finishEvent !== "FINISH") {
    // Coexistence onboarding needs the SMB app-data sync flow within Meta's 24-hour window.
    // Do not exchange a code or partially connect a WhatsApp Business App number here.
    return jsonResponse(request, { ok: false, error: "UNSUPPORTED_ONBOARDING_FLOW" }, 409);
  }
  if (!(await userCanManageOrganization(user.id, organizationId))) {
    return jsonResponse(request, { ok: false, error: "FORBIDDEN" }, 403);
  }

  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  if (!appId || !appSecret)
    return jsonResponse(request, { ok: false, error: "META_NOT_CONFIGURED" }, 503);

  const { data: alreadyActive, error: activeError } = await admin
    .from("whatsapp_integrations")
    .select("id, phone_number_id")
    .eq("organization_id", organizationId)
    .eq("provider", "meta_cloud")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (activeError)
    return jsonResponse(request, { ok: false, error: "CONNECTION_LOOKUP_FAILED" }, 500);
  if (alreadyActive)
    return jsonResponse(request, { ok: false, error: "NUMBER_ALREADY_CONNECTED" }, 409);

  let phonePin = body.phone_pin as string;
  body.phone_pin = "";
  let accessToken = "";
  let phoneInfo: { id: string; display_phone_number: string | null; verified_name: string | null };
  try {
    // The authorization code is short-lived; exchange immediately and only server-to-server.
    accessToken = await exchangeSignupCode(appId, appSecret, code);
    const phoneNumbers = await metaRequest<PhoneNumbersResponse>(
      `/${wabaId}/phone_numbers`,
      accessToken,
      {
        params: { fields: "id,display_phone_number,verified_name", limit: "100" },
      },
    );
    const match = phoneNumbers.data?.find((item) => item.id === phoneNumberId);
    if (!match?.id) throw new Error("META_ASSET_MISMATCH");
    phoneInfo = {
      id: match.id,
      display_phone_number:
        typeof match.display_phone_number === "string" ? match.display_phone_number : null,
      verified_name: typeof match.verified_name === "string" ? match.verified_name : null,
    };
  } catch {
    accessToken = "";
    phonePin = "";
    return jsonResponse(request, { ok: false, error: "META_ASSET_VERIFICATION_FAILED" }, 502);
  }

  const { data: existing, error: existingError } = await admin
    .from("whatsapp_integrations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", "meta_cloud")
    .eq("phone_number_id", phoneNumberId)
    .limit(1)
    .maybeSingle();
  if (existingError) {
    accessToken = "";
    phonePin = "";
    return jsonResponse(request, { ok: false, error: "CONNECTION_LOOKUP_FAILED" }, 500);
  }

  let integrationId: string;
  const displayName = phoneInfo.verified_name?.slice(0, 160) || "WhatsApp da clínica";
  if (existing?.id) {
    integrationId = existing.id;
    const { error } = await admin
      .from("whatsapp_integrations")
      .update({
        display_name: displayName,
        phone_number: phoneInfo.display_phone_number,
        business_account_id: wabaId,
        provider_account_id: isMetaId(businessId) ? businessId : null,
        active: false,
        verified: false,
        onboarding_state: "pending_setup",
        last_error: null,
        last_error_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId)
      .eq("organization_id", organizationId);
    if (error) {
      accessToken = "";
      phonePin = "";
      return jsonResponse(request, { ok: false, error: "CONNECTION_SAVE_FAILED" }, 500);
    }
  } else {
    const { data, error } = await admin
      .from("whatsapp_integrations")
      .insert({
        organization_id: organizationId,
        provider: "meta_cloud",
        display_name: displayName,
        phone_number: phoneInfo.display_phone_number,
        phone_number_id: phoneNumberId,
        business_account_id: wabaId,
        provider_account_id: isMetaId(businessId) ? businessId : null,
        active: false,
        verified: false,
        onboarding_state: "pending_setup",
        created_by: user.id,
        metadata: { onboarding_flow: "embedded_signup_v4" },
      })
      .select("id")
      .single();
    if (error || !data?.id) {
      accessToken = "";
      phonePin = "";
      return jsonResponse(request, { ok: false, error: "CONNECTION_SAVE_FAILED" }, 500);
    }
    integrationId = data.id;
  }

  const { error: vaultError } = await admin.rpc("whatsapp_store_integration_secrets", {
    _organization_id: organizationId,
    _integration_id: integrationId,
    _access_token: accessToken,
  });
  if (vaultError) {
    accessToken = "";
    phonePin = "";
    await admin
      .from("whatsapp_integrations")
      .update({
        active: false,
        verified: false,
        onboarding_state: "failed",
        last_error: "VAULT_STORAGE_FAILED",
        last_error_at: new Date().toISOString(),
      })
      .eq("id", integrationId)
      .eq("organization_id", organizationId);
    return jsonResponse(request, { ok: false, error: "SECURE_STORAGE_UNAVAILABLE" }, 503);
  }

  try {
    const subscription = await metaRequest<{ success?: unknown }>(
      `/${wabaId}/subscribed_apps`,
      accessToken,
      { method: "POST" },
    );
    if (subscription.success !== true) throw new Error("META_SUBSCRIBE_FAILED");
    const registration = await metaRequest<{ success?: unknown }>(`/${phoneNumberId}/register`, accessToken, {
      method: "POST",
      body: { messaging_product: "whatsapp", pin: phonePin },
    });
    if (registration.success !== true) throw new Error("META_REGISTER_FAILED");
  } catch (error) {
    phonePin = "";
    // Never persist the PIN. Do not discard the token unless remote unsubscribe
    // succeeds; otherwise retain it in Vault so an administrator can retry cleanup.
    const safeCode =
      error instanceof Error && /^META_API_[A-Z0-9_]+$/.test(error.message)
        ? error.message.slice(0, 48)
        : "META_SETUP_FAILED";
    await admin
      .from("whatsapp_integrations")
      .update({
        active: false,
        verified: false,
        onboarding_state: "failed",
        last_error: safeCode,
        last_error_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId)
      .eq("organization_id", organizationId);
    let remoteUnsubscribed = false;
    try {
      await ensureMetaWebhookUnsubscribed(wabaId, accessToken);
      remoteUnsubscribed = true;
    } catch {
      // Keep the token encrypted in Vault if Meta's remote state is uncertain.
    }
    if (remoteUnsubscribed) {
      const { error: cleanupError } = await admin.rpc("whatsapp_disconnect_integration", {
        _organization_id: organizationId,
        _integration_id: integrationId,
      });
      if (!cleanupError) accessToken = "";
    }
    accessToken = "";
    return jsonResponse(request, { ok: false, error: "META_SETUP_FAILED" }, 502);
  }
  accessToken = "";
  phonePin = "";

  const { error: activateError } = await admin
    .from("whatsapp_integrations")
    .update({
      active: true,
      verified: true,
      onboarding_state: "connected",
      last_error: null,
      last_error_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId)
    .eq("organization_id", organizationId);
  if (activateError)
    return jsonResponse(request, { ok: false, error: "CONNECTION_FINALIZE_FAILED" }, 503);

  // No code, access token, PIN, or raw Graph API response is returned to the browser.
  return jsonResponse(request, { ok: true, connected: true });
});
