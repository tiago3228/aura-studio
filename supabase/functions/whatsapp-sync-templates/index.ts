import {
  admin,
  authenticateUser,
  isUuid,
  jsonResponse,
  metaRequest,
  originAllowed,
  userCanManageOrganization,
  userCanViewOrganization,
} from "../_shared/whatsapp.ts";

const templateFields = "id,name,language,category,status,components,quality_score";

type MetaTemplate = {
  id?: unknown;
  name?: unknown;
  language?: unknown;
  category?: unknown;
  status?: unknown;
  components?: unknown;
  quality_score?: unknown;
};
type MetaTemplatePage = {
  data?: MetaTemplate[];
  paging?: { cursors?: { after?: string } };
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
    if (raw.length > 2_000)
      return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 413);
    body = JSON.parse(raw);
  } catch {
    return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 400);
  }
  const organizationId = body.organization_id;
  if (!isUuid(organizationId))
    return jsonResponse(request, { ok: false, error: "INVALID_REQUEST" }, 400);
  const refresh = body.refresh === true;
  const authorized = refresh
    ? await userCanManageOrganization(user.id, organizationId)
    : await userCanViewOrganization(user.id, organizationId);
  if (!authorized) {
    return jsonResponse(request, { ok: false, error: "FORBIDDEN" }, 403);
  }

  const { data: integration, error: integrationError } = await admin
    .from("whatsapp_integrations")
    .select("id, business_account_id, active, verified")
    .eq("organization_id", organizationId)
    .eq("provider", "meta_cloud")
    .eq("active", true)
    .eq("verified", true)
    .limit(1)
    .maybeSingle();
  if (integrationError)
    return jsonResponse(request, { ok: false, error: "CONNECTION_LOOKUP_FAILED" }, 500);
  if (!integration?.id || typeof integration.business_account_id !== "string") {
    return jsonResponse(request, { ok: false, error: "WHATSAPP_NOT_CONNECTED" }, 409);
  }

  if (!refresh) {
    const { data: savedTemplates, error: savedTemplatesError } = await admin
      .from("whatsapp_message_templates")
      .select("meta_template_id, name, language, category, status, quality_score")
      .eq("organization_id", organizationId)
      .eq("integration_id", integration.id)
      .order("name", { ascending: true });
    if (savedTemplatesError)
      return jsonResponse(request, { ok: false, error: "TEMPLATE_LOOKUP_FAILED" }, 500);
    return jsonResponse(request, {
      ok: true,
      templates: (savedTemplates ?? []).map((template) => ({
        id: template.meta_template_id,
        name: template.name,
        language: template.language,
        category: template.category,
        status: template.status,
        quality_score: template.quality_score,
      })),
    });
  }

  const { data: tokenResult, error: credentialError } = await admin.rpc(
    "whatsapp_get_access_token_secret",
    { _integration_id: integration.id },
  );
  if (credentialError || typeof tokenResult !== "string") {
    return jsonResponse(request, { ok: false, error: "SECURE_STORAGE_UNAVAILABLE" }, 503);
  }
  let accessToken = tokenResult;

  try {
    const templates: Array<{
      id: string;
      name: string;
      language: string;
      category: string;
      status: string;
      components: unknown;
      quality_score: string | null;
    }> = [];
    let after: string | undefined;
    let paginationTruncated = false;
    for (let page = 0; page < 50; page += 1) {
      const params: Record<string, string> = { fields: templateFields, limit: "100" };
      if (after) params.after = after;
      const result = await metaRequest<MetaTemplatePage>(
        `/${integration.business_account_id}/message_templates`,
        accessToken,
        { params },
      );
      for (const item of result.data ?? []) {
        if (
          typeof item.id !== "string" ||
          typeof item.name !== "string" ||
          typeof item.language !== "string" ||
          typeof item.category !== "string" ||
          typeof item.status !== "string"
        )
          continue;
        const quality =
          item.quality_score && typeof item.quality_score === "object"
            ? (item.quality_score as { score?: unknown }).score
            : null;
        templates.push({
          id: item.id,
          name: item.name.slice(0, 512),
          language: item.language.slice(0, 64),
          category: item.category.slice(0, 64),
          status: item.status.slice(0, 64),
          components: Array.isArray(item.components) ? item.components : [],
          quality_score: typeof quality === "string" ? quality.slice(0, 32) : null,
        });
      }
      after = result.paging?.cursors?.after;
      if (!after || !result.data?.length) break;
      if (page === 49) paginationTruncated = true;
    }
    if (paginationTruncated) {
      accessToken = "";
      return jsonResponse(request, { ok: false, error: "TEMPLATE_SYNC_LIMIT_REACHED" }, 413);
    }

    const syncedAt = new Date().toISOString();
    if (templates.length) {
      const rows = templates.map((template) => ({
        organization_id: organizationId,
        integration_id: integration.id,
        meta_template_id: template.id,
        name: template.name,
        language: template.language,
        category: template.category,
        status: template.status,
        components: template.components,
        quality_score: template.quality_score,
        last_synced_at: syncedAt,
        updated_at: syncedAt,
      }));
      const { error: saveError } = await admin
        .from("whatsapp_message_templates")
        .upsert(rows, { onConflict: "integration_id,meta_template_id" });
      if (saveError) {
        accessToken = "";
        return jsonResponse(request, { ok: false, error: "TEMPLATE_SYNC_FAILED" }, 500);
      }
    }

    const { error: pruneError } = await admin
      .from("whatsapp_message_templates")
      .delete()
      .eq("organization_id", organizationId)
      .eq("integration_id", integration.id)
      .lt("last_synced_at", syncedAt);
    if (pruneError) {
      accessToken = "";
      return jsonResponse(request, { ok: false, error: "TEMPLATE_SYNC_FAILED" }, 500);
    }

    accessToken = "";
    return jsonResponse(request, {
      ok: true,
      templates: templates.map(({ id, name, language, category, status, quality_score }) => ({
        id,
        name,
        language,
        category,
        status,
        quality_score,
      })),
    });
  } catch {
    accessToken = "";
    return jsonResponse(request, { ok: false, error: "META_TEMPLATE_LOOKUP_FAILED" }, 502);
  }
});
