import {
  admin,
  authenticateUser,
  ensureMetaWebhookUnsubscribed,
  isUuid,
  jsonResponse,
  originAllowed,
  userCanManageOrganization,
} from "../_shared/whatsapp.ts";

function preflight() {
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight();
  if (request.method !== "POST")
    return jsonResponse(request, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  if (!originAllowed(request))
    return jsonResponse(request, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403);

  const user = await authenticateUser(request);
  if (!user) return jsonResponse(request, { ok: false, error: "UNAUTHENTICATED" }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2_000)
      return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 413);
    body = JSON.parse(raw);
  } catch {
    return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 400);
  }

  const organizationId = body.organization_id;
  const integrationId = body.integration_id;
  if (!isUuid(organizationId) || !isUuid(integrationId))
    return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 400);
  if (!(await userCanManageOrganization(user.id, organizationId)))
    return jsonResponse(request, { ok: false, error: "FORBIDDEN" }, 403);

  const { data: integration, error: integrationError } = await admin
    .from("whatsapp_integrations")
    .select("id, business_account_id, active")
    .eq("id", integrationId)
    .eq("organization_id", organizationId)
    .eq("provider", "meta_cloud")
    .maybeSingle();
  if (integrationError)
    return jsonResponse(request, { ok: false, error: "CONNECTION_LOOKUP_FAILED" }, 500);
  if (!integration)
    return jsonResponse(request, { ok: false, error: "INTEGRATION_NOT_FOUND" }, 404);

  const { data: tokenResult, error: tokenError } = await admin.rpc(
    "whatsapp_get_access_token_secret",
    { _integration_id: integrationId },
  );
  let accessToken = !tokenError && typeof tokenResult === "string" ? tokenResult : "";
  if (!accessToken && integration.active)
    return jsonResponse(request, { ok: false, error: "SECURE_STORAGE_UNAVAILABLE" }, 503);

  if (accessToken) {
    if (typeof integration.business_account_id !== "string")
      return jsonResponse(request, { ok: false, error: "META_ASSET_MISSING" }, 409);
    try {
      await ensureMetaWebhookUnsubscribed(integration.business_account_id, accessToken);
    } catch {
      // Preserve the encrypted token and local connection record if Meta's state is uncertain.
      accessToken = "";
      return jsonResponse(request, { ok: false, error: "META_UNSUBSCRIBE_FAILED" }, 502);
    }
    accessToken = "";
  }

  const { error: cleanupError } = await admin.rpc("whatsapp_disconnect_integration", {
    _organization_id: organizationId,
    _integration_id: integrationId,
  });
  if (cleanupError)
    return jsonResponse(request, { ok: false, error: "SECURE_CLEANUP_FAILED" }, 503);

  // This disconnect intentionally does not deregister the number in Meta. That
  // separate provider action can interrupt Cloud API service for the clinic.
  return jsonResponse(request, { ok: true, disconnected: true, number_deregistered: false });
});
