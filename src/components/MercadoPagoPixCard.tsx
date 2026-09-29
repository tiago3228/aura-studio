import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, ExternalLink, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Surface, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { brl, dateFmt } from "@/lib/format";
import {
  createMercadoPagoPixPayment,
  getMyMercadoPagoPixPayments,
  type AuraPixPayment,
} from "@/lib/mercadopago-pix.functions";
import { PRO_PRICE } from "@/lib/billing.functions";

const STATUS: Record<string, string> = {
  pending: "Aguardando pagamento",
  in_process: "Em processamento",
  approved: "Pagamento aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
};

export function MercadoPagoPixCard({ canManage }: { canManage: boolean }) {
  const [selected, setSelected] = useState<AuraPixPayment | null>(null);
  const queryClient = useQueryClient();
  const load = useServerFn(getMyMercadoPagoPixPayments);
  const create = useServerFn(createMercadoPagoPixPayment);
  const payments = useQuery({
    queryKey: ["mercadopago-pix-payments"],
    queryFn: () => load({}),
    refetchInterval: 8_000,
  });
  const mutation = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: (result) => {
      setSelected(result.payment);
      void queryClient.invalidateQueries({ queryKey: ["mercadopago-pix-payments"] });
      toast.success(
        result.reused ? "Abrimos o Pix pendente." : "QR Code Pix gerado pelo Mercado Pago.",
      );
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o Pix.");
    },
  });

  const latest = payments.data?.payments[0] ?? null;
  const payment =
    (selected && payments.data?.payments.find((item) => item.id === selected.id)) ??
    selected ??
    latest;
  const isPending = payment && ["pending", "in_process"].includes(payment.status);

  async function copyCode() {
    if (!payment?.qrCode) return;
    await navigator.clipboard.writeText(payment.qrCode);
    toast.success("Pix Copia e Cola copiado.");
  }

  return (
    <Surface className="mt-6 space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <QrCode className="size-5 text-primary" /> Pagar via Pix Mercado Pago
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pague {brl(payment?.amount ?? PRO_PRICE)} pelo QR Code. A confirmação e a liberação são
            automáticas após a aprovação do Mercado Pago.
          </p>
        </div>
        {payment ? (
          <Pill tone={payment.status === "approved" ? "success" : "gold"}>
            {STATUS[payment.status] ?? payment.status}
          </Pill>
        ) : null}
      </div>

      {!payment ? (
        <Button onClick={() => mutation.mutate()} disabled={!canManage || mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <QrCode className="size-4" />
          )}
          Gerar QR Code Pix
        </Button>
      ) : (
        <div className="space-y-3">
          {payment.qrCodeBase64 ? (
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${payment.qrCodeBase64}`}
                alt="QR Code Pix da assinatura Aura PRO"
                className="size-52 rounded-lg border p-2"
              />
            </div>
          ) : null}

          {payment.qrCode ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pix Copia e Cola</p>
              <p className="mt-1 max-h-24 overflow-y-auto break-all rounded-lg bg-muted p-2 text-[11px]">
                {payment.qrCode}
              </p>
              <Button variant="outline" className="mt-2" onClick={copyCode}>
                <Copy className="size-4" /> Copiar código Pix
              </Button>
            </div>
          ) : null}

          {payment.ticketUrl ? (
            <Button asChild variant="outline">
              <a href={payment.ticketUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Abrir instruções
              </a>
            </Button>
          ) : null}

          {payment.status === "approved" ? (
            <p className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm">
              <Check className="size-4 text-primary" /> Assinatura liberada automaticamente.
            </p>
          ) : isPending ? (
            <p className="text-xs text-muted-foreground">
              A tela consulta o status automaticamente. Não gere outro Pix enquanto este estiver
              pendente.
            </p>
          ) : (
            <Button onClick={() => mutation.mutate()} disabled={!canManage || mutation.isPending}>
              Gerar novo Pix
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Gerado em {dateFmt(payment.createdAt)} · status:{" "}
            {STATUS[payment.status] ?? payment.status}
          </p>
        </div>
      )}

      {!canManage ? (
        <p className="text-xs text-muted-foreground">
          Apenas proprietária ou gerente pode pagar a assinatura.
        </p>
      ) : null}
    </Surface>
  );
}
