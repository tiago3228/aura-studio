import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle2, Filter, RefreshCw, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl, dateFmt, timeFmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/atendimentos")({
  head: () => ({
    meta: [
      { title: "Atendimentos — Aura Clínicas" },
      {
        name: "description",
        content: "Acompanhe atendimentos, status, profissionais e prontuários.",
      },
    ],
  }),
  component: Atendimentos,
});

type Status =
  "agendado" | "confirmado" | "aguardando" | "atendido" | "cancelado" | "faltou" | "reagendado";
type SortKey = "code" | "client" | "professional" | "date";

const statuses: Array<{ value: Status | "todos"; label: string }> = [
  { value: "todos", label: "Todos os status" },
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "aguardando", label: "Aguardando" },
  { value: "atendido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
  { value: "faltou", label: "Faltou" },
  { value: "reagendado", label: "Reagendado" },
];

const statusTone = {
  agendado: "neutral",
  confirmado: "primary",
  aguardando: "gold",
  atendido: "success",
  cancelado: "danger",
  faltou: "danger",
  reagendado: "gold",
} as const;

function Atendimentos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<Status | "todos">("todos");
  const [sort, setSort] = useState<SortKey>("date");
  const [onlyPending, setOnlyPending] = useState(false);

  const query = useQuery({
    enabled: Boolean(orgId),
    queryKey: ["attendances", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, price, notes, client_id, clients(name), professionals(name), services(name)",
        )
        .eq("organization_id", orgId!)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: Status }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: nextStatus })
        .eq("id", id)
        .eq("organization_id", orgId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendances", orgId] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status do atendimento atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o status."),
  });

  const rows = useMemo(() => {
    const normalized = term.trim().toLocaleLowerCase("pt-BR");
    return [...(query.data ?? [])]
      .filter((item) => {
        const clientName = item.clients?.name ?? "Cliente avulso";
        const professionalName = item.professionals?.name ?? "Não informado";
        const matchesTerm =
          !normalized ||
          `${clientName} ${professionalName} ${item.services?.name ?? ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized);
        const matchesStatus = status === "todos" || item.status === status;
        const matchesPending = !onlyPending || Number(item.price) > 0;
        return matchesTerm && matchesStatus && matchesPending;
      })
      .sort((a, b) => {
        if (sort === "client")
          return (a.clients?.name ?? "").localeCompare(b.clients?.name ?? "", "pt-BR");
        if (sort === "professional")
          return (a.professionals?.name ?? "").localeCompare(b.professionals?.name ?? "", "pt-BR");
        return sort === "code"
          ? a.id.localeCompare(b.id)
          : new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
      });
  }, [onlyPending, query.data, sort, status, term]);

  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data) return <SkeletonCard lines={5} />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Atendimentos"
        subtitle={`${rows.length} de ${query.data.length} atendimentos`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={query.isFetching ? "size-4 animate-spin" : "size-4"} />{" "}
              Atualizar
            </Button>
            <Button asChild>
              <Link to="/agenda">
                <CalendarPlus className="size-4" /> Novo
              </Link>
            </Button>
          </>
        }
      />

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar cliente, profissional ou procedimento"
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Status | "todos")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filtrar por status"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Ordenar atendimentos"
          >
            <option value="code">Código</option>
            <option value="client">Cliente</option>
            <option value="professional">Profissional</option>
            <option value="date">Data</option>
          </select>
          <Button
            type="button"
            variant={onlyPending ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyPending((value) => !value)}
          >
            <Filter className="size-4" /> {onlyPending ? "Com valor" : "Filtrar"}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhum atendimento encontrado"
              description="Ajuste os filtros ou crie um novo atendimento pela Agenda."
              action={
                <Button asChild>
                  <Link to="/agenda">
                    <CalendarPlus className="size-4" /> Novo atendimento
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Profissional</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Anamnese</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((item, index) => {
                  const clientName = item.clients?.name ?? "Cliente avulso";
                  const isFinished = item.status === "atendido";
                  return (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-5 py-4 font-medium tabular-nums text-muted-foreground">
                        {String(query.data.length - index).padStart(2, "0")}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={item.client_id ? "/clientes/$id" : "/agenda"}
                          params={item.client_id ? { id: item.client_id } : undefined}
                          className="flex items-center gap-2 font-medium hover:text-primary hover:underline"
                        >
                          <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
                            <UserRound className="size-4" />
                          </span>
                          {clientName}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {item.professionals?.name ?? "Não informado"}
                      </td>
                      <td className="px-5 py-4">
                        <p>{dateFmt(item.starts_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {timeFmt(item.starts_at)}–{timeFmt(item.ends_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4 tabular-nums">{brl(Number(item.price))}</td>
                      <td className="px-5 py-4">
                        <Pill tone="neutral">Não vinculada</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <Pill tone={statusTone[item.status]}>
                          {item.status === "atendido" ? "Concluído" : item.status}
                        </Pill>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {item.client_id ? (
                            <Button asChild variant="outline" size="sm">
                              <Link to="/clientes/$id" params={{ id: item.client_id }}>
                                Prontuário
                              </Link>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant={isFinished ? "outline" : "secondary"}
                            size="sm"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: item.id,
                                nextStatus: isFinished ? "confirmado" : "atendido",
                              })
                            }
                          >
                            {isFinished ? (
                              "Reabrir"
                            ) : (
                              <>
                                <CheckCircle2 className="size-4" /> Concluir
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
