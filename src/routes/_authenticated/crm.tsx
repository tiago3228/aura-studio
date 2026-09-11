/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "CRM — Aura Clínicas" }] }),
  component: CrmPage,
});

type Lead = {
  id: string;
  name: string;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  notes?: string | null;
  stage: string;
  created_at: string;
  client_id?: string | null;
};
type FollowUp = {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  status: string;
  lead_id: string | null;
  client_id: string | null;
};
const STAGES = [
  ["novo_lead", "Novo lead"],
  ["primeiro_contato", "Primeiro contato"],
  ["interessado", "Interessado"],
  ["orcamento_enviado", "Orçamento enviado"],
  ["aguardando_resposta", "Aguardando resposta"],
  ["agendou", "Agendou"],
  ["compareceu", "Compareceu"],
  ["converteu", "Converteu"],
  ["fidelizado", "Fidelizado"],
  ["perdido", "Perdido"],
] as const;

function CrmPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [leadDialog, setLeadDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [contactLead, setContactLead] = useState<Lead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [term, setTerm] = useState("");
  const leads = useQuery({
    enabled: !!orgId,
    queryKey: ["crm-leads", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_leads")
        .select("id,name,whatsapp,email,source,notes,stage,client_id,created_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });
  const followUps = useQuery({
    enabled: !!orgId,
    queryKey: ["crm-follow-ups", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_follow_ups")
        .select("id,title,description,due_at,status,lead_id,client_id")
        .eq("status", "pendente")
        .order("due_at");
      if (error) throw error;
      return (data ?? []) as FollowUp[];
    },
  });
  const filteredLeads = (leads.data ?? []).filter((lead) =>
    `${lead.name} ${lead.whatsapp ?? ""} ${lead.email ?? ""} ${lead.source ?? ""}`
      .toLowerCase()
      .includes(term.toLowerCase()),
  );
  const grouped = useMemo(
    () =>
      STAGES.map(([key, label]) => ({
        key,
        label,
        leads: filteredLeads.filter((lead) => lead.stage === key),
      })),
    [filteredLeads],
  );
  const metrics = {
    total: leads.data?.length ?? 0,
    converted: leads.data?.filter((x) => ["converteu", "fidelizado"].includes(x.stage)).length ?? 0,
    lost: leads.data?.filter((x) => x.stage === "perdido").length ?? 0,
    followUps: followUps.data?.length ?? 0,
  };
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["crm-leads", orgId] });
    void queryClient.invalidateQueries({ queryKey: ["crm-follow-ups", orgId] });
  };
  async function moveLead(lead: Lead, stage: string) {
    const { error } = await (supabase as any).from("crm_leads").update({ stage }).eq("id", lead.id);
    if (error) return toast.error(error.message);
    invalidate();
  }
  async function convertLead(lead: Lead) {
    const { data, error } = await (supabase as any).rpc("crm_convert_lead", { _lead_id: lead.id });
    if (error) return toast.error(error.message);
    toast.success(`${data?.name ?? lead.name} convertido em cliente.`);
    invalidate();
  }
  async function finishFollowUp(id: string) {
    const { error } = await (supabase as any)
      .from("crm_follow_ups")
      .update({ status: "concluido", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Follow-up concluído.");
    invalidate();
  }
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="CRM"
        subtitle="Acompanhe a jornada completa dos seus leads e clientes."
        actions={
          <Button
            onClick={() => {
              setEditingLead(null);
              setLeadDialog(true);
            }}
          >
            <Plus className="size-4" /> Novo lead
          </Button>
        }
      />
      <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
        <strong>CRM em evolução:</strong> leads, funil, contatos e follow-ups já estão disponíveis
        nesta etapa.
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid w-full grid-cols-4 sm:w-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Leads cadastrados", metrics.total],
              ["Leads convertidos", metrics.converted],
              ["Leads perdidos", metrics.lost],
              ["Follow-ups pendentes", metrics.followUps],
            ].map(([label, value]) => (
              <div className="surface p-4" key={label as string}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="surface p-5">
            <h2 className="mb-1 font-display text-lg font-semibold">Jornada do cliente</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Lead → primeiro contato → agendamento → atendimento → fidelização
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {STAGES.slice(0, 8).map(([key, label], index) => (
                <div className="flex items-center gap-2" key={key}>
                  <Pill tone={key === "converteu" ? "green" : "muted"}>{label}</Pill>
                  {index < 7 ? <ArrowRight className="size-3 text-muted-foreground" /> : null}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="leads" className="space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, WhatsApp, e-mail ou origem"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>
          {leads.isLoading ? (
            <SkeletonCard />
          ) : (
            <div className="surface divide-y divide-border">
              {filteredLeads.map((lead) => (
                <div className="flex flex-wrap items-center gap-3 p-4" key={lead.id}>
                  <div className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-44 flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.whatsapp ?? lead.email ?? "Sem contato"}{" "}
                      {lead.source ? ` · ${lead.source}` : ""}
                    </p>
                  </div>
                  <Pill>{STAGES.find(([key]) => key === lead.stage)?.[1] ?? lead.stage}</Pill>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar lead"
                      onClick={() => {
                        setEditingLead(lead);
                        setLeadDialog(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Registrar contato"
                      onClick={() => setContactLead(lead)}
                    >
                      <MessageSquare className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setFollowUpLead(lead)}>
                      Follow-up
                    </Button>
                    {lead.stage !== "converteu" && lead.stage !== "fidelizado" ? (
                      <Button size="sm" onClick={() => convertLead(lead)}>
                        Converter
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!filteredLeads.length ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  Nenhum lead encontrado.
                </p>
              ) : null}
            </div>
          )}
        </TabsContent>
        <TabsContent value="funil">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {grouped.map((column) => (
              <div className="min-w-64 flex-1 rounded-xl bg-muted/50 p-3" key={column.key}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{column.label}</h3>
                  <span className="text-xs text-muted-foreground">{column.leads.length}</span>
                </div>
                <div className="space-y-2">
                  {column.leads.map((lead) => (
                    <div
                      className="rounded-lg border border-border bg-background p-3 shadow-sm"
                      key={lead.id}
                    >
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lead.whatsapp ?? lead.email ?? "Sem contato"}
                      </p>
                      <div className="mt-3 flex gap-1">
                        <select
                          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                          value={lead.stage}
                          onChange={(event) => moveLead(lead, event.target.value)}
                          aria-label={`Mover ${lead.name}`}
                        >
                          {STAGES.map(([key, label]) => (
                            <option value={key} key={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingLead(lead)}
                          title="Editar lead"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="followups">
          <div className="surface divide-y divide-border p-2">
            {followUps.isLoading ? (
              <SkeletonCard />
            ) : (
              followUps.data?.map((followUp) => (
                <div className="flex items-center gap-3 p-4" key={followUp.id}>
                  <div className="grid size-9 place-items-center rounded-full bg-gold/15 text-gold">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{followUp.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {followUp.description ?? "Sem descrição"} ·{" "}
                      {new Date(followUp.due_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => finishFollowUp(followUp.id)}>
                    Concluir
                  </Button>
                </div>
              ))
            )}
            {!followUps.data?.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum follow-up pendente.
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={leadDialog} onOpenChange={setLeadDialog}>
        <LeadDialog
          lead={editingLead}
          orgId={orgId}
          onDone={() => {
            setLeadDialog(false);
            invalidate();
          }}
        />
      </Dialog>
      <Dialog open={!!contactLead} onOpenChange={(open) => !open && setContactLead(null)}>
        {contactLead ? (
          <InteractionDialog
            lead={contactLead}
            orgId={orgId}
            onDone={() => {
              setContactLead(null);
              invalidate();
            }}
          />
        ) : null}
      </Dialog>
      <Dialog open={!!followUpLead} onOpenChange={(open) => !open && setFollowUpLead(null)}>
        {followUpLead ? (
          <FollowUpDialog
            lead={followUpLead}
            orgId={orgId}
            onDone={() => {
              setFollowUpLead(null);
              invalidate();
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function LeadDialog({
  lead,
  orgId,
  onDone,
}: {
  lead: Lead | null;
  orgId?: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    whatsapp: lead?.whatsapp ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? "",
    notes: lead?.notes ?? "",
  });
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const payload = {
      name: form.name,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      source: form.source || null,
      notes: form.notes || null,
    };
    const result = lead
      ? await (supabase as any).from("crm_leads").update(payload).eq("id", lead.id)
      : await (supabase as any).from("crm_leads").insert({
          ...payload,
          organization_id: orgId,
          first_contact_at: new Date().toISOString(),
        });
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(lead ? "Lead atualizado." : "Lead criado no funil.");
    onDone();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Origem</Label>
          <Input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="Instagram, indicação..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function InteractionDialog({
  lead,
  orgId,
  onDone,
}: {
  lead: Lead;
  orgId?: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const { error } = await (supabase as any).from("crm_interactions").insert({
      organization_id: orgId,
      lead_id: lead.id,
      type: String(form.get("type")),
      subject: String(form.get("subject") || "") || null,
      description: String(form.get("description")),
      result: String(form.get("result") || "") || null,
      next_action: String(form.get("next_action") || "") || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contato registrado no histórico.");
    onDone();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar contato · {lead.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <select
            name="type"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="ligacao">Ligação</option>
            <option value="email">E-mail</option>
            <option value="mensagem">Mensagem</option>
            <option value="observacao">Observação</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Assunto</Label>
          <Input name="subject" />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea name="description" required rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Resultado</Label>
          <Input name="result" />
        </div>
        <div className="space-y-1.5">
          <Label>Próxima ação</Label>
          <Input name="next_action" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Registrar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function FollowUpDialog({
  lead,
  orgId,
  onDone,
}: {
  lead: Lead;
  orgId?: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const { error } = await (supabase as any).from("crm_follow_ups").insert({
      organization_id: orgId,
      lead_id: lead.id,
      title: String(form.get("title")),
      description: String(form.get("description") || "") || null,
      due_at: new Date(String(form.get("due_at"))).toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Follow-up criado.");
    onDone();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo follow-up · {lead.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Assunto</Label>
          <Input name="title" required placeholder="Retorno do orçamento" />
        </div>
        <div className="space-y-1.5">
          <Label>Data e hora</Label>
          <Input name="due_at" type="datetime-local" required />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea name="description" rows={3} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Criar follow-up
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
