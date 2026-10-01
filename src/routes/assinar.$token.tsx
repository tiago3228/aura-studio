import { createFileRoute, useParams } from "@tanstack/react-router";

import { ContractSigningPanel } from "@/components/contracts/contract-signing-panel";

export const Route = createFileRoute("/assinar/$token")({
  head: () => ({
    meta: [
      { title: "Assinatura de contrato — Aura Clínicas" },
      { name: "description", content: "Visualização segura e aceite eletrônico de contrato." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicContractSigning,
});

function PublicContractSigning() {
  const { token } = useParams({ from: "/assinar/$token" });

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto mb-6 max-w-5xl">
        <p className="text-sm font-semibold tracking-wide text-primary">AURA CLÍNICAS</p>
        <p className="text-xs text-muted-foreground">Assinatura eletrônica segura</p>
      </div>
      <ContractSigningPanel token={token} />
    </main>
  );
}
