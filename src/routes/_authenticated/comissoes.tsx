import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole } from "@/lib/session";
import { brl, dateFmt } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/comissoes")({
  head: () => ({
    meta: [
      { title: "Comissões — Aura Clínicas" },
      { name: "description", content: "Comissões por profissional, com fechamento e baixa de pagamento." },
      { property: "og:title", content: "Comissões — Aura Clínicas" },
      { property: "og:description", content: "Fechamento de comissões da equipe." },
    ],
  }),
  component: Comissoes,
});

function Comissoes() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["commissions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_entries")
        .select("*, professionals(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (data.isLoading) return <SkeletonCard />;
  const entries = data.data ?? [];
  const pending = entries.filter((e) => !e.paid);
  const totalPending = pending.reduce((acc, e) => acc + Number(e.net), 0);
  const totalPaid = entries.filter((e) => e.paid).reduce((acc, e) => acc + Number(e.net), 0);

  const byPro = Object.values(
    pending.reduce<Record<string, { name: string; total: number; count: number }>>((acc, e) => {
      const name = e.professionals?.name ?? "Sem profissional";
      acc[name] = acc[name] ?? { name, total: 0, count: 0 };
      acc[name]!.total += Number(e.net);
      acc[name]!.count += 1;
      return acc;
    }, {}),
  );

  async function payAll(name: string) {
    const ids = pending.filter((e) => (e.professionals?.name ?? "Sem profissional") === name).map((e) => e.id);
    const { error } = await supabase
      .from("commission_entries")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .in("id", ids);
    if (error) toast.error(error.message);
    else {
      toast.success("Comissões marcadas como pagas.");
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Comissões"
        subtitle="Geradas automaticamente a cada venda com profissional vinculado."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="A pagar" value={brl(totalPending)} tone="gold" />
        <StatCard label="Já pago" value={brl(totalPaid)} tone="success" />
        <StatCard label="Lançamentos" value={String(entries.length)} />
      </div>

      {byPro.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-base font-semibold">Fechamento por profissional</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {byPro.map((p) => (
              <li key={p.name} className="surface flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.count} lançamentos em aberto</p>
                </div>
                <span className="font-display text-base font-semibold tabular-nums">{brl(p.total)}</span>
                {isAdminRole(membership?.role) ? (
                  <Button size="sm" variant="outline" onClick={() => payAll(p.name)}>
                    Pagar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-semibold">Lançamentos</h2>
        {entries.length === 0 ? (
          <EmptyState
            title="Nenhuma comissão"
            description="Registre uma venda com profissional vinculado para gerar comissões automaticamente."
          />
        ) : (
          <ul className="surface divide-y divide-border p-0">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{dateFmt(e.created_at)}</span>
                <span className="min-w-0 flex-1 truncate">{e.professionals?.name ?? "—"}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  base {brl(Number(e.base_amount))}
                </span>
                <span className="font-semibold tabular-nums">{brl(Number(e.net))}</span>
                <Pill tone={e.paid ? "success" : "gold"}>{e.paid ? "pago" : "em aberto"}</Pill>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
