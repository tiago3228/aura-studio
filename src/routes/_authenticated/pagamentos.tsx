/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { addDays, brl } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Aura Clínicas" }] }),
  component: PagamentosPage,
});
const iso = (d: Date) => d.toISOString().slice(0, 10);
const statusLabel: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  paid: "Pago",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Estornado",
  failed: "Falhou",
};

function PagamentosPage() {
  const { data: membership } = useMembership();
  const [from, setFrom] = useState(iso(addDays(new Date(), -29)));
  const [to, setTo] = useState(iso(new Date()));
  const [status, setStatus] = useState("");
  const report = useQuery({
    enabled: !!membership?.organization.id,
    queryKey: ["payment-center", membership?.organization.id, from, to, status],
    queryFn: async () => {
      let query = (supabase as any)
        .from("payment_charges")
        .select(
          "id,description,amount,discount,final_amount,status,method,payment_url,created_at,clients(name),payment_providers(display_name)",
        )
        .gte("created_at", `${from}T00:00:00`)
        .lt("created_at", `${to}T23:59:59`)
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  const charges = report.data ?? [];
  const totals = useMemo(
    () =>
      charges.reduce(
        (acc: Record<string, number>, charge: any) => {
          const value = Number(charge.final_amount ?? 0);
          acc.total += value;
          acc[charge.status] = (acc[charge.status] ?? 0) + value;
          return acc;
        },
        { total: 0, paid: 0, pending: 0, cancelled: 0, refunded: 0 },
      ),
    [charges],
  );
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Central de Pagamentos"
        subtitle="Acompanhe cobranças, pagamentos e status financeiros da clínica."
        actions={
          <Button variant="outline" onClick={() => report.refetch()}>
            <RefreshCw className="size-4" /> Atualizar
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
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setFrom(iso(new Date()));
            setTo(iso(new Date()));
          }}
        >
          <CalendarRange className="size-4" /> Hoje
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFrom(iso(addDays(new Date(), -6)));
            setTo(iso(new Date()));
          }}
        >
          7 dias
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Cobranças" value={String(charges.length)} />
        <StatCard label="Total" value={brl(totals.total)} />
        <StatCard label="Recebido" value={brl(totals.paid)} tone="success" />
        <StatCard label="Pendente" value={brl(totals.pending)} tone="gold" />
        <StatCard label="Estornado" value={brl(totals.refunded)} tone="danger" />
      </div>
      <section className="surface mt-5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Cobranças</h2>
        </div>
        {report.isLoading ? (
          <SkeletonCard />
        ) : report.error ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar as cobranças. Execute a migração da Central de Pagamentos no
            Lovable.
          </p>
        ) : charges.length ? (
          <div className="divide-y divide-border">
            {charges.map((charge: any) => (
              <div className="flex flex-wrap items-center gap-3 py-3" key={charge.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{charge.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {charge.clients?.name ?? "Cliente não informado"} ·{" "}
                    {new Date(charge.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className="text-sm font-semibold">{brl(Number(charge.final_amount))}</span>
                <Pill
                  tone={
                    charge.status === "paid"
                      ? "success"
                      : charge.status === "failed" || charge.status === "cancelled"
                        ? "danger"
                        : "gold"
                  }
                >
                  {statusLabel[charge.status] ?? charge.status}
                </Pill>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 size-5" />
            Nenhuma cobrança encontrada no período.
          </div>
        )}
      </section>
    </div>
  );
}
