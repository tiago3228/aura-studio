import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const allowedOrigin = Deno.env.get("PUBLIC_APP_ORIGIN") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("WhatsApp backend configuration unavailable");
}

export const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const metaGraphVersion = (() => {
  const configured = Deno.env.get("META_GRAPH_API_VERSION") ?? "v26.0";
  return /^v\d+\.\d+$/.test(configured) ? configured : "v26.0";
})();

export function responseHeaders(_request: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });
}

export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || (!!allowedOrigin && origin === allowedOrigin);
}

export async function authenticateUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || !supabaseAnonKey) return null;
  const userClient = createClient(supabaseUrl!, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function userCanManageOrganization(userId: string, organizationId: string) {
  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("role, active")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();
  if (membershipError || !membership || !["owner", "manager"].includes(membership.role))
    return false;

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, access_blocked")
    .eq("id", organizationId)
    .maybeSingle();
  return !organizationError && !!organization && organization.access_blocked !== true;
}

export async function userCanViewOrganization(userId: string, organizationId: string) {
  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("role, permissions")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();
  if (membershipError || !membership) return false;

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, access_blocked")
    .eq("id", organizationId)
    .maybeSingle();
  if (organizationError || !organization || organization.access_blocked === true) return false;

  if (["owner", "manager"].includes(membership.role)) return true;
  const memberPermissions = membership.permissions;
  if (
    !memberPermissions ||
    typeof memberPermissions !== "object" ||
    Array.isArray(memberPermissions) ||
    (memberPermissions as Record<string, unknown>)["whatsapp.ver"] !== true
  ) {
    return false;
  }

  const { data: rolePermission, error: permissionError } = await admin
    .from("organization_permissions")
    .select("allowed")
    .eq("organization_id", organizationId)
    .eq("role", membership.role)
    .eq("permission", "whatsapp.ver")
    .maybeSingle();
  return !permissionError && rolePermission?.allowed !== false;
}

export function isMetaId(value: unknown): value is string {
  return typeof value === "string" && /^\d{5,32}$/.test(value);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function metaRequest<T>(
  path: string,
  accessToken: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion}${path}`);
  for (const [key, value] of Object.entries(options.params ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || typeof result !== "object") {
    const errorCode =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof (result as { error?: { code?: unknown } }).error?.code === "number"
        ? String((result as { error: { code: number } }).error.code)
        : "META_API_ERROR";
    throw new Error(`META_API_${errorCode}`);
  }
  return result as T;
}

export async function ensureMetaWebhookUnsubscribed(wabaId: string, accessToken: string) {
  const appId = Deno.env.get("META_APP_ID");
  if (!appId || !isMetaId(appId)) throw new Error("META_APP_NOT_CONFIGURED");
  const subscriptions = await metaRequest<{
    data?: Array<{ whatsapp_business_api_data?: { id?: unknown } }>;
  }>(`/${wabaId}/subscribed_apps`, accessToken);
  if (!Array.isArray(subscriptions.data)) throw new Error("META_SUBSCRIPTIONS_LOOKUP_FAILED");
  const appIsSubscribed = subscriptions.data?.some(
    (subscription) => subscription.whatsapp_business_api_data?.id === appId,
  );
  if (!appIsSubscribed) return;

  const result = await metaRequest<{ success?: unknown }>(`/${wabaId}/subscribed_apps`, accessToken, {
    method: "DELETE",
  });
  if (result.success !== true) throw new Error("META_UNSUBSCRIBE_FAILED");
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(secret: string, value: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = new Uint8Array(value);
  const signature = await crypto.subtle.sign("HMAC", key, payload.buffer);
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeHexEqual(left: string, right: string) {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  let difference = 0;
  for (let index = 0; index < 64; index += 1)
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}
