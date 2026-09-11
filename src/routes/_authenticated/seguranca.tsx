/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole } from "@/lib/session";
import { PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/seguranca")({
  head: () => ({ meta: [{ title: "Segurança e auditoria — Aura Clínicas" }] }),
  component: SecurityPage,
});
const permissions = [
  "financeiro.visualizar",
  "financeiro.editar",
  "clientes.exportar",
  "crm.editar",
  "marketing.gerar",
  "marketing.aprovar",
  "agenda.editar",
  "equipe.gerenciar",
];
function SecurityPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const [role, setRole] = useState("reception");
  const logs = useQuery({
    enabled: !!orgId && isAdminRole(membership?.role),
    queryKey: ["security-audit", orgId],
    queryFn: async () => {
      const [audit, matrix] = await Promise.all([
        (supabase as any)
          .from("audit_logs")
          .select("id,action,entity,entity_id,severity,created_at,meta")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("organization_permissions")
          .select("role,permission,allowed")
          .eq("organization_id", orgId),
      ]);
      if (audit.error) throw audit.error;
      return { audit: audit.data ?? [], matrix: matrix.data ?? [] };
    },
  });
  async function toggle(permission: string) {
    if (!orgId) return;
    const current = logs.data?.matrix.find(
      (item: any) => item.role === role && item.permission === permission,
    );
    const { error } = await (supabase as any).from("organization_permissions").upsert(
      {
        organization_id: orgId,
        role,
        permission,
        allowed: !(current?.allowed ?? false),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,role,permission" },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Permissão atualizada.");
      logs.refetch();
    }
  }
  if (!isAdminRole(membership?.role))
    return (
      <div className="surface p-6 text-sm text-muted-foreground">
        Apenas proprietária ou gerente podem acessar segurança e auditoria.
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Segurança e auditoria"
        subtitle="Controle de permissões e trilha imutável das alterações críticas."
      />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="surface space-y-4 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Permissões por função</h2>
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="reception">Recepção</option>
            <option value="professional">Profissional</option>
            <option value="manager">Gerente</option>
          </select>
          <div className="space-y-2">
            {permissions.map((permission) => {
              const enabled = logs.data?.matrix.some(
                (item: any) => item.role === role && item.permission === permission && item.allowed,
              );
              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3"
                  key={permission}
                >
                  <span className="text-xs">{permission}</span>
                  <Button
                    size="sm"
                    variant={enabled ? "default" : "outline"}
                    onClick={() => toggle(permission)}
                  >
                    {enabled ? "Permitido" : "Bloqueado"}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Owner e gerente continuam sujeitos às regras administrativas existentes. RLS permanece
            como camada final de proteção.
          </p>
        </section>
        <section className="surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <History className="size-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Trilha de auditoria</h2>
              <p className="text-xs text-muted-foreground">
                Registros críticos não podem ser alterados ou apagados.
              </p>
            </div>
          </div>
          {logs.isLoading ? (
            <SkeletonCard />
          ) : (
            logs.data?.audit.map((log: any) => (
              <div
                className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
                key={log.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.entity ?? "sistema"} · {new Date(log.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Pill
                  tone={
                    log.severity === "critical"
                      ? "danger"
                      : log.severity === "warning"
                        ? "gold"
                        : "neutral"
                  }
                >
                  {log.severity}
                </Pill>
              </div>
            ))
          )}
          {!logs.isLoading && !logs.data?.audit.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum evento crítico registrado.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
