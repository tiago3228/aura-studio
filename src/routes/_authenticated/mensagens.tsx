import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquareText, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole } from "@/lib/session";
import { MESSAGE_EVENTS } from "@/lib/messages";
import { EmptyState, PageHeader, SkeletonCard, Surface } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({
    meta: [
      { title: "Modelos de mensagens — Aura Clínicas" },
      {
        name: "description",
        content: "Gerencie modelos de mensagens e abra o WhatsApp para revisão manual.",
      },
      { property: "og:title", content: "Modelos de mensagens — Aura Clínicas" },
      {
        property: "og:description",
        content: "Modelos de mensagens personalizados para a comunicação da clínica.",
      },
    ],
  }),
  component: MessageTemplatesPage,
});

type MessageTemplateEditor = {
  id?: string;
  event: string;
  name: string;
  body: string;
  active: boolean;
};

const STANDARD_EVENTS = new Set<string>(MESSAGE_EVENTS.map((event) => event.value));

function MessageTemplatesPage() {
  const { data: membership, isLoading: membershipLoading } = useMembership();
  const queryClient = useQueryClient();
  const organizationId = membership?.organization.id;
  const canEdit = isAdminRole(membership?.role);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<MessageTemplateEditor | null>(null);
  const [saving, setSaving] = useState(false);

  const templates = useQuery({
    enabled: !!organizationId,
    queryKey: ["custom-message-models", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, event, name, body, active, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((template) => !STANDARD_EVENTS.has(template.event));
    },
  });

  const modelRows = useMemo(() => templates.data ?? [], [templates.data]);
  const filteredModels = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return modelRows;
    return modelRows.filter((template) =>
      `${template.name} ${template.body}`.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [modelRows, search]);

  async function refresh() {
    await templates.refetch();
  }

  function createModel() {
    setEditor({
      event: `custom_${crypto.randomUUID()}`,
      name: "",
      body: "",
      active: true,
    });
  }

  function editModel(template: (typeof modelRows)[number]) {
    setEditor({
      id: template.id,
      event: template.event,
      name: template.name,
      body: template.body,
      active: template.active,
    });
  }

  async function invalidateModels() {
    if (!organizationId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["custom-message-models", organizationId] }),
      queryClient.invalidateQueries({ queryKey: ["message-templates", organizationId] }),
    ]);
  }

  async function saveModel() {
    if (!organizationId || !editor || !canEdit) return;
    if (!editor.name.trim() || !editor.body.trim()) {
      toast.error("Informe o nome e o texto do modelo.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: editor.name.trim(),
        body: editor.body,
        active: editor.active,
      };
      const result = editor.id
        ? await supabase
            .from("message_templates")
            .update(payload)
            .eq("id", editor.id)
            .eq("organization_id", organizationId)
        : await supabase.from("message_templates").insert({
            ...payload,
            event: editor.event,
            organization_id: organizationId,
          });
      if (result.error) throw result.error;
      await invalidateModels();
      setEditor(null);
      toast.success("Modelo salvo.");
    } catch {
      toast.error("Não foi possível salvar o modelo. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(template: (typeof modelRows)[number], active: boolean) {
    if (!organizationId || !canEdit) return;
    const { error } = await supabase
      .from("message_templates")
      .update({ active })
      .eq("id", template.id)
      .eq("organization_id", organizationId);
    if (error) {
      toast.error("Não foi possível atualizar o modelo.");
      return;
    }
    await invalidateModels();
  }

  if (membershipLoading) return <SkeletonCard />;
  if (!membership) {
    return (
      <EmptyState
        title="Organização indisponível"
        description="Entre novamente na clínica para consultar os modelos de mensagens."
      />
    );
  }
  if (templates.isLoading) return <SkeletonCard />;
  if (templates.error) {
    return (
      <EmptyState
        title="Não foi possível carregar os modelos"
        description="Atualize a página e tente novamente."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Modelos de Mensagens"
        subtitle="Organize os textos usados na comunicação com clientes da clínica."
      />

      <Surface className="space-y-2 p-4">
        <div className="flex items-start gap-2">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p>
              Os modelos podem usar <code>@@cliente</code>, <code>@@profissional</code>,{" "}
              <code>@@data</code>, <code>@@horário</code> e <code>@@clínica</code>.
            </p>
            <p className="text-xs text-muted-foreground">
              O envio continua manual: revise o texto antes de abrir o WhatsApp. Na ficha do
              cliente, sem um agendamento específico, o Aura usa o último agendamento até hoje,
              quando houver.
            </p>
          </div>
        </div>
      </Surface>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou texto"
            aria-label="Buscar modelos de mensagem"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
          {canEdit ? (
            <Button type="button" onClick={createModel}>
              <Plus className="size-4" /> Novo modelo
            </Button>
          ) : null}
        </div>
      </div>

      {modelRows.length === 0 ? (
        <EmptyState
          title="Nenhum modelo personalizado"
          description="Os modelos importados do Estetic aparecerão aqui após serem carregados para esta clínica."
        />
      ) : filteredModels.length === 0 ? (
        <EmptyState
          title="Nenhum resultado"
          description="Tente outro nome ou trecho de mensagem."
        />
      ) : (
        <div className="space-y-3">
          {filteredModels.map((template) => {
            const sourceCode = template.event.match(/^estetic_model_(\d+)$/)?.[1];
            return (
              <Surface key={template.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {sourceCode ? (
                        <span className="rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary">
                          Estetic · {sourceCode}
                        </span>
                      ) : null}
                      <h2 className="font-display text-base font-semibold">{template.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.active ? "Ativo para seleção no envio" : "Inativo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={template.active}
                      disabled={!canEdit}
                      onCheckedChange={(active) => void setActive(template, active)}
                      aria-label={`${template.active ? "Desativar" : "Ativar"} ${template.name}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canEdit}
                      onClick={() => editModel(template)}
                    >
                      <Pencil className="size-4" /> Editar
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {template.body}
                </p>
              </Surface>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !saving) setEditor(null);
        }}
      >
        {editor ? (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editor.id ? "Editar modelo" : "Novo modelo de mensagem"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="message-model-name">Nome</Label>
                <Input
                  id="message-model-name"
                  value={editor.name}
                  maxLength={120}
                  onChange={(event) =>
                    setEditor((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message-model-body">Mensagem</Label>
                <Textarea
                  id="message-model-body"
                  rows={9}
                  value={editor.body}
                  onChange={(event) =>
                    setEditor((current) =>
                      current ? { ...current, body: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="message-model-active">Disponível no envio pelo WhatsApp</Label>
                <Switch
                  id="message-model-active"
                  checked={editor.active}
                  onCheckedChange={(active) =>
                    setEditor((current) => (current ? { ...current, active } : current))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setEditor(null)}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={saving} onClick={() => void saveModel()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar modelo
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
