/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarRange, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { addDays, brl } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Aura Clínicas" }] }),
  component: RelatoriosPage,
});
const iso = (date: Date) => date.toISOString().slice(0, 10);

function RelatoriosPage() {
  const { data: membership } = useMembership();
  const [to, setTo] = useState(iso(new Date()));
  const [from, setFrom] = useState(iso(addDays(new Date(), -89)));
  const report = useQuery({
    enabled: !!membership?.organization.id,
    queryKey: ["financial-intelligence", membership?.organization.id, from, to],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_financial_intelligence", {
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return data as {
        summary: any;
        top_services: { service: string; revenue: number; quantity: number }[];
        by_month: { month: string; revenue: number; costs: number }[];
      };
    },
  });
  const summary = report.data?.summary;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Relatórios e inteligência financeira"
        subtitle="Transforme os dados da clínica em decisões práticas."
        actions={
          <Button variant="outline" onClick={() => report.refetch()}>
            <TrendingUp className="size-4" /> Atualizar relatório
          </Button>
        }
      />
      <div className="surface mb-5 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Início</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Fim</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setFrom(iso(addDays(new Date(), -29)));
            setTo(iso(new Date()));
          }}
        >
          <CalendarRange className="size-4" /> Últimos 30 dias
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFrom(`${new Date().getFullYear()}-01-01`);
            setTo(iso(new Date()));
          }}
        >
          Este ano
        </Button>
      </div>
      {report.isLoading ? (
        <SkeletonCard />
      ) : report.error ? (
        <div className="surface p-6 text-sm text-destructive">
          {report.error instanceof Error
            ? report.error.message
            : "Não foi possível gerar o relatório."}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Receita" value={brl(Number(summary?.revenue ?? 0))} tone="success" />
            <StatCard
              label="Margem bruta"
              value={brl(Number(summary?.gross_margin ?? 0))}
              tone="gold"
            />
            <StatCard label="Ticket médio" value={brl(Number(summary?.average_ticket ?? 0))} />
            <StatCard label="Recebido" value={brl(Number(summary?.paid ?? 0))} tone="success" />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                <div>
                  <h2 className="font-display text-lg font-semibold">Operação e agenda</h2>
                  <p className="text-xs text-muted-foreground">
                    Indicadores do período selecionado
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Atendimentos" value={summary?.attended} />
                <Metric label="Comparecimento" value={`${summary?.attendance_rate ?? 0}%`} />
                <Metric label="Faltas" value={summary?.missed} />
                <Metric label="Cancelamentos" value={summary?.cancelled} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill tone="success">Margem: {summary?.margin_percent ?? 0}%</Pill>
                <Pill tone="gold">Faltas: {summary?.no_show_rate ?? 0}%</Pill>
                <Pill>Agendamentos: {summary?.appointments ?? 0}</Pill>
              </div>
            </section>
            <section className="surface p-5">
              <h2 className="mb-4 font-display text-lg font-semibold">Receita por mês</h2>
              {report.data?.by_month?.length ? (
                <div className="space-y-3">
                  {report.data.by_month.map((item) => (
                    <div key={item.month}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{item.month}</span>
                        <strong>{brl(Number(item.revenue))}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, (Number(item.revenue) / Math.max(...report.data!.by_month.map((x) => Number(x.revenue)), 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ainda não há vendas no período.</p>
              )}
            </section>
          </div>
          <section className="surface mt-5 p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">
              Procedimentos e serviços que mais geram receita
            </h2>
            {report.data?.top_services?.length ? (
              <div className="divide-y divide-border">
                {report.data.top_services.map((item, index) => (
                  <div className="flex items-center gap-3 py-3" key={`${item.service}-${index}`}>
                    <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.service}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Number(item.quantity).toFixed(0)} venda(s)
                    </span>
                    <strong className="text-sm">{brl(Number(item.revenue))}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não há itens detalhados de venda no período.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value ?? 0}</p>
    </div>
  );
}
