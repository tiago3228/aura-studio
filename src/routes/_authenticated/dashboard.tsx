import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
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
import { brl, timeFmt, longDate, isoDay, addDays, initials } from "@/lib/format";
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

function Dashboard() {
  const { data: membership } = useMembership();
  const { user } = useSession();
  const orgId = membership?.organization.id;
  const now = new Date();
  const today = isoDay(now);
  const tomorrow = addDays(today, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const query = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard", orgId, today],
    queryFn: async () => {
      const [appointments, sales, clients] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id, starts_at, ends_at, status, price, clients(name), services(name), professionals(name)",
          )
          .gte("starts_at", now.toISOString())
          .lt("starts_at", tomorrow.toISOString())
          .in("status", ["agendado", "confirmado", "aguardando", "reagendado"])
          .order("starts_at"),
        supabase
          .from("sales")
          .select("total, cost, created_at")
          .gte("created_at", addDays(today, -30).toISOString()),
        supabase
          .from("clients")
          .select("id, name, birth_date")
          .is("deleted_at", null)
          .not("birth_date", "is", null),
      ]);
      if (appointments.error) throw appointments.error;
      if (sales.error) throw sales.error;
      if (clients.error) throw clients.error;

      return {
        appointments: appointments.data,
        revenueToday: sales.data
          .filter((sale) => new Date(sale.created_at) >= new Date(today))
          .reduce((total, sale) => total + Number(sale.total), 0),
        revenue30: sales.data.reduce((total, sale) => total + Number(sale.total), 0),
        birthdays: clients.data
          .filter((client) => {
            const birthDate = new Date(`${client.birth_date}T12:00:00`);
            return birthDate.getMonth() === now.getMonth();
          })
          .sort((a, b) => Number(a.birth_date?.slice(8, 10)) - Number(b.birth_date?.slice(8, 10))),
        monthStart,
        monthEnd,
      };
    },
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">Próximos agendamentos</h2>
              <p className="mt-1 text-xs text-muted-foreground">Próximas 24 horas</p>
            </div>
            <Link to="/agenda" className="text-xs font-semibold text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {data.appointments.length === 0 ? (
            <EmptyState
              title="Nenhum próximo agendamento"
              description="Os próximos atendimentos aparecerão aqui."
              action={
                <Link to="/agenda" className="text-xs font-semibold text-primary hover:underline">
                  Criar agendamento
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.appointments.slice(0, 8).map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
                >
                  <span className="w-14 shrink-0 font-display text-sm font-semibold tabular-nums text-primary">
                    {timeFmt(appointment.starts_at)}
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
    </div>
  );
}
