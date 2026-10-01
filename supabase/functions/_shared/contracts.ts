import { createClient } from "npm:@supabase/supabase-js@2";

export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const encoder = new TextEncoder();

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("PUBLIC_APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

export function normalizeToken(value: unknown) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (token.length < 32 || token.length > 512) return null;
  return token;
}

export async function loadContractByToken(token: string) {
  const tokenHash = await sha256Hex(token);
  const { data: acceptance, error: acceptanceError } = await admin
    .from("contract_term_acceptances")
    .select(
      "id, organization_id, contract_id, term_id, term_version, term_content_hash, accepted, accepted_at, revoked_at, signer_name, signer_document, signer_email, signer_phone",
    )
    .eq("acceptance_token_hash", tokenHash)
    .limit(1)
    .maybeSingle();
  if (acceptanceError) throw acceptanceError;
  if (!acceptance) return null;

  const { data: contract, error: contractError } = await admin
    .from("client_contracts")
    .select(
      "id, organization_id, client_id, title, content, template_version, status, sent_at, viewed_at, signed_at, expires_at, signed_by_name, signed_by_document, signature_method, signature_hash, document_hash, document_url",
    )
    .eq("id", acceptance.contract_id)
    .eq("organization_id", acceptance.organization_id)
    .maybeSingle();
  if (contractError) throw contractError;
  if (!contract) return null;

  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id, name, email, phone, whatsapp")
    .eq("id", contract.client_id)
    .eq("organization_id", contract.organization_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (clientError) throw clientError;
  if (!client) return null;

  return { tokenHash, acceptance, contract, client };
}

export function isContractUnavailable(contract: { status: string; expires_at: string | null }) {
  if (["cancelado", "expirado"].includes(contract.status)) return true;
  return !!contract.expires_at && new Date(contract.expires_at).getTime() <= Date.now();
}

export function requestClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
