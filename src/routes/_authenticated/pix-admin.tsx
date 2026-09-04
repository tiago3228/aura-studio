import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { listPixPayments, reviewPixPayment } from "@/lib/pix.functions";
import { brl, dateFmt } from "@/lib/format";
import { PageHeader, Surface, SkeletonCard, Pill, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/pix-admin")({
  head: () => ({
    meta: [
      { title: "Liberação Pix — Aura Clínicas" },
      { name: "description", content: "Painel do administrador para liberar assinaturas pagas via Pix." },
      { property: "og:title", content: "Liberação Pix — Aura Clínicas" },
      { property: "og:description", content: "Aprove ou recuse pagamentos Pix das assinaturas." },
    ],
  }),
  component: PixAdmin,
});

const TONE: Record<string, { label: string; tone: "gold" | "success" | "neutral" }> = {
  pending: { label: "Aguardando", tone: "gold" },
  approved: { label: "Liberado", tone: "success" },
  rejected: { label: "Recusado", tone: "neutral" },
};

function PixAdmin() {
  const load = useServerFn(listPixPayments);
  const review = useServerFn(reviewPixPayment);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["pix-admin"], queryFn: () => load({}) });

  if (q.isLoading) return <SkeletonCard />;
  if (!q.data?.ok)
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Liberação Pix" />
        <EmptyState title="Acesso restrito" description="Esta área é exclusiva do administrador da plataforma." />
      </div>
    );

  async function act(id: string, approve: boolean) {
    setBusy(id);
    try {
      const res = await review({ data: { id, approve } });
      if (res.ok) {
        toast.success(res.message);
        q.refetch();
      } else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao revisar.");
    } finally {
      setBusy(null);
    }
  }

  const items = q.data.items;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Liberação Pix" subtitle="Confirme os pagamentos recebidos e libere o acesso." />
      {items.length === 0 ? (
        <EmptyState title="Nenhum pagamento informado" description="As solicitações Pix aparecem aqui." />
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const tone = TONE[p.status] ?? TONE["pending"]!;
            return (
              <Surface key={p.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.organizationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {brl(Number(p.amount))} · {p.months} mês(es) · {dateFmt(p.created_at)}
                    </p>
                    {p.payer_note ? <p className="mt-1 text-sm">{p.payer_note}</p> : null}
                  </div>
                  <Pill tone={tone.tone}>{tone.label}</Pill>
                </div>
                {p.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(p.id, true)} disabled={busy === p.id}>
                      {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Liberar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(p.id, false)} disabled={busy === p.id}>
                      <X className="size-4" /> Recusar
                    </Button>
                  </div>
                ) : null}
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}
