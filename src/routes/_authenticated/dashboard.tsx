import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  Cake,
  FileText,
  NotebookPen,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, useSession } from "@/lib/session";
import { getFinancialIntelligence } from "@/lib/secure-actions.functions";
import { addDays, brl, brlShort, dateFmt, timeFmt, longDate, isoDay, initials } from "@/lib/format";
import { EmptyState, ErrorState, Pill, SkeletonCard } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Início — Aura Clínicas" },
      {
        name: "description",
        content: "Acesso rápido, próximos agendamentos e aniversariantes da clínica.",
      },
      { property: "og:title", content: "Início — Aura Clínicas" },
      { property: "og:description", content: "Resumo operacional da sua clínica de estética." },
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

const quickActions = [
  {
    label: "Novo agendamento",
    description: "Reserve um horário",
    to: "/agenda",
    icon: CalendarPlus,
    tone: "text-primary bg-primary-soft",
  },
  {
    label: "Novo pacote",
    description: "Cadastre no módulo de procedimentos",
    to: "/servicos",
    icon: PackagePlus,
    tone: "text-gold bg-gold-soft",
  },
  {
    label: "Novo cliente",
    description: "Adicione um cadastro",
    to: "/clientes",
    icon: UserPlus,
    tone: "text-success bg-success-soft",
  },
  {
    label: "Nova venda",
    description: "Registre no financeiro",
    to: "/financeiro",
    icon: ShoppingCart,
    tone: "text-primary bg-primary-soft",
  },
  {
    label: "Nova despesa",
    description: "Registre no financeiro",
    to: "/financeiro",
    icon: ReceiptText,
    tone: "text-destructive bg-destructive-soft",
  },
] as const;

type AppointmentPeriod = "24h" | "today" | "tomorrow" | "7d" | "15d" | "30d";

const appointmentPeriods: { value: AppointmentPeriod; label: string }[] = [
  { value: "24h", label: "Próximas 24 horas" },
  { value: "today", label: "Hoje" },
  { value: "tomorrow", label: "Amanhã" },
  { value: "7d", label: "Próximos 7 dias" },
  { value: "15d", label: "Próximos 15 dias" },
  { value: "30d", label: "Próximos 30 dias" },
];

type FinancialIntelligence = {
  top_services: { service: string; revenue: number | string; quantity: number | string }[];
  by_month: { month: string; revenue: number | string }[];
};

type PaidExpense = { amount: number; paid_at: string | null };

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function appointmentWindow(period: AppointmentPeriod) {
  const now = new Date();
  const today = isoDay(now);

  if (period === "today") return { from: now, to: addDays(today, 1) };
  if (period === "tomorrow") return { from: addDays(today, 1), to: addDays(today, 2) };
  if (period === "7d") return { from: now, to: addDays(now, 7) };
  if (period === "15d") return { from: now, to: addDays(now, 15) };
  if (period === "30d") return { from: now, to: addDays(now, 30) };
  return { from: now, to: addDays(now, 1) };
}

function trailingMonths(now: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return { key, label: `${month}/${String(date.getFullYear()).slice(-2)}` };
  });
}

