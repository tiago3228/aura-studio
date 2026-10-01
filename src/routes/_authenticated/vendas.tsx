/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, Search, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, SkeletonCard, StatCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl, dateFmt } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Aura Clínicas" }] }),
  component: Vendas,
});

function Vendas() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const [term, setTerm] = useState("");
  const sales = useQuery({
    enabled: Boolean(orgId),
    queryKey: ["sales-list", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales")
        .select(
          "id, client_id, professional_id, total, discount, created_at, clients(name), professionals(name)",
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = useMemo(
    () =>
      (sales.data ?? []).filter((sale: any) =>
        `${sale.clients?.name ?? "Venda avulsa"} ${sale.professionals?.name ?? ""}`
          .toLowerCase()
          .includes(term.toLowerCase()),
      ),
    [sales.data, term],
  );
  const total = filtered.reduce((sum: number, sale: any) => sum + Number(sale.total ?? 0), 0);
  if (sales.error) return <ErrorState message={(sales.error as Error).message} />;
  if (!sales.data) return <SkeletonCard lines={5} />;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Vendas"
        subtitle={`${filtered.length} venda(s) registrada(s)`}
        actions={
          <>
            <Button variant="outline" onClick={() => void sales.refetch()}>
              <RefreshCw className="size-4" /> Atualizar
            </Button>
            <Button asChild>
              <Link to="/financeiro">
                <ShoppingBag className="size-4" /> Registrar venda
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatCard label="Total filtrado" value={brl(total)} tone="success" />
        <StatCard label="Quantidade" value={String(filtered.length)} />
      </div>
      <div className="surface mb-5 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por cliente ou profissional"
            className="pl-9"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="surface p-5">
          <EmptyState
            title="Nenhuma venda encontrada"
            description="Registre vendas pela tela de Fluxo financeiro."
            action={
              <Button asChild>
                <Link to="/financeiro">Abrir fluxo financeiro</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Data de emissão</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Profissional</th>
                <th className="px-5 py-3">Valor líquido</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((sale: any, index: number) => (
                <tr key={sale.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4 font-medium text-muted-foreground">
                    {String(filtered.length - index).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">{dateFmt(sale.created_at)}</td>
                  <td className="px-5 py-4">
                    {sale.client_id ? (
                      <Link
                        to="/clientes/$id"
                        params={{ id: sale.client_id }}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {sale.clients?.name ?? "Cliente"}
                      </Link>
                    ) : (
                      "Venda avulsa"
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {sale.professionals?.name ?? "Não informado"}
                  </td>
                  <td className="px-5 py-4 font-semibold">{brl(Number(sale.total ?? 0))}</td>
                  <td className="px-5 py-4">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/financeiro">Ver financeiro</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
