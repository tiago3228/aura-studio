import {
  admin,
  corsHeaders,
  isContractUnavailable,
  jsonResponse,
  loadContractByToken,
  normalizeToken,
} from "../_shared/contracts.ts";

async function getTerms(contractId: string) {
  const { data: acceptances, error: acceptanceError } = await admin
    .from("contract_term_acceptances")
    .select("id, term_id, term_version, term_content_hash, accepted, accepted_at, revoked_at")
    .eq("contract_id", contractId)
    .order("term_version", { ascending: true });
  if (acceptanceError) throw acceptanceError;

  const termIds = [...new Set((acceptances ?? []).map((item) => item.term_id))];
  if (termIds.length === 0) return [];

  const { data: terms, error: termsError } = await admin
    .from("acceptance_terms")
    .select("id, slug, title, summary, content, version, content_hash, published_at")
    .in("id", termIds)
    .eq("active", true);
  if (termsError) throw termsError;

  const termsById = new Map((terms ?? []).map((term) => [term.id, term]));
  return (acceptances ?? [])
    .map((acceptance) => ({
      acceptanceId: acceptance.id,
      termId: acceptance.term_id,
      termVersion: acceptance.term_version,
      termContentHash: acceptance.term_content_hash,
      accepted: acceptance.accepted,
      acceptedAt: acceptance.accepted_at,
      revokedAt: acceptance.revoked_at,
      term: termsById.get(acceptance.term_id) ?? null,
    }))
    .filter((item) => item.term !== null);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const payload = await request.json().catch(() => null);
    const token = normalizeToken(payload?.token);
    if (!token) return jsonResponse({ error: "invalid_token" }, 400);

    const session = await loadContractByToken(token);
    if (!session || isContractUnavailable(session.contract)) {
      return jsonResponse({ error: "contract_unavailable" }, 404);
    }

    if (session.contract.status === "enviado") {
      const { error } = await admin
        .from("client_contracts")
        .update({ status: "visualizado", viewed_at: new Date().toISOString() })
        .eq("id", session.contract.id)
        .eq("status", "enviado");
      if (error) throw error;
    }

    const terms = await getTerms(session.contract.id);
    const documentHash = session.contract.document_hash ?? null;

    return jsonResponse({
      contract: {
        id: session.contract.id,
        title: session.contract.title,
        content: session.contract.content,
        templateVersion: session.contract.template_version,
        status: session.contract.status === "enviado" ? "visualizado" : session.contract.status,
        sentAt: session.contract.sent_at,
        viewedAt: session.contract.viewed_at ?? new Date().toISOString(),
        signedAt: session.contract.signed_at,
        expiresAt: session.contract.expires_at,
        documentHash,
      },
      client: {
        id: session.client.id,
        name: session.client.name,
        email: session.client.email,
        phone: session.client.phone,
        whatsapp: session.client.whatsapp,
      },
      terms,
      acceptance: {
        id: session.acceptance.id,
        accepted: session.acceptance.accepted,
        acceptedAt: session.acceptance.accepted_at,
        signerName: session.acceptance.signer_name,
        signerEmail: session.acceptance.signer_email,
      },
    });
  } catch (error) {
    console.error("contract-signing-session", error);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
