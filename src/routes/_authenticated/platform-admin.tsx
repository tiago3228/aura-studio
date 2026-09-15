/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { setOrganizationAccess, setPlatformSubscription } from "@/lib/secure-actions.functions";
import { useSession } from "@/lib/session";
import { PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/platform-admin")({
  head: () => ({ meta: [{ title: "Administração da plataforma — Aura" }] }),
  component: PlatformAdmin,
});

type Organization = {
  id: string;
  name: string;
  created_at: string;
  access_blocked: boolean;
  access_blocked_reason: string | null;
};
type Session = {
  id: string;
  user_id: string;
  organization_id: string | null;
  user_email: string | null;
  last_seen_at: string;
  left_at: string | null;
  organizations?: { name: string } | null;
};
type Subscription = {
  organization_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
};

const MASTER_EMAIL = "tiago3228@yahoo.com.br";
const ONLINE_WINDOW_MS = 90_000;

function PlatformAdmin() {
  const setOrganizationAccessFn = useServerFn(setOrganizationAccess);
  const setPlatformSubscriptionFn = useServerFn(setPlatformSubscription);
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Organization | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL;
  const organizations = useQuery({
    queryKey: ["platform-organizations"],
    enabled: isMaster,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organizations")
        .select("id,name,created_at,access_blocked,access_blocked_reason")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Organization[];
    },
  });
  const sessions = useQuery({
    queryKey: ["platform-sessions"],
    enabled: isMaster,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_sessions")
        .select("id,user_id,organization_id,user_email,last_seen_at,left_at,organizations(name)")
        .order("last_seen_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });
  const subscriptions = useQuery({
    queryKey: ["platform-subscriptions"],
    enabled: isMaster,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscriptions")
        .select("organization_id,plan,status,current_period_end");
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
  });

  const online = useMemo(
    () =>
      new Set(
        (sessions.data ?? [])
          .filter(
            (session) =>
              !session.left_at &&
              Date.now() - new Date(session.last_seen_at).getTime() < ONLINE_WINDOW_MS,
          )
          .map((session) => session.user_id),
      ),
    [sessions.data],
  );
  const filtered = (organizations.data ?? []).filter(
    (org) =>
      !statusFilter ||
      (subscriptions.data ?? []).find((sub) => sub.organization_id === org.id)?.status ===
        statusFilter,
  );
  if (!isMaster)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader
          title="Acesso restrito"
          subtitle="Esta área está disponível apenas para o administrador master."
        />
        <div className="surface p-6 text-sm text-muted-foreground">
          Entre com o usuário administrador da plataforma para continuar.
        </div>
      </div>
    );

  async function toggleAccess(org: Organization) {
    setBusy(true);
    try {
      await setOrganizationAccessFn({ data: { organizationId: org.id, enabled: org.access_blocked, reason: reason || null } });
    } catch {
      setBusy(false);
      toast.error("Não foi possível alterar o acesso.");
      return;
    }
    setBusy(false);
    toast.success(org.access_blocked ? "Acesso liberado." : "Acesso bloqueado.");
    setSelected(null);
    setReason("");
    await queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
  }
  async function changeSubscription(orgId: string, status: string) {
    try {
      await setPlatformSubscriptionFn({ data: { organizationId: orgId, status } });
    } catch {
      toast.error("Não foi possível atualizar a assinatura.");
      return;
    }
    toast.success("Assinatura atualizada.");
    await queryClient.invalidateQueries({ queryKey: ["platform-subscriptions"] });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Administração da plataforma"
        subtitle="Monitore acessos e administre as lojas do Aura."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              sessions.refetch();
              organizations.refetch();
              subscriptions.refetch();
            }}
          >
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        }
      />
      <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Administrador master
        </div>
        <p className="mt-1 text-muted-foreground">
          {MASTER_EMAIL} · Usuários online são considerados ativos quando enviaram heartbeat nos
          últimos 90 segundos.
        </p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Lojas cadastradas</p>
          <p className="mt-2 text-2xl font-semibold">{organizations.data?.length ?? 0}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Usuários online</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{online.size}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Lojas bloqueadas</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">
            {organizations.data?.filter((org) => org.access_blocked).length ?? 0}
          </p>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Filtrar status da assinatura"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        />
        <Pill tone="muted">Atualização automática a cada 30s</Pill>
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-4">Loja</th>
              <th className="p-4">Assinatura</th>
              <th className="p-4">Acesso</th>
              <th className="p-4">Últimos usuários</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {organizations.isLoading ? (
              <tr>
                <td className="p-4" colSpan={5}>
                  <SkeletonCard />
                </td>
              </tr>
            ) : (
              filtered.map((org) => {
                const sub = subscriptions.data?.find((item) => item.organization_id === org.id);
                const storeSessions =
                  sessions.data
                    ?.filter((session) => session.organization_id === org.id)
                    .slice(0, 3) ?? [];
                return (
                  <tr className="border-b border-border last:border-0" key={org.id}>
                    <td className="p-4">
                      <p className="font-semibold">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastro: {new Date(org.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </td>
                    <td className="p-4">
                      <Pill tone={sub?.status === "active" ? "green" : "gold"}>
                        {sub?.plan ?? "—"} · {sub?.status ?? "sem assinatura"}
                      </Pill>
                      <select
                        className="mt-2 block h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={sub?.status ?? ""}
                        onChange={(event) => changeSubscription(org.id, event.target.value)}
                        disabled={!sub}
                      >
                        <option value="">Alterar status</option>
                        <option value="active">Liberada</option>
                        <option value="pending">Pendente</option>
                        <option value="past_due">Em atraso</option>
                        <option value="canceled">Cancelada</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {org.access_blocked ? (
                        <Pill tone="red">
                          <Ban className="mr-1 size-3" /> Bloqueado
                        </Pill>
                      ) : (
                        <Pill tone="green">
                          <CheckCircle2 className="mr-1 size-3" /> Liberado
                        </Pill>
                      )}
                      {org.access_blocked_reason ? (
                        <p className="mt-1 max-w-40 text-xs text-muted-foreground">
                          {org.access_blocked_reason}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-4">
                      {storeSessions.length ? (
                        <div className="space-y-1">
                          {storeSessions.map((session) => (
                            <div className="flex items-center gap-2 text-xs" key={session.id}>
                              <Circle
                                className={`size-2 fill-current ${online.has(session.user_id) ? "text-primary" : "text-muted-foreground"}`}
                              />{" "}
                              <span className="truncate">{session.user_email ?? "usuário"}</span>
                              <span className="text-muted-foreground">
                                {new Date(session.last_seen_at).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem acessos registrados
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant={org.access_blocked ? "default" : "destructive"}
                        onClick={() => setSelected(org)}
                      >
                        {org.access_blocked ? "Liberar acesso" : "Bloquear acesso"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!organizations.isLoading && !filtered.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma loja encontrada.</p>
        ) : null}
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.access_blocked ? "Liberar acesso" : "Bloquear acesso"} — {selected?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selected?.access_blocked
              ? "A loja poderá voltar a acessar o sistema."
              : "A loja perderá acesso aos dados e às telas até ser liberada novamente."}
          </p>
          {selected?.access_blocked ? null : (
            <Input
              placeholder="Motivo do bloqueio (opcional)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSelected(null)}>
            Cancelar
          </Button>
          <Button
            variant={selected?.access_blocked ? "default" : "destructive"}
            disabled={busy}
            onClick={() => selected && toggleAccess(selected)}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Confirmar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
