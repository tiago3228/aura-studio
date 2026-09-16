import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
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
import { useServerFn } from "@tanstack/react-start";
import { convertCrmLead } from "@/lib/secure-actions.functions";
import { useMembership } from "@/lib/session";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
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
  head: () => ({
    meta: [
      { title: "CRM — Aura Clínicas" },
      { name: "description", content: "Gestão de leads, funil comercial, contatos, follow-ups e retenção de clientes." },
      { property: "og:title", content: "CRM — Aura Clínicas" },
      { property: "og:description", content: "Gestão comercial e retenção para clínicas de estética." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
type RetentionClient = {
  id: string;
  name: string;
  phone: string | null;
  last_attended: string;
  last_service: string | null;
  total_spent: number;
};
type Interaction = {
  id: string;
  lead_id: string | null;
  type: string;
  subject: string | null;
  description: string;
  result: string | null;
  occurred_at: string;
};
type AppointmentSummary = {
  client_id: string | null;
  starts_at: string;
  price: number;
  services: { name: string } | null;
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
  const convertCrmLeadFn = useServerFn(convertCrmLead);
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
    staleTime: 60_000,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id,name,whatsapp,email,source,notes,stage,client_id,created_at")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const followUps = useQuery({
    enabled: !!orgId,
    queryKey: ["crm-follow-ups", orgId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("crm_follow_ups")
        .select("id,title,description,due_at,status,lead_id,client_id")
        .eq("organization_id", orgId)
        .eq("status", "pendente")
        .order("due_at");
      if (error) throw error;
      return data;
    },
  });
  const interactions = useQuery({
    enabled: !!orgId,
    queryKey: ["crm-interactions", orgId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("crm_interactions")
        .select("id,lead_id,type,subject,description,result,occurred_at")
        .eq("organization_id", orgId)
        .order("occurred_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
  const retention = useQuery({
    enabled: !!orgId,
    queryKey: ["crm-retention", orgId],
    queryFn: async () => {
      const [clientsResult, settingsResult, appointmentsResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id,name,phone")
          .eq("organization_id", orgId ?? "")
          .is("deleted_at", null)
          .order("name"),
        supabase
          .from("crm_retention_settings")
          .select("inactivity_days,return_days")
          .eq("organization_id", orgId ?? "")
          .maybeSingle(),
        supabase
          .from("appointments")
          .select("client_id,starts_at,status,price,services(name)")
          .eq("organization_id", orgId ?? "")
          .eq("status", "atendido")
          .order("starts_at", { ascending: false }),
      ]);
      if (clientsResult.error) throw clientsResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;
      const inactivityDays = settingsResult.data?.inactivity_days ?? 60;
      const returnDays = settingsResult.data?.return_days ?? 30;
      const cutoff = Date.now() - inactivityDays * 86400000;
      const returnCutoff = Date.now() - returnDays * 86400000;
      const byClient = new Map<string, AppointmentSummary[]>();
      for (const appointment of appointmentsResult.data ?? []) {
        if (!appointment.client_id) continue;
        const list = byClient.get(appointment.client_id) ?? [];
        list.push(appointment);
        byClient.set(appointment.client_id, list);
      }
      const toRetentionClient = (
        client: { id: string; name: string; phone: string | null },
        history: AppointmentSummary[],
      ): RetentionClient => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        last_attended: history[0].starts_at,
        last_service: history[0].services?.name ?? null,
        total_spent: history.reduce((sum, item) => sum + Number(item.price), 0),
      });
      const inactive = (clientsResult.data ?? []).flatMap((client) => {
        const history = byClient.get(client.id) ?? [];
        const last = history[0];
        return last && new Date(last.starts_at).getTime() <= cutoff
          ? [toRetentionClient(client, history)]
          : [];
      });
      const pendingReturns = (clientsResult.data ?? []).flatMap((client) => {
        const history = byClient.get(client.id) ?? [];
        const last = history[0];
        const date = last ? new Date(last.starts_at).getTime() : 0;
        return last && date <= returnCutoff && date > cutoff
          ? [toRetentionClient(client, history)]
          : [];
      });
      return { inactive, pendingReturns, inactivityDays, returnDays };
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
    void queryClient.invalidateQueries({ queryKey: ["crm-interactions", orgId] });
    void queryClient.invalidateQueries({ queryKey: ["crm-retention", orgId] });
  };
  async function moveLead(lead: Lead, stage: string) {
    if (!orgId) return;
    const { error } = await supabase
      .from("crm_leads")
      .update({ stage })
      .eq("organization_id", orgId)
      .eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Etapa atualizada.");
    invalidate();
  }
  async function convertLead(lead: Lead) {
    try {
      const data = await convertCrmLeadFn({ data: { leadId: lead.id } });
      toast.success(`${data?.name ?? lead.name} convertido em cliente.`);
    } catch {
      toast.error("Não foi possível converter o lead.");
      return;
    }
    invalidate();
  }
  async function finishFollowUp(id: string) {
    if (!orgId) return;
    const { error } = await supabase
      .from("crm_follow_ups")
      .update({ status: "concluido", completed_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Follow-up concluído.");
    invalidate();
  }
  function openReactivation(client: RetentionClient) {
    if (!client.phone) {
      toast.error("Este cliente não possui telefone cadastrado.");
      return;
    }
    const message = `Olá, ${client.name}! Sentimos sua falta. Já faz um tempo desde seu último atendimento. Gostaria de verificar nossos horários disponíveis?`;
    window.open(
      `https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  async function createRetentionFollowUp(client: RetentionClient) {
    if (!orgId) return;
    const { error } = await supabase.from("crm_follow_ups").insert({
      organization_id: orgId,
      client_id: client.id,
      title: `Reativar ${client.name}`,
      description: `Retorno recomendado após ${client.last_service ?? "último atendimento"}.`,
      due_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Follow-up de reativação criado.");
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
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid w-full grid-cols-5 sm:w-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="retencao">Retenção</TabsTrigger>
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
                  <Pill tone={key === "converteu" ? "success" : "neutral"}>{label}</Pill>
                  {index < 7 ? <ArrowRight className="size-3 text-muted-foreground" /> : null}
                </div>
              ))}
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Atividades recentes</h2>
            {interactions.isLoading ? <SkeletonCard /> : null}
            {interactions.isError ? <ErrorState message="Não foi possível carregar os contatos recentes." /> : null}
            {!interactions.isLoading && !interactions.isError && interactions.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum contato registrado.</p>
            ) : null}
            <div className="divide-y divide-border">
              {(interactions.data ?? []).slice(0, 6).map((interaction) => {
                const lead = leads.data?.find((item) => item.id === interaction.lead_id);
                return (
                  <div key={interaction.id} className="flex items-start gap-3 py-3">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{interaction.subject ?? "Contato registrado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead?.name ?? "Cliente convertido"} · {interaction.type} · {new Date(interaction.occurred_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-1 text-sm text-pretty">{interaction.description}</p>
                    </div>
                  </div>
                );
              })}
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
          ) : leads.isError ? (
            <ErrorState message="Não foi possível carregar os leads." />
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
                          onClick={() => {
                            setEditingLead(lead);
                            setLeadDialog(true);
                          }}
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
            ) : followUps.isError ? (
              <ErrorState message="Não foi possível carregar os follow-ups." />
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
            {!followUps.isLoading && !followUps.isError && !followUps.data?.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum follow-up pendente.
              </p>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="retencao" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface p-4">
              <p className="text-xs text-muted-foreground">Clientes inativos</p>
              <p className="mt-2 text-2xl font-semibold">{retention.data?.inactive.length ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sem atendimento há {retention.data?.inactivityDays ?? 60} dias
              </p>
            </div>
            <div className="surface p-4">
              <p className="text-xs text-muted-foreground">Retornos recomendados</p>
              <p className="mt-2 text-2xl font-semibold">
                {retention.data?.pendingReturns.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Após {retention.data?.returnDays ?? 30} dias do atendimento
              </p>
            </div>
          </div>
          <div className="surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="size-5 text-gold" />
              <div>
                <h2 className="font-display text-lg font-semibold">Clientes inativos</h2>
                <p className="text-sm text-muted-foreground">
                  Inicie uma ação de reativação ou crie um acompanhamento.
                </p>
              </div>
            </div>
            {retention.isLoading ? (
              <SkeletonCard />
            ) : retention.isError ? (
              <ErrorState message="Não foi possível analisar a retenção." />
            ) : (
              retention.data?.inactive.map((client) => (
                <RetentionRow
                  client={client}
                  key={client.id}
                  onWhatsApp={openReactivation}
                  onFollowUp={createRetentionFollowUp}
                />
              ))
            )}
            {!retention.isLoading && !retention.data?.inactive.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum cliente inativo no período configurado.
              </p>
            ) : null}
          </div>
          <div className="surface p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Retornos pendentes</h2>
            {retention.data?.pendingReturns.map((client) => (
              <RetentionRow
                client={client}
                key={client.id}
                onWhatsApp={openReactivation}
                onFollowUp={createRetentionFollowUp}
              />
            ))}
            {!retention.data?.pendingReturns.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum retorno pendente.
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={leadDialog} onOpenChange={setLeadDialog}>
        {orgId ? <LeadDialog
          lead={editingLead}
          orgId={orgId}
          onDone={() => {
            setLeadDialog(false);
            invalidate();
          }}
        /> : null}
      </Dialog>
      <Dialog open={!!contactLead} onOpenChange={(open) => !open && setContactLead(null)}>
        {contactLead && orgId ? (
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
        {followUpLead && orgId ? (
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

function RetentionRow({
  client,
  onWhatsApp,
  onFollowUp,
}: {
  client: RetentionClient;
  onWhatsApp: (client: RetentionClient) => void;
  onFollowUp: (client: RetentionClient) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border py-3 first:border-t-0">
      <div className="min-w-44 flex-1">
        <p className="font-medium">{client.name}</p>
        <p className="text-xs text-muted-foreground">
          Último atendimento: {new Date(client.last_attended).toLocaleDateString("pt-BR")} ·{" "}
          {client.last_service ?? "Procedimento"}
        </p>
      </div>
      <Pill tone="gold">R$ {client.total_spent.toFixed(2).replace(".", ",")} acumulado</Pill>
      <Button size="sm" variant="outline" onClick={() => onWhatsApp(client)}>
        <MessageSquare className="size-4" /> WhatsApp
      </Button>
      <Button size="sm" onClick={() => onFollowUp(client)}>
        Criar follow-up
      </Button>
    </div>
  );
}

function LeadDialog({
  lead,
  orgId,
  onDone,
}: {
  lead: Lead | null;
  orgId: string;
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
    setSaving(true);
    const payload = {
      name: form.name,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      source: form.source || null,
      notes: form.notes || null,
    };
    const result = lead
      ? await supabase.from("crm_leads").update(payload).eq("organization_id", orgId).eq("id", lead.id)
      : await supabase.from("crm_leads").insert({
          ...payload,
          organization_id: orgId,
          first_contact_at: new Date().toISOString(),
        });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
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
  orgId: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("crm_interactions").insert({
      organization_id: orgId,
      lead_id: lead.id,
      type: String(form.get("type")),
      subject: String(form.get("subject") || "") || null,
      description: String(form.get("description")),
      result: String(form.get("result") || "") || null,
      next_action: String(form.get("next_action") || "") || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
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
  orgId: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("crm_follow_ups").insert({
      organization_id: orgId,
      lead_id: lead.id,
      title: String(form.get("title")),
      description: String(form.get("description") || "") || null,
      due_at: new Date(String(form.get("due_at"))).toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
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
