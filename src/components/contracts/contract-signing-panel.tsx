import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export type SigningSession = {
  contract: {
    id: string;
    title: string;
    content: string;
    templateVersion: number | null;
    status: string;
    sentAt: string | null;
    viewedAt: string | null;
    signedAt: string | null;
    expiresAt: string | null;
    documentHash: string | null;
  };
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
  terms: Array<{
    acceptanceId: string;
    termId: string;
    termVersion: number;
    termContentHash: string;
    accepted: boolean;
    acceptedAt: string | null;
    revokedAt: string | null;
    term: {
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      content: string;
      version: number;
      content_hash: string;
      published_at: string | null;
    };
  }>;
  acceptance: {
    id: string;
    accepted: boolean;
    acceptedAt: string | null;
    signerName: string | null;
    signerEmail: string | null;
  };
};

type ContractSigningPanelProps = { token: string };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function ContractSigningPanel({ token }: ContractSigningPanelProps) {
  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({});

  const session = useQuery({
    queryKey: ["contract-signing-session", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("contract-signing-session", {
        body: { token },
      });
      if (error) throw error;
      return data as SigningSession;
    },
    enabled: token.length >= 32,
    retry: false,
  });

  const acceptanceMutation = useMutation({
    mutationFn: async () => {
      if (!session.data) throw new Error("Sessão de assinatura indisponível.");
      const { data, error } = await supabase.functions.invoke("contract-acceptance", {
        body: {
          token,
          accepted: true,
          signerName: signerName.trim(),
          signerDocument: signerDocument.trim() || null,
          signerEmail: signerEmail.trim() || null,
          signerPhone: signerPhone.trim() || null,
          signatureMethod: "digitada",
        },
      });
      if (error) throw error;
      return data as { ok: boolean; contractCompleted: boolean; acceptedAt: string };
    },
    onSuccess: (data) => {
      toast.success(
        data.contractCompleted
          ? "Contrato assinado com sucesso."
          : "Aceite registrado com sucesso.",
      );
      void session.refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o aceite.");
    },
  });

  const terms = session.data?.terms ?? [];
  const allTermsAccepted = terms.every((item) => item.accepted || acceptedTerms[item.acceptanceId]);
  const canSubmit =
    signerName.trim().length >= 2 && allTermsAccepted && !acceptanceMutation.isPending;

  if (session.isPending) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Carregando contrato seguro...
        </CardContent>
      </Card>
    );
  }

  if (session.isError || !session.data) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <h1 className="text-xl font-semibold">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este link pode ter expirado, sido cancelado ou não ser válido. Solicite um novo link à
            clínica.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { contract, client, acceptance } = session.data;
  const completed = acceptance.accepted || contract.status === "assinado";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="size-5" />
                {contract.title}
              </CardTitle>
              <CardDescription>Documento apresentado para assinatura digital.</CardDescription>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {contract.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-5">
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Cliente: {client.name}</span>
              <span>Versão {contract.templateVersion ?? "—"}</span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-7">{contract.content}</div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold">Termos de aceite</h2>
              <p className="text-sm text-muted-foreground">Leia cada termo antes de confirmar.</p>
            </div>
            {terms.map((item) => (
              <div key={item.acceptanceId} className="rounded-lg border p-4">
                <h3 className="font-medium">{item.term.title}</h3>
                {item.term.summary && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.term.summary}</p>
                )}
                <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm leading-6">
                  {item.term.content}
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox
                    checked={item.accepted || acceptedTerms[item.acceptanceId] === true}
                    disabled={item.accepted || completed}
                    onCheckedChange={(checked) =>
                      setAcceptedTerms((current) => ({
                        ...current,
                        [item.acceptanceId]: checked === true,
                      }))
                    }
                  />
                  <span>
                    Li e aceito o termo “{item.term.title}”, versão {item.termVersion}.
                  </span>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            {completed ? "Aceite concluído" : "Confirmar assinatura"}
          </CardTitle>
          <CardDescription>
            {completed
              ? `Registrado em ${formatDate(acceptance.acceptedAt)}`
              : "Os dados são protegidos e o conteúdo da assinatura não é armazenado."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completed ? (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> O contrato foi aceito. Você pode
              fechar esta página.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="signer-name">Nome completo *</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signer-document">CPF ou documento</Label>
                <Input
                  id="signer-document"
                  value={signerDocument}
                  onChange={(event) => setSignerDocument(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signer-email">E-mail</Label>
                <Input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(event) => setSignerEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signer-phone">Telefone</Label>
                <Input
                  id="signer-phone"
                  value={signerPhone}
                  onChange={(event) => setSignerPhone(event.target.value)}
                  autoComplete="tel"
                />
              </div>
              <Separator />
              <p className="text-xs leading-5 text-muted-foreground">
                Ao confirmar, você declara que leu o contrato e os termos, e concorda com o registro
                eletrônico deste aceite.
              </p>
              <Button
                className="w-full"
                disabled={!canSubmit}
                onClick={() => acceptanceMutation.mutate()}
              >
                {acceptanceMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  "Aceitar e assinar"
                )}
              </Button>
              {!allTermsAccepted && (
                <p className="text-xs text-destructive">Marque todos os termos para continuar.</p>
              )}
            </>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Expira em {formatDate(contract.expiresAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
