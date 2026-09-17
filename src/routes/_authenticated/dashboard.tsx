import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, TrendingUp, AlertTriangle, Cake } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { useLanguage } from "@/lib/language";
import { brl, timeFmt, longDate, isoDay, addDays, initials } from "@/lib/format";
import {
  PageHeader,
  StatCard,
  SkeletonCard,
  EmptyState,
  Pill,
  ErrorState,
} from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão geral — Aura Clínicas" },
      {
        name: "description",
        content: "Resumo do dia: agendamentos, faturamento, alertas e aniversários.",
      },
      { property: "og:title", content: "Visão geral — Aura Clínicas" },
      { property: "og:description", content: "Resumo do dia da sua clínica de estética." },
    ],
  }),
  component: Dashboard,
});

const statusTone = {
  agendado: "neutral",
  confirmado: "primary",
  aguardando: "gold",
  atendido: "success",
  cancelado: "danger",
  faltou: "danger",
  reagendado: "gold",
} as const;

function Dashboard() {
  const { data: membership } = useMembership();
  const { language, t } = useLanguage();
  const orgId = membership?.organization.id;
  const today = isoDay(new Date());
  const tomorrow = addDays(today, 1);

  const query = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard", orgId],
    queryFn: async () => {
      const [appointments, sales, products, clients] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id, starts_at, status, price, clients(name), services(name), professionals(name)",
          )
          .gte("starts_at", today.toISOString())
          .lt("starts_at", tomorrow.toISOString())
          .order("starts_at"),
        supabase
          .from("sales")
          .select("total, cost, created_at")
          .gte("created_at", addDays(today, -30).toISOString()),
        supabase.from("products").select("id, name, stock, min_stock").eq("active", true),
        supabase.from("clients").select("id, name, birth_date").is("deleted_at", null),
      ]);
      if (appointments.error) throw appointments.error;
      if (sales.error) throw sales.error;
      if (products.error) throw products.error;
      if (clients.error) throw clients.error;

      const todaySales = sales.data.filter((s) => new Date(s.created_at) >= today);
      const month = new Date().getMonth();
      const day = new Date().getDate();
      return {
        appointments: appointments.data,
        revenueToday: todaySales.reduce((acc, s) => acc + Number(s.total), 0),
        revenue30: sales.data.reduce((acc, s) => acc + Number(s.total), 0),
        margin30: sales.data.reduce((acc, s) => acc + Number(s.total) - Number(s.cost), 0),
        lowStock: products.data.filter((p) => Number(p.stock) <= Number(p.min_stock)),
        birthdays: clients.data.filter((c) => {
          if (!c.birth_date) return false;
          const d = new Date(`${c.birth_date}T12:00:00`);
          return d.getMonth() === month && Math.abs(d.getDate() - day) <= 3;
        }),
      };
    },
  });

  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} />
        <SkeletonCard />
      </div>
    );
  }

  const data = query.data;
  const attended = data.appointments.filter((a) => a.status === "atendido").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back={false}
        title={`${t("Olá")}, ${membership?.organization.name ?? ""}`}
        subtitle={longDate(new Date())}
        actions={
          <Button asChild>
            <Link to="/agenda">
              <CalendarPlus className="size-4" /> {t("Novo agendamento")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("Atendimentos hoje")}
          value={String(data.appointments.length)}
          hint={`${attended} ${t("concluídos")}`}
          tone="primary"
        />
        <StatCard label={t("Faturamento hoje")} value={brl(data.revenueToday)} tone="success" />
        <StatCard
          label={t("Receita 30 dias")}
          value={brl(data.revenue30)}
          hint={t("vendas registradas")}
        />
        <StatCard
          label={t("Margem 30 dias")}
          value={brl(data.margin30)}
          hint={t("receita menos custos")}
          tone="gold"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">{t("Agenda de hoje")}</h2>
            <Link to="/agenda" className="text-xs font-semibold text-primary hover:underline">
              {t("Ver agenda")}
            </Link>
          </div>
          {data.appointments.length === 0 ? (
            <EmptyState
              title={t("Nenhum atendimento hoje")}
              description={
                language === "en-US"
                  ? "Use this time to add treatments or send reminders to inactive clients."
                  : language === "pt-PT"
                    ? "Aproveite para registar procedimentos ou enviar lembretes aos clientes inativos."
                    : "Aproveite para cadastrar procedimentos ou enviar lembretes para clientes inativos."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.appointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="w-12 font-display text-sm font-semibold tabular-nums">
                    {timeFmt(a.starts_at)}
                  </span>
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                    {initials(a.clients?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {a.clients?.name ?? t("Cliente avulso")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.services?.name ?? t("Serviço")} ·{" "}
                      {a.professionals?.name ?? t("Sem profissional")}
                    </p>
                  </div>
                  <span className="hidden text-sm font-semibold tabular-nums sm:block">
                    {brl(Number(a.price))}
                  </span>
                  <Pill tone={statusTone[a.status]}>{t(a.status)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
              <AlertTriangle className="size-4 text-gold" /> {t("Estoque crítico")}
            </h2>
            {data.lowStock.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("Todos os produtos acima do mínimo.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.lowStock.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <Pill tone="danger">
                      {Number(p.stock)} / min {Number(p.min_stock)}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
              <Cake className="size-4 text-primary" /> {t("Aniversariantes")}
            </h2>
            {data.birthdays.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("Nenhum aniversário nos próximos dias.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.birthdays.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.name}</span>
                    <Pill tone="gold">
                      {c.birth_date?.slice(8, 10)}/{c.birth_date?.slice(5, 7)}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="mb-2 flex items-center gap-2 font-display text-base font-semibold">
              <TrendingUp className="size-4 text-success" /> {t("Dica do dia")}
            </h2>
            <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
              {t(
                "Pergunte ao assistente de IA quais clientes não retornam há 60 dias e dispare uma campanha de reativação pelo WhatsApp.",
              )}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/assistente">{t("Abrir assistente")}</Link>
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
