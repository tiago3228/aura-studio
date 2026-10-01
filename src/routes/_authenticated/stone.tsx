/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Info, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/stone")({
  head: () => ({
    meta: [
      { title: "Integração Stone — Aura Clínicas" },
      {
        name: "description",
        content: "Configure a integração Stone Connect 2.0 em ambiente sandbox.",
      },
    ],
  }),
  component: StonePage,
});

type StoneConfig = {
  terminal_id: string;
  merchant_id: string;
  terminal_name: string;
  order_mode: "direct" | "listed";
};

const defaultConfig: StoneConfig = {
  terminal_id: "",
  merchant_id: "",
  terminal_name: "",
  order_mode: "direct",
};

function StonePage() {
  const { data: membership } = useMembership();
  const organizationId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoneConfig>(defaultConfig);

  const configQuery = useQuery({
    enabled: Boolean(organizationId),
    queryKey: ["stone-sandbox-config", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_gateways")
        .select("id, active, environment, metadata")
        .eq("organization_id", organizationId!)
        .eq("provider", "stone")
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        active: boolean;
        environment: string;
        metadata: Partial<StoneConfig>;
      } | null;
    },
  });

  useEffect(() => {
    const metadata = configQuery.data?.metadata;
    if (!metadata) return;
    setForm({
      terminal_id: metadata.terminal_id ?? "",
      merchant_id: metadata.merchant_id ?? "",
      terminal_name: metadata.terminal_name ?? "",
      order_mode: metadata.order_mode === "listed" ? "listed" : "direct",
    });
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organização não identificada.");
      const { error } = await (supabase as any).from("payment_gateways").upsert(
        {
          organization_id: organizationId,
          provider: "stone",
          display_name: "Stone Connect 2.0",
          environment: "sandbox",
          active: true,
          metadata: {
            terminal_id: form.terminal_id.trim() || null,
            merchant_id: form.merchant_id.trim() || null,
            terminal_name: form.terminal_name.trim() || null,
            order_mode: form.order_mode,
            configured_at: new Date().toISOString(),
          },
        },
        { onConflict: "organization_id,provider" },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stone-sandbox-config", organizationId] });
      await queryClient.invalidateQueries({ queryKey: ["payment-gateways", organizationId] });
      toast.success("Configuração Stone salva em sandbox.");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar a configuração.",
      ),
  });

  if (configQuery.isLoading) return <SkeletonCard lines={4} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Integração Stone"
        subtitle="Configure o terminal para preparar cobranças presenciais sem executar transações reais."
        actions={<Pill tone="gold">Sandbox</Pill>}
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-gold" />
        <div>
          <p className="font-semibold">Ambiente de testes</p>
          <p className="mt-1 text-muted-foreground">
            Esta tela salva somente configurações não secretas. Nenhum pedido será enviado para a
            Stone e nenhuma cobrança será realizada.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="surface space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Configuração do terminal</h2>
              <p className="text-xs text-muted-foreground">
                Dados de identificação, não credenciais.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stone-terminal-id">Código do terminal</Label>
              <Input
                id="stone-terminal-id"
                value={form.terminal_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, terminal_id: event.target.value }))
                }
                placeholder="Ex.: S920-000123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stone-merchant-id">Código do estabelecimento</Label>
              <Input
                id="stone-merchant-id"
                value={form.merchant_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, merchant_id: event.target.value }))
                }
                placeholder="Informado pela Stone"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stone-terminal-name">Nome do terminal</Label>
            <Input
              id="stone-terminal-name"
              value={form.terminal_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, terminal_name: event.target.value }))
              }
              placeholder="Ex.: Recepção"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stone-order-mode">Modo de pedido</Label>
            <select
              id="stone-order-mode"
              value={form.order_mode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  order_mode: event.target.value as StoneConfig["order_mode"],
                }))
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="direct">Pedido direto — valor enviado automaticamente</option>
              <option value="listed">Pedido listado — operador escolhe no terminal</option>
            </select>
            <p className="text-xs text-muted-foreground">
              A disponibilidade final depende da habilitação da conta Connect 2.0 pela Stone.
            </p>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="size-4" />{" "}
            {saveMutation.isPending ? "Salvando..." : "Salvar configuração sandbox"}
          </Button>
        </section>

        <section className="surface space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Segurança</h2>
              <p className="text-xs text-muted-foreground">Preparado para a próxima etapa.</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> Credenciais ficarão
              apenas nos secrets do backend.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> O Aura registrará
              pedidos com chave de idempotência.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> O pagamento só será
              confirmado após retorno verificado da Stone.
            </li>
          </ul>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Para produção, será necessário credenciamento no programa de parceiros, homologação
            Connect 2.0 e configuração das credenciais no servidor.
          </div>
          {configQuery.data ? (
            <Pill tone={configQuery.data.active ? "success" : "neutral"}>
              Configuração salva · {configQuery.data.environment}
            </Pill>
          ) : (
            <Pill tone="neutral">Ainda não configurado</Pill>
          )}
        </section>
      </div>
    </div>
  );
}
