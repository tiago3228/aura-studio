import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Filter, Plus, RefreshCw, Search, Star } from "lucide-react";
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
import { useMembership, useSession } from "@/lib/session";

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

function Contratos() {
  const { data: membership } = useMembership();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const organizationId = membership?.organization.id;
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "updated_at">("name");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", content: "" });

  const templatesQuery = useQuery({
    enabled: Boolean(organizationId),
    queryKey: ["contract-templates", organizationId],
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
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contract-templates", organizationId] });
      setForm({ name: "", description: "", content: "" });
      setNewOpen(false);
      toast.success("Modelo de contrato criado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o modelo."),
  });

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

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Modelos de Contratos"
        subtitle="Crie documentos padronizados para enviar, aceitar e assinar com segurança."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> Novo modelo
          </Button>
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
                <Button onClick={() => setNewOpen(true)}>
                  <Plus className="size-4" /> Novo modelo
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Versão</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-4 font-medium tabular-nums text-muted-foreground">
                      {template.code ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <FileSignature className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Star className="size-3" /> Modelo Aura
                          </p>
                        </div>
                      </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Novo modelo de contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => createTemplate.mutate()}
              disabled={createTemplate.isPending}
            >
              {createTemplate.isPending ? "Salvando..." : "Salvar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
