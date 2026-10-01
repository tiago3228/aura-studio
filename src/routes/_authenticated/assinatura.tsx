import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CreditCard, Check, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";

import { getBilling, startProSubscription, cancelProSubscription } from "@/lib/billing.functions";
import { getPixInfo, declarePixPayment } from "@/lib/pix.functions";
import { brl, dateFmt } from "@/lib/format";
import { PageHeader, Surface, SkeletonCard, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura PRO — Aura Clínicas" },
      {
        name: "description",
        content: "Plano PRO por R$ 49,90/mês com 30 dias grátis e cancelamento livre.",
      },
      { property: "og:title", content: "Assinatura PRO — Aura Clínicas" },
      { property: "og:description", content: "Gestão completa da clínica por R$ 49,90 por mês." },
    ],
  }),
  component: Assinatura,
});

const STATUS: Record<string, { label: string; tone: "primary" | "success" | "gold" | "neutral" }> =
  {
    trialing: { label: "Período de teste", tone: "primary" },
    pending: { label: "Aguardando cartão", tone: "gold" },
    active: { label: "Ativa", tone: "success" },
    paused: { label: "Pausada", tone: "gold" },
    past_due: { label: "Pagamento recusado", tone: "gold" },
    canceled: { label: "Cancelada", tone: "neutral" },
  };

const BENEFITS = [
  "Agenda ilimitada com autoagendamento online",
  "Procedimentos ilimitados",
  "Clientes, prontuário e anamnese digital",
  "Financeiro, comissões e estoque",
  "Assistente de IA com dados da clínica",
  "Cancelamento a qualquer momento, sem multa",
];

const PIX_STATUS: Record<string, string> = {
  pending: "Aguardando liberação",
  approved: "Liberado",
  rejected: "Recusado",
};

function Assinatura() {
  const load = useServerFn(getBilling);
  const start = useServerFn(startProSubscription);
  const cancel = useServerFn(cancelProSubscription);
  const loadPix = useServerFn(getPixInfo);
  const declarePix = useServerFn(declarePixPayment);
  const [busy, setBusy] = useState(false);
  const [pixNote, setPixNote] = useState("");

  const billing = useQuery({ queryKey: ["billing"], queryFn: () => load({}) });
  const pix = useQuery({ queryKey: ["pix"], queryFn: () => loadPix({}) });

  if (billing.isLoading) return <SkeletonCard />;

  const sub = billing.data?.subscription;
  const status = STATUS[sub?.status ?? "trialing"] ?? STATUS["trialing"]!;
  const canManage = billing.data?.isAdmin ?? false;
  const pendingPix = pix.data?.payments.find((p) => p.status === "pending");

  async function copyPix() {
    await navigator.clipboard.writeText(pix.data?.pixKey ?? "");
    toast.success("Chave Pix copiada.");
  }

  async function informPix() {
    setBusy(true);
    try {
      const res = await declarePix({ data: { months: 1, note: pixNote || undefined } });
      if (res.ok) {
        toast.success(res.message);
        setPixNote("");
        pix.refetch();
      } else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao informar o pagamento.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe() {
    setBusy(true);
    try {
      const res = await start({ data: { backUrl: `${window.location.origin}/assinatura` } });
      if (res.ok) window.location.href = res.url;
      else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar assinatura.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelNow() {
    if (!confirm("Cancelar a assinatura? Você mantém o acesso até o fim do período pago.")) return;
    setBusy(true);
    try {
      const res = await cancel({});
      if (res.ok) {
        toast.success(res.message);
        billing.refetch();
      } else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Assinatura" subtitle="Plano PRO — R$ 49,90/mês com 30 dias grátis." />

      <Surface className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Aura PRO</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {brl(49.9)} por mês · acesso ilimitado a todos os módulos
            </p>
          </div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>

        <ul className="space-y-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {b}
            </li>
          ))}
        </ul>

        <div className="grid gap-3 rounded-lg bg-muted p-4 text-xs sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Fim do período de teste</p>
            <p className="font-semibold">{sub?.trial_ends_at ? dateFmt(sub.trial_ends_at) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Próxima cobrança</p>
            <p className="font-semibold">
              {sub?.status === "canceled"
                ? "Cancelada"
                : sub?.current_period_end
                  ? dateFmt(sub.current_period_end)
                  : "—"}
            </p>
          </div>
        </div>

        {!billing.data?.configured ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Pagamento em configuração: o cadastro de cartão será liberado assim que a integração for
            concluída.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={subscribe} disabled={busy || !canManage || !billing.data?.configured}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            {sub?.status === "active" ? "Gerenciar cartão" : "Cadastrar cartão e assinar"}
          </Button>
          {sub && sub.status !== "canceled" ? (
            <Button variant="outline" onClick={cancelNow} disabled={busy || !canManage}>
              Cancelar assinatura
            </Button>
          ) : null}
        </div>
        {!canManage ? (
          <p className="text-xs text-muted-foreground">
            Apenas proprietária ou gerente pode gerenciar o plano.
          </p>
        ) : null}
      </Surface>

      <Surface className="mt-6 space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <QrCode className="size-5 text-primary" /> Pagar via Pix
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Copie a chave, pague {brl(pix.data?.amount ?? 49.9)} e avise: a liberação é feita
              manualmente pela administração.
            </p>
          </div>
          {pendingPix ? <Pill tone="gold">Aguardando liberação</Pill> : null}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {pix.data?.pixKey ?? "—"}
          </span>
          <Button size="sm" variant="outline" onClick={copyPix}>
            <Copy className="size-4" /> Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tipo da chave: e-mail · Titular: administração Aura.
        </p>

        <Textarea
          rows={2}
          placeholder="Observação (opcional): nome de quem pagou, horário do Pix..."
          value={pixNote}
          onChange={(e) => setPixNote(e.target.value)}
          disabled={!canManage || !!pendingPix}
        />
        <Button
          onClick={informPix}
          disabled={busy || !canManage || !!pendingPix}
          variant="secondary"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Já paguei via Pix
        </Button>

        {(pix.data?.payments.length ?? 0) > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {pix.data!.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{brl(Number(p.amount))}</span>
                <span className="text-xs text-muted-foreground">
                  {PIX_STATUS[p.status] ?? p.status} · {dateFmt(p.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {pix.data?.isPlatformAdmin ? (
          <Link
            to="/pix-admin"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Abrir painel de liberação Pix
          </Link>
        ) : null}
      </Surface>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-semibold">Histórico</h2>
        {(billing.data?.events.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
        ) : (
          <ul className="surface divide-y divide-border p-0">
            {billing.data!.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="capitalize">{e.kind.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">
                  {e.amount ? `${brl(Number(e.amount))} · ` : ""}
                  {e.status ?? ""} · {dateFmt(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