async function loadPaidExpenses(from: string, toExclusive: string): Promise<PaidExpense[]> {
  const pageSize = 1000;
  const expenses: PaidExpense[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("accounts_payable")
      .select("amount, paid_at")
      .eq("status", "pago")
      .gte("paid_at", from)
      .lt("paid_at", toExclusive)
      .order("paid_at")
      .order("id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const page = data ?? [];
    expenses.push(...page);
    if (page.length < pageSize) break;
  }

  return expenses;
}

function Dashboard() {
  const fetchFinancialIntelligence = useServerFn(getFinancialIntelligence);
  const { data: membership } = useMembership();
  const { user } = useSession();
  const [appointmentPeriod, setAppointmentPeriod] = useState<AppointmentPeriod>("24h");
  const [professionalId, setProfessionalId] = useState("all");
  const orgId = membership?.organization.id;
  const now = new Date();
  const today = isoDay(now);
  const financialStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const financialEndExclusive = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const financialFrom = localDateKey(financialStart);
  const financialTo = localDateKey(now);
  const monthKeys = trailingMonths(now);

  const query = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard", orgId, today.toISOString().slice(0, 10)],
    queryFn: async () => {
      const [sales, clients] = await Promise.all([
        supabase
          .from("sales")
          .select("total, created_at")
          .gte("created_at", addDays(today, -30).toISOString()),
        supabase
          .from("clients")
          .select("id, name, birth_date")
          .is("deleted_at", null)
          .not("birth_date", "is", null),
      ]);
      if (sales.error) throw sales.error;
      if (clients.error) throw clients.error;

      return {
        revenueToday: sales.data
          .filter((sale) => new Date(sale.created_at) >= today)
          .reduce((total, sale) => total + Number(sale.total), 0),
        revenue30: sales.data.reduce((total, sale) => total + Number(sale.total), 0),
        birthdays: clients.data
          .filter((client) => {
            const birthDate = new Date(`${client.birth_date}T12:00:00`);
            return birthDate.getMonth() === now.getMonth();
          })
          .sort((a, b) => Number(a.birth_date?.slice(8, 10)) - Number(b.birth_date?.slice(8, 10))),
      };
    },
  });

  const professionalsQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard-professionals", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const appointmentsQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard-appointments", orgId, appointmentPeriod, professionalId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { from, to } = appointmentWindow(appointmentPeriod);
      let request = supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, price, professional_id, clients(name), services(name), professionals(name)",
        )
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .in("status", ["agendado", "confirmado", "aguardando", "reagendado"])
        .order("starts_at")
        .limit(50);

      if (professionalId !== "all") request = request.eq("professional_id", professionalId);

      const { data, error } = await request;
      if (error) throw error;
      return data ?? [];
    },
  });

  const financialQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard-financial-intelligence", orgId, financialFrom, financialTo],
    queryFn: async () =>
      (await fetchFinancialIntelligence({
        data: { from: financialFrom, to: financialTo, locationId: null },
      })) as FinancialIntelligence,
  });

  const expensesQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard-paid-expenses", orgId, financialFrom, financialTo],
    queryFn: () =>
      loadPaidExpenses(financialStart.toISOString(), financialEndExclusive.toISOString()),
  });

  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard />
      </div>
    );
  }

  const firstName =
    user?.user_metadata?.["full_name"]?.toString().split(" ")[0] ??
    user?.email?.split("@")[0] ??
    membership?.organization.name ??
    "bem-vindo";
  const data = query.data;
  const appointments = appointmentsQuery.data ?? [];
  const financialReport = financialQuery.data;
  const chartData = monthKeys.map(({ key, label }) => {
    const revenue = financialReport?.by_month.find((item) => item.month === key)?.revenue ?? 0;
    const expenses = (expensesQuery.data ?? [])
      .filter((item) => item.paid_at?.slice(0, 7) === key)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    return { month: label, revenue: Number(revenue), expenses };
  });
  const hasFinancialActivity = chartData.some((item) => item.revenue > 0 || item.expenses > 0);
  const topServices = financialReport?.top_services.slice(0, 5) ?? [];
  const selectedPeriodLabel =
    appointmentPeriods.find((period) => period.value === appointmentPeriod)?.label ??
    "Próximas 24 horas";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{longDate(now)}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            Bem-vindo, {firstName}!
          </h1>
        </div>
        <Link
          to="/agenda"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <CalendarDays className="size-4 text-primary" /> Ver agenda
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarPlus className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Acesso rápido</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-background/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg ${action.tone}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold group-hover:text-primary">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="surface min-h-40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <NotebookPen className="size-4 text-gold" />
            <h2 className="font-display text-base font-semibold">Anotações</h2>
          </div>
          <div className="grid min-h-20 place-items-center rounded-lg border border-dashed border-border px-4 text-center">
            <p className="text-xs text-muted-foreground">Nenhuma anotação para hoje.</p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_0.8fr]">
        <section className="surface p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">Próximos agendamentos</h2>
              <p className="mt-1 text-xs text-muted-foreground">{selectedPeriodLabel}</p>
            </div>
            <Link to="/agenda" className="text-xs font-semibold text-primary hover:underline">
              Ver todos
            </Link>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dashboard-professional-filter"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Profissional
              </label>
              <select
                id="dashboard-professional-filter"
                aria-label="Filtrar agendamentos por profissional"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={professionalId}
                onChange={(event) => setProfessionalId(event.target.value)}
              >
                <option value="all">Todas as profissionais</option>
                {professionalsQuery.data?.map((professional) => (
                  <option value={professional.id} key={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
              {professionalsQuery.error ? (
                <p className="mt-1 text-xs text-destructive">
                  Não foi possível carregar profissionais.
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="dashboard-period-filter"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Período
              </label>
              <select
                id="dashboard-period-filter"
                aria-label="Filtrar agendamentos por período"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={appointmentPeriod}
                onChange={(event) => setAppointmentPeriod(event.target.value as AppointmentPeriod)}
              >
                {appointmentPeriods.map((period) => (
                  <option value={period.value} key={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {appointmentsQuery.isLoading ? (
            <SkeletonCard lines={3} />
          ) : appointmentsQuery.error ? (
            <p className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
              Não foi possível carregar os agendamentos.
            </p>
          ) : appointments.length === 0 ? (
            <EmptyState
              title="Nenhum próximo agendamento"
              description="Não há atendimentos para a profissional e o período selecionados."
              action={
                <Link to="/agenda" className="text-xs font-semibold text-primary hover:underline">
                  Criar agendamento
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {appointments.slice(0, 8).map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
                >
                  <span className="w-20 shrink-0 font-display text-sm font-semibold tabular-nums text-primary">
                    {timeFmt(appointment.starts_at)}
                    <span className="mt-0.5 block font-sans text-[10px] font-normal text-muted-foreground">
                      {dateFmt(appointment.starts_at, { day: "2-digit", month: "short" })}
                    </span>
                  </span>
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                    {initials(appointment.clients?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {appointment.clients?.name ?? "Cliente avulso"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Profissional: {appointment.professionals?.name ?? "Não informado"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Itens: {appointment.services?.name ?? "Serviço"}
                    </p>
                  </div>
                  <Pill tone={statusTone[appointment.status]}>{appointment.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cake className="size-4 text-primary" />
              <h2 className="font-display text-base font-semibold">Aniversariantes</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {now.toLocaleDateString("pt-BR", { month: "long" })}
            </span>
          </div>
          {data.birthdays.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum aniversariante neste mês.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.birthdays.slice(0, 8).map((client) => (
                <li key={client.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-xs font-semibold tabular-nums">
                    {client.birth_date?.slice(8, 10)}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">{client.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {client.birth_date?.slice(8, 10)} de{" "}
                    {now.toLocaleDateString("pt-BR", { month: "long" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="surface flex items-center gap-3 p-4">
          <FileText className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Faturamento hoje</p>
            <p className="font-display text-xl font-semibold">{brl(data.revenueToday)}</p>
          </div>
        </div>
        <div className="surface flex items-center gap-3 p-4">
          <ShoppingCart className="size-5 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">Receita nos últimos 30 dias</p>
            <p className="font-display text-xl font-semibold">{brl(data.revenue30)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="surface p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <div>
                <h2 className="font-display text-base font-semibold">Vendas e despesas</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Últimos 6 meses · despesas pagas
                </p>
              </div>
            </div>
            <Link to="/relatorios" className="text-xs font-semibold text-primary hover:underline">
              Ver relatórios
            </Link>
          </div>

          {financialQuery.isLoading || expensesQuery.isLoading ? (
            <SkeletonCard lines={4} />
          ) : financialQuery.error || expensesQuery.error ? (
            <p className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
              Não foi possível carregar o resumo financeiro.
            </p>
          ) : !hasFinancialActivity ? (
            <p className="grid h-56 place-items-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              Ainda não há vendas ou despesas pagas nos últimos 6 meses.
            </p>
          ) : (
            <div className="h-64 w-full" aria-label="Gráfico de vendas e despesas pagas por mês">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickFormatter={(value) => brlShort(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={54}
                  />
                  <ChartTooltip
                    formatter={(value, name) => [brl(Number(value)), name]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="revenue"
                    name="Vendas"
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Despesas pagas"
                    fill="var(--color-destructive)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">5 principais procedimentos</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Por faturamento · últimos 6 meses
              </p>
            </div>
            <Link to="/relatorios" className="text-xs font-semibold text-primary hover:underline">
              Relatórios
            </Link>
          </div>

          {financialQuery.isLoading ? (
            <SkeletonCard lines={4} />
          ) : financialQuery.error ? (
            <p className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
              Não foi possível carregar os procedimentos.
            </p>
          ) : topServices.length === 0 ? (
            <p className="grid min-h-40 place-items-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              Ainda não há itens de venda detalhados neste período.
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {topServices.map((service, index) => (
                <li key={`${service.service}-${index}`} className="flex items-center gap-3 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{service.service}</span>
                    <span className="text-xs text-muted-foreground">
                      {Number(service.quantity).toLocaleString("pt-BR")} venda(s)
                    </span>
                  </span>
                  <strong className="text-right text-sm tabular-nums">
                    {brl(Number(service.revenue))}
                  </strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
