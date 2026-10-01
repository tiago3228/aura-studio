import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit3,
  FileSignature,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { hasPermission, useMembership, useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos — Aura Clínicas" },
      { name: "description", content: "Modelos de contratos e documentos da clínica." },
    ],
  }),
  component: Contratos,
});

type Template = {
  id: string;
  code: number | null;
  name: string;
  description: string | null;
  content: string;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateForm = {
  name: string;
  description: string;
  content: string;
  active: boolean;
};

const emptyForm: TemplateForm = { name: "", description: "", content: "", active: true };

function Contratos() {
  const { data: membership } = useMembership();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const organizationId = membership?.organization.id;
  const canCreate = hasPermission(membership, "contratos.criar");
  // Modelos podem ser ajustados por qualquer usuário autenticado da clínica.
  const canEdit = Boolean(membership);
  // “Administrador master” corresponde ao proprietário da organização (role owner).
  const canDelete = membership?.role === "owner";
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "updated_at">("name");
  const [dialogMode, setDialogMode] = useState<"new" | "edit" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);

  const templatesQuery = useQuery({
    enabled: Boolean(organizationId),
    queryKey: ["contract-templates", organizationId, sortBy],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("id, code, name, description, content, version, active, created_at, updated_at")
        .eq("organization_id", organizationId!)
        .order(sortBy, { ascending: true });
      if (error) throw error;
      return data as Template[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user?.id) throw new Error("Sessão da clínica indisponível.");
      const name = form.name.trim();
      const content = form.content.trim();
      if (!name || !content) throw new Error("Informe o nome e o conteúdo do modelo.");

      const { error } = await supabase.from("contract_templates").insert({
        organization_id: organizationId,
        created_by: user.id,
        name,
        description: form.description.trim() || null,
        content,
        variables: [],
        version: 1,
        active: form.active,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contract-templates", organizationId] });
      closeDialog();
      toast.success("Modelo de contrato criado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o modelo."),
  });

  const updateTemplate = useMutation({
    mutationFn: async () => {
      if (!organizationId || !selectedTemplate)
        throw new Error("Modelo de contrato não selecionado.");
      const name = form.name.trim();
      const content = form.content.trim();
      if (!name || !content) throw new Error("Informe o nome e o conteúdo do modelo.");

      const { error } = await supabase
        .from("contract_templates")
        .update({
          name,
          description: form.description.trim() || null,
          content,
          active: form.active,
          version: selectedTemplate.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contract-templates", organizationId] });
      closeDialog();
      toast.success("Modelo de contrato atualizado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o modelo."),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (template: Template) => {
      if (!organizationId) throw new Error("Sessão da clínica indisponível.");
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", template.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contract-templates", organizationId] });
      toast.success("Modelo de contrato excluído.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o modelo."),
  });

  function openNewDialog() {
    setSelectedTemplate(null);
    setForm(emptyForm);
    setDialogMode("new");
  }

  function openEditDialog(template: Template) {
    if (!canEdit) return;
    setSelectedTemplate(template);
    setForm({
      name: template.name,
      description: template.description ?? "",
      content: template.content,
      active: template.active,
    });
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedTemplate(null);
    setForm(emptyForm);
  }

  function requestDelete(template: Template) {
    if (!canDelete || deleteTemplate.isPending) return;
    const confirmed = window.confirm(
      `Excluir o modelo “${template.name}”? Esta ação não poderá ser desfeita.`,
    );
    if (confirmed) deleteTemplate.mutate(template);
  }

  const filteredTemplates = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    return (templatesQuery.data ?? []).filter((template) => {
      const matchesSearch =
        !normalized ||
        template.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
        template.description?.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesSearch && (!activeOnly || template.active);
    });
  }, [activeOnly, search, templatesQuery.data]);

  if (templatesQuery.error)
    return <ErrorState message="Não foi possível carregar os modelos de contratos." />;
  if (!templatesQuery.data) return <SkeletonCard lines={4} />;

  const dialogIsOpen = dialogMode !== null;
  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const isEditing = dialogMode === "edit";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Modelos de Contratos"
        subtitle="Clique em um modelo para editar, ativar ou desativar."
        actions={
          canCreate ? (
            <Button onClick={openNewDialog}>
              <Plus className="size-4" /> Novo modelo
            </Button>
          ) : null
        }
      />

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative min-w-64 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar modelos"
              className="pl-9"
              aria-label="Buscar modelos de contratos"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveOnly((value) => !value)}
            >
              <Filter className="size-4" /> {activeOnly ? "Ativos" : "Filtrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void templatesQuery.refetch()}
              disabled={templatesQuery.isFetching}
            >
              <RefreshCw className={templatesQuery.isFetching ? "size-4 animate-spin" : "size-4"} />{" "}
              Atualizar
            </Button>
            <label className="sr-only" htmlFor="contract-sort">
              Ordenar modelos
            </label>
            <select
              id="contract-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "name" | "updated_at")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="name">Ordenar por nome</option>
              <option value="updated_at">Ordenar por atualização</option>
            </select>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhum modelo encontrado"
              description={
                search || activeOnly
                  ? "Ajuste os filtros ou crie um novo modelo."
                  : "Comece criando o primeiro modelo de contrato da clínica."
              }
              action={
                canCreate ? (
                  <Button onClick={openNewDialog}>
                    <Plus className="size-4" /> Novo modelo
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Versão</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Atualizado</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-4 font-medium tabular-nums text-muted-foreground">
                      {template.code ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => openEditDialog(template)}
                        disabled={!canEdit}
                      >
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <FileSignature className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium hover:underline">{template.name}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Star className="size-3" /> Modelo Aura
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-muted-foreground">
                      {template.description ?? "Sem descrição"}
                    </td>
                    <td className="px-5 py-4 tabular-nums">v{template.version}</td>
                    <td className="px-5 py-4">
                      <Pill tone={template.active ? "success" : "neutral"}>
                        {template.active ? "Ativo" : "Inativo"}
                      </Pill>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                        new Date(template.updated_at),
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(template)}
                            title="Editar modelo"
                          >
                            <Edit3 className="size-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => requestDelete(template)}
                            disabled={deleteTemplate.isPending}
                            title="Excluir modelo"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        ) : null}
                        {!canEdit && !canDelete ? (
                          <MoreHorizontal className="mt-2 size-4 text-muted-foreground" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialogIsOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditing ? "Editar modelo de contrato" : "Novo modelo de contrato"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isEditing && selectedTemplate?.code !== null ? (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Código {selectedTemplate?.code} · a identificação do catálogo não pode ser alterada.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome</Label>
              <Input
                id="template-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex.: Contrato de procedimento estético"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição</Label>
              <Input
                id="template-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Quando este modelo deve ser usado?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-content">Conteúdo do contrato</Label>
              <Textarea
                id="template-content"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Digite o conteúdo que será apresentado ao cliente..."
                rows={16}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
              />{" "}
              Modelo ativo e disponível para uso
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => (isEditing ? updateTemplate.mutate() : createTemplate.mutate())}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
