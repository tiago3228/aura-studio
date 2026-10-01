import {
  admin,
  corsHeaders,
  hmacSha256Hex,
  isContractUnavailable,
  jsonResponse,
  loadContractByToken,
  normalizeToken,
  requestClientIp,
  sha256Hex,
} from "../_shared/contracts.ts";

const SIGNATURE_HASH_SECRET = Deno.env.get("CONTRACT_SIGNING_SECRET");
const AUDIT_HASH_SECRET = Deno.env.get("PORTAL_AUDIT_SECRET") ?? SIGNATURE_HASH_SECRET;
const METHODS = new Set(["desenhada", "digitada", "codigo", "externa"]);

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

async function auditHash(value: string) {
  if (AUDIT_HASH_SECRET) return hmacSha256Hex(AUDIT_HASH_SECRET, value);
  return sha256Hex(value);
}

async function isAlreadyAccepted(contractId: string, tokenHash: string) {
  const { data } = await admin
    .from("contract_term_acceptances")
    .select("id, accepted_at")
    .eq("contract_id", contractId)
    .eq("acceptance_token_hash", tokenHash)
    .eq("accepted", true)
    .limit(1)
    .maybeSingle();
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!SIGNATURE_HASH_SECRET) return jsonResponse({ error: "signing_secret_not_configured" }, 500);

  try {
    const payload = await request.json().catch(() => null);
    const token = normalizeToken(payload?.token);
    if (!token) return jsonResponse({ error: "invalid_token" }, 400);
    if (payload?.accepted !== true) return jsonResponse({ error: "acceptance_required" }, 400);

    const signerName = cleanText(payload?.signerName, 160);
    const signerDocument = cleanText(payload?.signerDocument, 40);
    const signerEmail = cleanText(payload?.signerEmail, 254);
    const signerPhone = cleanText(payload?.signerPhone, 30);
    const signatureMethod = cleanText(payload?.signatureMethod, 30);
    const signatureData = typeof payload?.signatureData === "string" ? payload.signatureData : "";

    if (!signerName || signerName.length < 2) return jsonResponse({ error: "invalid_signer_name" }, 400);
    if (!signatureMethod || !METHODS.has(signatureMethod)) return jsonResponse({ error: "invalid_signature_method" }, 400);
    if (signatureData.length > 200_000) return jsonResponse({ error: "signature_data_too_large" }, 413);
    if (signerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
      return jsonResponse({ error: "invalid_signer_email" }, 400);
    }

    const session = await loadContractByToken(token);
    if (!session || isContractUnavailable(session.contract)) {
      return jsonResponse({ error: "contract_unavailable" }, 404);
    }

    if (session.acceptance.revoked_at) return jsonResponse({ error: "acceptance_revoked" }, 409);

    const { data: pendingAcceptances, error: pendingAcceptancesError } = await admin
      .from("contract_term_acceptances")
      .select("id, term_id, term_version, term_content_hash")
      .eq("contract_id", session.contract.id)
      .eq("acceptance_token_hash", session.tokenHash)
      .eq("accepted", false)
      .is("revoked_at", null)
      .order("term_version", { ascending: true });
    if (pendingAcceptancesError) throw pendingAcceptancesError;
    if (!pendingAcceptances?.length) {
      const existing = await isAlreadyAccepted(session.contract.id, session.tokenHash);
      if (existing) {
        return jsonResponse({
          ok: true,
          alreadyAccepted: true,
          acceptedAt: existing.accepted_at,
          contractId: session.contract.id,
        });
      }
      return jsonResponse({ error: "acceptance_conflict" }, 409);
    }

    const acceptedAt = new Date().toISOString();
    const clientIpHash = await auditHash(requestClientIp(request));
    const userAgentHash = await auditHash(request.headers.get("user-agent") ?? "unknown");
    const documentHash = session.contract.document_hash ?? (await sha256Hex(session.contract.content));
    const signaturePayloadHash = signatureData ? await sha256Hex(signatureData) : "no-client-payload";
    const signatureMaterial = [
      "aura-contract-signature-v1",
      session.contract.id,
      pendingAcceptances.map((item) => `${item.term_id}:${item.term_version}:${item.term_content_hash}`).join(","),
      documentHash,
      signerName,
      signerDocument ?? "",
      signerEmail ?? "",
      signatureMethod,
      signaturePayloadHash,
      acceptedAt,
    ].join("|");
    const signatureHash = await hmacSha256Hex(SIGNATURE_HASH_SECRET, signatureMaterial);

    const { data: updatedAcceptances, error: acceptanceError } = await admin
      .from("contract_term_acceptances")
      .update({
        accepted: true,
        accepted_at: acceptedAt,
        signer_name: signerName,
        signer_document: signerDocument,
        signer_email: signerEmail,
        signer_phone: signerPhone,
        ip_hash: clientIpHash,
        user_agent: userAgentHash,
        updated_at: acceptedAt,
      })
      .eq("contract_id", session.contract.id)
      .eq("acceptance_token_hash", session.tokenHash)
      .eq("accepted", false)
      .is("revoked_at", null)
      .select("id");

    if (acceptanceError) throw acceptanceError;
    if (!updatedAcceptances?.length) {
      const retry = await isAlreadyAccepted(session.contract.id, session.tokenHash);
      if (retry) {
        return jsonResponse({ ok: true, alreadyAccepted: true, acceptedAt: retry.accepted_at, contractId: session.contract.id });
      }
      return jsonResponse({ error: "acceptance_conflict" }, 409);
    }

    const { error: verificationError } = await admin.from("signature_verifications").insert(
      updatedAcceptances.map((acceptance) => ({
        organization_id: session.contract.organization_id,
        contract_id: session.contract.id,
        acceptance_id: acceptance.id,
        verification_type: "assinatura",
        method: signatureMethod,
        status: "aprovada",
        document_hash: documentHash,
        signature_hash: signatureHash,
        signer_name: signerName,
        signer_document: signerDocument,
        signer_email: signerEmail,
        ip_hash: clientIpHash,
        user_agent: userAgentHash,
        requested_at: acceptedAt,
        processed_at: acceptedAt,
        verified_at: acceptedAt,
        metadata: {
          source: "contract-acceptance",
          signature_payload_hash: signaturePayloadHash,
        },
      })),
    );
    if (verificationError) throw verificationError;

    const { count: pendingCount, error: pendingError } = await admin
      .from("contract_term_acceptances")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", session.contract.id)
      .eq("accepted", false)
      .is("revoked_at", null);
    if (pendingError) throw pendingError;

    const contractComplete = (pendingCount ?? 0) === 0;
    if (contractComplete) {
      const { error: contractError } = await admin
        .from("client_contracts")
        .update({
          status: "assinado",
          signed_at: acceptedAt,
          signed_by_name: signerName,
          signed_by_document: signerDocument,
          signature_method: signatureMethod,
          signature_hash: signatureHash,
          document_hash: documentHash,
          updated_at: acceptedAt,
        })
        .eq("id", session.contract.id)
        .in("status", ["enviado", "visualizado"]);
      if (contractError) throw contractError;
    }

    return jsonResponse({
      ok: true,
      alreadyAccepted: false,
      contractId: session.contract.id,
      acceptanceId: session.acceptance.id,
      acceptedAt,
      contractCompleted: contractComplete,
      signatureHash,
    });
  } catch (error) {
    console.error("contract-acceptance", error);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
