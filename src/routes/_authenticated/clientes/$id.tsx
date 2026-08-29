import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl, dateFmt, initials, timeFmt } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente — Aura Clínicas" },
      { name: "description", content: "Histórico de atendimentos, pacotes e anamnese do cliente." },
      { property: "og:title", content: "Ficha do cliente — Aura Clínicas" },
      { property: "og:description", content: "Histórico, pacotes e anamnese do cliente." },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = useParams({ from: "/_authenticated/clientes/$id" });
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [openAnamnese, setOpenAnamnese] = useState(false);

  const query = useQuery({
    enabled: !!membership,
    queryKey: ["client", id],
    queryFn: async () => {
      const [client, appointments, packages, anamnesis] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase
          .from("appointments")
          .select("id, starts_at, status, price, services(name), professionals(name)")
          .eq("client_id", id)
          .order("starts_at", { ascending: false })
          .limit(30),
        supabase.from("client_packages").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase
          .from("anamnesis_responses")
          .select("id, created_at, answers, signed_at")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (client.error) throw client.error;
      return {
        client: client.data,
        appointments: appointments.data ?? [],
        packages: packages.data ?? [],
        anamnesis: anamnesis.data ?? [],
      };
    },
  });

  if (query.isLoading) return <SkeletonCard />;
  if (query.error) return <EmptyState title="Cliente não encontrado" description="Verifique o link." />;

  const { client, appointments, packages, anamnesis } = query.data!;
  const totalSpent = appointments
    .filter((a) => a.status === "atendido")
    .reduce((acc, a) => acc + Number(a.price), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Voltar
      </Link>

      <div className="surface mb-6 flex flex-wrap items-center gap-4 p-5">
        <div className="grid size-14 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
          {initials(client.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold">{client.name}</h1>
          <p className="text-xs text-muted-foreground">
            {client.phone ?? "sem telefone"} · {client.email ?? "sem e-mail"}
            {client.birth_date ? ` · nasc. ${dateFmt(client.birth_date)}` : ""}
          </p>
        </div>
        {client.origin ? <Pill tone="primary">{client.origin}</Pill> : null}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Atendimentos" value={String(appointments.length)} />
        <StatCard label="Total gasto" value={brl(totalSpent)} tone="success" />
        <StatCard label="Pacotes ativos" value={String(packages.filter((p) => p.active).length)} tone="gold" />
      </div>

      <Tabs defaultValue="historico">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="mt-4">
          {appointments.length === 0 ? (
            <EmptyState title="Sem atendimentos" description="Os agendamentos deste cliente aparecerão aqui." />
          ) : (
            <ul className="surface divide-y divide-border p-0">
              {appointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {dateFmt(a.starts_at)} {timeFmt(a.starts_at)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.services?.name ?? "Procedimento"}</p>
                    <p className="text-xs text-muted-foreground">{a.professionals?.name ?? "—"}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{brl(Number(a.price))}</span>
                  <Pill tone={a.status === "atendido" ? "success" : "neutral"}>{a.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="pacotes" className="mt-4 space-y-3">
          {packages.length === 0 ? (
            <EmptyState title="Nenhum pacote" description="Venda pacotes em Procedimentos para controlar sessões." />
          ) : (
            packages.map((p) => (
              <div key={p.id} className="surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <Pill tone={p.active ? "success" : "neutral"}>{p.active ? "ativo" : "encerrado"}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.sessions_used} de {p.sessions_total} sessões usadas · {brl(Number(p.price))}
                  {p.expires_at ? ` · válido até ${dateFmt(p.expires_at)}` : ""}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (p.sessions_used / Math.max(1, p.sessions_total)) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="anamnese" className="mt-4 space-y-3">
          <Dialog open={openAnamnese} onOpenChange={setOpenAnamnese}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Nova anamnese
              </Button>
            </DialogTrigger>
            <AnamnesisDialog
              clientId={id}
              onDone={() => {
                setOpenAnamnese(false);
                queryClient.invalidateQueries({ queryKey: ["client", id] });
              }}
            />
          </Dialog>
          {anamnesis.length === 0 ? (
            <EmptyState
              title="Sem fichas de anamnese"
              description="Registre queixas, alergias e histórico de saúde antes do primeiro procedimento."
            />
          ) : (
            anamnesis.map((a) => (
              <div key={a.id} className="surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Ficha de {dateFmt(a.created_at)}</p>
                  <Pill tone={a.signed_at ? "success" : "gold"}>
                    {a.signed_at ? "assinada" : "sem assinatura"}
                  </Pill>
                </div>
                <dl className="mt-3 space-y-1.5 text-xs">
                  {Object.entries((a.answers ?? {}) as Record<string, string>).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="w-32 shrink-0 text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                      <dd className="flex-1 text-pretty">{String(v) || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="dados" className="mt-4">
          <div className="surface space-y-2 p-5 text-sm">
            <Row label="CPF" value={client.cpf} />
            <Row label="Telefone" value={client.phone} />
            <Row label="E-mail" value={client.email} />
            <Row label="Endereço" value={client.address} />
            <Row label="Origem" value={client.origin} />
            <Row label="Observações" value={client.notes} />
            <Row label="Cadastro" value={dateFmt(client.created_at)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 border-b border-border pb-2 last:border-0">
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-pretty">{value || "—"}</span>
    </div>
  );
}

const FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "queixa_principal", label: "Queixa principal", long: true },
  { key: "alergias", label: "Alergias" },
  { key: "medicamentos", label: "Medicamentos em uso" },
  { key: "cirurgias", label: "Cirurgias prévias" },
  { key: "gestante", label: "Gestante ou lactante" },
  { key: "observacoes", label: "Observações clínicas", long: true },
];

function AnamnesisDialog({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { data: membership } = useMembership();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("anamnesis_responses").insert({
        organization_id: membership.organization.id,
        client_id: clientId,
        answers,
        signature_data: signature || null,
        signed_at: signature ? new Date().toISOString() : null,
        signed_by: signature ? (auth.user?.id ?? null) : null,
      });
      if (error) throw error;
      toast.success("Anamnese registrada.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Ficha de anamnese</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.long ? (
              <Textarea
                id={field.key}
                rows={2}
                value={answers[field.key] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [field.key]: e.target.value })}
              />
            ) : (
              <Input
                id={field.key}
                value={answers[field.key] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [field.key]: e.target.value })}
              />
            )}
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="signature">Assinatura do cliente (nome completo)</Label>
          <Input
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Assinatura digital por consentimento"
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar ficha
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
