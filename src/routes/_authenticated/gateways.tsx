/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/gateways")({
  head: () => ({ meta: [{ title: "Gateways de pagamento — Aura Clínicas" }] }),
  component: GatewaysPage,
});
const providers = [
  { id: "mercado_pago", label: "Mercado Pago", capabilities: "Pix · cartão · link · webhook" },
  { id: "stripe", label: "Stripe", capabilities: "Cartão · parcelamento · link · webhook" },
  { id: "pagbank", label: "PagBank", capabilities: "Pix · cartão · boleto · webhook" },
  { id: "asaas", label: "Asaas", capabilities: "Pix · boleto · cartão · webhook" },
  { id: "pix_manual", label: "Pix manual" },
];
function GatewaysPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("mercado_pago");
  const [saving, setSaving] = useState(false);
  const selectedProvider = providers.find((item) => item.id === provider);
  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["payment-gateways", orgId],
    queryFn: async () => {
      const [gateways, transactions] = await Promise.all([
        (supabase as any)
          .from("payment_gateways")
          .select("id,provider,display_name,environment,active,updated_at")
          .order("provider"),
        (supabase as any)
          .from("payment_transactions")
          .select("id,provider,amount,status,kind,created_at")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (gateways.error) throw gateways.error;
      return { gateways: gateways.data ?? [], transactions: transactions.data ?? [] };
    },
  });
  async function connect() {
    if (!orgId) return;
    setSaving(true);
    const selected = providers.find((item) => item.id === provider)!;
    const { error } = await (supabase as any).from("payment_gateways").upsert(
      {
        organization_id: orgId,
        provider,
        display_name: selected.label,
        environment: "sandbox",
        active: true,
      },
      { onConflict: "organization_id,provider" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${selected.label} preparado em modo sandbox.`);
    void queryClient.invalidateQueries({ queryKey: ["payment-gateways", orgId] });
  }
  async function toggle(gateway: any) {
    const { error } = await (supabase as any)
      .from("payment_gateways")
      .update({ active: !gateway.active, updated_at: new Date().toISOString() })
      .eq("id", gateway.id);
    if (error) return toast.error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["payment-gateways", orgId] });
  }
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Gateways de pagamento"
        subtitle="Conecte provedores sem expor chaves secretas no navegador."
      />
      <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
        <strong>Segurança:</strong> tokens e webhooks devem permanecer no servidor. Esta tela
        registra o provedor e o ambiente; as credenciais são configuradas como segredo no backend.
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
              <LockKeyhole className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Central de Integrações</h2>
              <p className="text-xs text-muted-foreground">
                O checkout só deve ser ativado após configurar a credencial no servidor.
              </p>
            </div>
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {providers.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {selectedProvider?.capabilities ? (
            <p className="text-xs text-muted-foreground">
              Recursos previstos: {selectedProvider.capabilities}
            </p>
          ) : null}
          <Button onClick={connect} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}{" "}
            Preparar em sandbox
          </Button>
        </section>
        <section className="surface p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Gateways cadastrados</h2>
          {data.isLoading ? (
            <SkeletonCard />
          ) : (
            data.data?.gateways.map((gateway: any) => (
              <div
                className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
                key={gateway.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{gateway.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {gateway.environment} · credencial protegida no servidor
                  </p>
                </div>
                <Pill tone={gateway.active ? "success" : "neutral"}>
                  {gateway.active ? "Ativo" : "Inativo"}
                </Pill>
                <Button size="sm" variant="outline" onClick={() => toggle(gateway)}>
                  {gateway.active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            ))
          )}
          {!data.data?.gateways.length ? (
            <p className="text-sm text-muted-foreground">Nenhum gateway configurado.</p>
          ) : null}
        </section>
      </div>
      <section className="surface mt-5 p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Últimas transações</h2>
        {data.data?.transactions.map((transaction: any) => (
          <div
            className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
            key={transaction.id}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {transaction.provider} · {transaction.kind}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(transaction.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <span className="text-sm font-semibold">
              R$ {Number(transaction.amount).toFixed(2).replace(".", ",")}
            </span>
            <Pill
              tone={
                transaction.status === "paid"
                  ? "success"
                  : transaction.status === "failed"
                    ? "danger"
                    : "gold"
              }
            >
              {transaction.status}
            </Pill>
          </div>
        ))}
        {!data.data?.transactions.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação registrada.</p>
        ) : null}
      </section>
    </div>
  );
}
