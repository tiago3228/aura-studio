import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowRight, CheckCircle2, Loader2, Plus, UsersRound } from "lucide-react";
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
  stage: string;
  created_at: string;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);

  const leads = useQuery({
    enabled: !!orgId,
    queryKey: ["crm-leads", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_leads")
        .select("id,name,whatsapp,email,source,stage,created_at")
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

  const grouped = useMemo(
    () =>
      STAGES.map(([key, label]) => ({
        key,
        label,
        leads: (leads.data ?? []).filter((lead) => lead.stage === key),
      })),
    [leads.data],
  );
  const metrics = {
    total: leads.data?.length ?? 0,
    converted: leads.data?.filter((x) => ["converteu", "fidelizado"].includes(x.stage)).length ?? 0,
    lost: leads.data?.filter((x) => x.stage === "perdido").length ?? 0,
    followUps: followUps.data?.length ?? 0,
  };

  async function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      organization_id: orgId,
      name: String(form.get("name")),
      whatsapp: String(form.get("whatsapp") || "") || null,
      email: String(form.get("email") || "") || null,
      source: String(form.get("source") || "") || null,
      notes: String(form.get("notes") || "") || null,
      first_contact_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any).from("crm_leads").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lead criado no funil.");
    setDialogOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["crm-leads", orgId] });
  }

  async function moveLead(lead: Lead, stage: string) {
    const { error } = await (supabase as any).from("crm_leads").update({ stage }).eq("id", lead.id);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["crm-leads", orgId] });
  }

  async function finishFollowUp(id: string) {
    const { error } = await (supabase as any)
      .from("crm_follow_ups")
      .update({ status: "concluido", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Follow-up concluído.");
    await queryClient.invalidateQueries({ queryKey: ["crm-follow-ups", orgId] });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="CRM"
        subtitle="Acompanhe a jornada completa dos seus leads e clientes."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Novo lead
          </Button>
        }
      />
      <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-foreground">
        <strong>CRM em construção:</strong> esta primeira versão já traz dashboard, cadastro de
        leads, funil e follow-ups. Novos módulos serão liberados gradualmente.
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid w-full grid-cols-3 sm:w-auto sm:grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="funil">Funil de vendas</TabsTrigger>
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
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Leads recentes</h2>
                <p className="text-sm text-muted-foreground">Últimos cadastros recebidos no CRM.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTab("funil")}>
                Ver funil
              </Button>
            </div>
            {leads.isLoading ? (
              <SkeletonCard />
            ) : (
              leads.data?.slice(0, 5).map((lead) => (
                <div className="flex items-center gap-3 border-t border-border py-3" key={lead.id}>
                  <div className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary">
                    <UsersRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.whatsapp ?? lead.email ?? "Sem contato"}
                    </p>
                  </div>
                  <Pill>{STAGES.find(([key]) => key === lead.stage)?.[1] ?? lead.stage}</Pill>
                </div>
              ))
            )}
            {!leads.isLoading && !leads.data?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum lead cadastrado ainda.
              </p>
            ) : null}
          </div>
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
                      <select
                        className="mt-3 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        value={lead.stage}
                        onChange={(event) => moveLead(lead, event.target.value)}
                        aria-label={`Mover ${lead.name}`}
                      >
                        <option disabled value={lead.stage}>
                          {column.label}
                        </option>
                        {STAGES.map(([key, label]) => (
                          <option value={key} key={key}>
                            {label}
                          </option>
                        ))}
                      </select>
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
                    <p className="text-sm font-medium">{followUp.title}</p>
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
            {!followUps.isLoading && !followUps.data?.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum follow-up pendente.
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Novo lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={createLead} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">Nome completo</Label>
              <Input id="lead-name" name="name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">WhatsApp</Label>
                <Input id="lead-phone" name="whatsapp" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">E-mail</Label>
                <Input id="lead-email" name="email" type="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-source">Origem</Label>
              <Input id="lead-source" name="source" placeholder="Instagram, indicação..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-notes">Observações</Label>
              <Textarea id="lead-notes" name="notes" rows={3} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null} Criar lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
