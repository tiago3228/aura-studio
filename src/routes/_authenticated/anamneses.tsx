/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Copy,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { generateAnamnesisModel } from "@/lib/anamnesis-ai.functions";

export const Route = createFileRoute("/_authenticated/anamneses")({
  head: () => ({ meta: [{ title: "Modelos de anamnese — Aura Clínicas" }] }),
  component: Anamneses,
});

type Question = {
  id?: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  follow_up_label?: string;
};
type Template = {
  id: string;
  name: string;
  active: boolean;
  service_id: string | null;
  questions?: Question[];
};
const importedModels: Array<{ code: number; name: string; kind: string; questions: Question[] }> = [
  {
    code: 9,
    name: "Anamnese – Depilação a Laser",
    kind: "geral",
    questions: [
      { label: "Doenças existentes", type: "texto" },
      { label: "Uso de medicamentos contínuos", type: "texto" },
      {
        label: "Uso de ácidos, isotretinoína (Roacutan) ou medicamentos fotossensibilizantes",
        type: "texto",
      },
      { label: "Histórico de alergias", type: "texto" },
      { label: "Gestante ou lactante", type: "sim_nao", required: true },
      {
        label: "Diabetes, epilepsia ou problemas hormonais",
        type: "multipla_escolha",
        options: ["Diabetes", "Epilepsia", "Problemas hormonais"],
      },
      { label: "Histórico de câncer de pele", type: "texto" },
      { label: "Herpes ativa, feridas ou infecções na pele", type: "texto" },
    ],
  },
  {
    code: 8,
    name: "Anamnese Corporal – Lipo Enzimática, Secagem de Vasinhos e Tratamento de Estrias",
    kind: "corporal",
    questions: [
      { label: "Doenças existentes", type: "texto" },
      { label: "Uso de medicamentos contínuos", type: "texto" },
      { label: "Uso de anticoagulantes ou anti-inflamatórios", type: "texto" },
      { label: "Histórico de alergias medicamentosas", type: "texto" },
      { label: "Gestante ou lactante", type: "sim_nao", required: true },
      {
        label: "Diabetes, hipertensão, hipotensão ou problemas cardíacos",
        type: "multipla_escolha",
        options: ["Diabetes", "Hipertensão", "Hipotensão", "Problemas cardíacos"],
      },
    ],
  },
  {
    code: 7,
    name: "Anamnese Preenchimento, Bioestimulador e Fios de PDO",
    kind: "facial",
    questions: [
      { label: "Doenças existentes", type: "texto" },
      { label: "Uso de medicamentos contínuos", type: "texto" },
      { label: "Uso de anticoagulantes ou anti-inflamatórios", type: "texto" },
      { label: "Histórico de alergias medicamentosas", type: "texto" },
      { label: "Reações anteriores a preenchedores ou anestésicos", type: "texto" },
      {
        label: "Doenças autoimunes",
        type: "multipla_escolha",
        options: ["Diabetes", "Epilepsia", "Problemas hormonais"],
      },
      { label: "Tendência a queloides", type: "texto" },
      { label: "Herpes ativa ou infecção na pele", type: "texto" },
      { label: "Gestante ou lactante", type: "sim_nao", required: true },
    ],
  },
  {
    code: 6,
    name: "Anamnese Botox",
    kind: "facial",
    questions: [
      { label: "Doenças existentes", type: "texto" },
      { label: "Uso de medicamentos contínuos", type: "texto" },
      { label: "Uso de anticoagulantes ou anti-inflamatórios", type: "texto" },
      { label: "Alergia a toxina botulínica ou componentes da fórmula", type: "texto" },
      { label: "Procedimentos estéticos anteriores", type: "texto" },
      { label: "Doenças neuromusculares", type: "texto" },
      { label: "Gestante ou lactante", type: "sim_nao", required: true },
    ],
  },
  {
    code: 5,
    name: "Anamnese Limpeza de pele, Microagulhamento e Peelings",
    kind: "facial",
    questions: [
      { label: "Doenças existentes", type: "texto" },
      { label: "Uso de medicamentos contínuos", type: "texto" },
      {
        label: "Uso de ácidos, isotretinoína (Roacutan) ou medicamentos fotossensibilizantes",
        type: "texto",
      },
      { label: "Histórico de alergias", type: "texto" },
      { label: "Gestante ou lactante", type: "sim_nao", required: true },
      { label: "Herpes ativa, feridas ou infecções na pele", type: "texto" },
      { label: "Exposição solar recente", type: "sim_nao" },
    ],
  },
];
const questionTypes = [
  { value: "texto", label: "Texto" },
  { value: "texto_longo", label: "Área de texto" },
  { value: "sim_nao", label: "Sim/não" },
  { value: "multipla_escolha", label: "Múltipla escolha" },
  { value: "selecao", label: "Seleção" },
  { value: "data", label: "Data" },
  { value: "numero", label: "Número" },
];

function Anamneses() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const isOwner = membership?.role === "owner";
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [editor, setEditor] = useState<Template | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const client = supabase as any;
  const query = useQuery({
    enabled: Boolean(orgId),
    queryKey: ["anamnesis-templates", orgId],
    queryFn: async () => {
      const { data, error } = await client
        .from("anamnesis_templates")
        .select(
          "id,name,active,service_id,anamnesis_questions(id,label,type,options,required,follow_up_label,position)",
        )
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((item: any) => ({
        ...item,
        questions: (item.anamnesis_questions ?? []).sort(
          (a: any, b: any) => a.position - b.position,
        ),
      }));
    },
  });
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((item: Template) =>
        item.name.toLowerCase().includes(term.toLowerCase()),
      ),
    [query.data, term],
  );
  const importMutation = useMutation({
    mutationFn: async () => {
      const existing = new Set((query.data ?? []).map((item: Template) => item.name));
      for (const model of importedModels) {
        if (existing.has(model.name)) continue;
        const { data: template, error } = await client
          .from("anamnesis_templates")
          .insert({ organization_id: orgId, name: model.name, active: true })
          .select("id")
          .single();
        if (error) throw error;
        const { error: questionsError } = await client.from("anamnesis_questions").insert(
          model.questions.map((question, position) => ({
            organization_id: orgId,
            template_id: template.id,
            label: question.label,
            type: question.type,
            options: question.options ?? [],
            required: question.required ?? false,
            follow_up_label: question.follow_up_label ?? "Quais? / Justifique?",
            position,
          })),
        );
        if (questionsError) throw questionsError;
      }
    },
    onSuccess: () => {
      toast.success("Modelos do Estetic importados sem duplicar os existentes.");
      void qc.invalidateQueries({ queryKey: ["anamnesis-templates", orgId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível importar os modelos."),
  });
  const deleteMutation = useMutation({
    mutationFn: async (template: Template) => {
      const { error } = await client
        .from("anamnesis_templates")
        .delete()
        .eq("id", template.id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo excluído.");
      void qc.invalidateQueries({ queryKey: ["anamnesis-templates", orgId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "A exclusão não foi permitida."),
  });
  if (query.error) return <ErrorState message={(query.error as Error).message} />;
  if (!query.data) return <SkeletonCard lines={5} />;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Modelos de anamnese"
        subtitle="Crie fichas reutilizáveis para coletar informações clínicas antes dos procedimentos."
        actions={
          <>
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw className="size-4" /> Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}{" "}
              Importar modelos do Estetic
            </Button>
            <Button variant="outline" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-4" /> Gerar modelo por IA
            </Button>
            <Button
              onClick={() =>
                setEditor({ id: "new", name: "", active: true, service_id: null, questions: [] })
              }
            >
              <Plus className="size-4" /> Novo modelo
            </Button>
          </>
        }
      />
      <div className="surface mb-5 flex items-center gap-2 p-4">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar modelo"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="surface p-5">
          <EmptyState
            title="Nenhum modelo cadastrado"
            description="Importe os cinco modelos iniciais ou crie uma ficha personalizada."
            action={
              <Button onClick={() => importMutation.mutate()}>
                <Copy className="size-4" /> Importar modelos
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((template: Template) => (
            <article key={template.id} className="surface p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gold-soft text-gold">
                  <ClipboardList className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{template.name}</h2>
                    <Pill tone={template.active ? "success" : "neutral"}>
                      {template.active ? "Ativo" : "Inativo"}
                    </Pill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {template.questions?.length ?? 0} perguntas configuradas
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditor(template)}>
                  <Edit3 className="size-4" /> Editar
                </Button>
                {isOwner && template.id !== "new" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Excluir este modelo? As respostas existentes serão preservadas, mas perderão o vínculo com o modelo.",
                        )
                      )
                        deleteMutation.mutate(template);
                    }}
                  >
                    <Trash2 className="size-4" /> Excluir
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <TemplateEditor
        open={Boolean(editor)}
        template={editor}
        orgId={orgId}
        onClose={() => setEditor(null)}
        onDone={() => {
          setEditor(null);
          void qc.invalidateQueries({ queryKey: ["anamnesis-templates", orgId] });
        }}
      />
      <AiAnamnesisDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onGenerated={(generated) => {
          setAiOpen(false);
          setEditor({
            id: "new",
            name: generated.name,
            active: true,
            service_id: null,
            questions: generated.questions,
          });
        }}
      />
    </div>
  );
}

function AiAnamnesisDialog({
  open,
  onOpenChange,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (model: { name: string; questions: Question[] }) => void;
}) {
  const generate = useServerFn(generateAnamnesisModel);
  const [procedure, setProcedure] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (procedure.trim().length < 3 || loading) return;
    setLoading(true);
    try {
      const generated = await generate({ data: { procedure: procedure.trim() } });
      toast.success("Rascunho criado. Revise as perguntas antes de salvar.");
      onGenerated(generated);
      setProcedure("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o modelo.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="size-5 text-gold" /> Gerar modelo por IA
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg bg-gold-soft p-3 text-sm text-muted-foreground">
            Informe o procedimento e a IA criará um rascunho com perguntas clínicas relacionadas.
            Você poderá editar, remover e adicionar perguntas antes de salvar.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-procedure">Procedimento</Label>
            <Input
              id="ai-procedure"
              value={procedure}
              onChange={(event) => setProcedure(event.target.value)}
              placeholder="Ex.: Limpeza de pele com peeling de diamante"
              minLength={3}
              maxLength={160}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              A IA não substitui a avaliação ou revisão da profissional responsável.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || procedure.trim().length < 3}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "Gerando…" : "Criar rascunho"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({
  open,
  template,
  orgId,
  onClose,
  onDone,
}: {
  open: boolean;
  template: Template | null;
  orgId: string | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const client = supabase as any;
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  useMemo(() => {
    if (template) {
      setName(template.name);
      setActive(template.active);
      setQuestions(template.questions ?? []);
    }
  }, [template]);
  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!template || !orgId || !name.trim()) return;
    setSaving(true);
    try {
      let id = template.id;
      if (id === "new") {
        const { data, error } = await client
          .from("anamnesis_templates")
          .insert({ organization_id: orgId, name: name.trim(), active })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await client
          .from("anamnesis_templates")
          .update({ name: name.trim(), active })
          .eq("id", id)
          .eq("organization_id", orgId);
        if (error) throw error;
        await client
          .from("anamnesis_questions")
          .delete()
          .eq("template_id", id)
          .eq("organization_id", orgId);
      }
      const { error: questionsError } = await client.from("anamnesis_questions").insert(
        questions
          .filter((q) => q.label.trim())
          .map((q, position) => ({
            organization_id: orgId,
            template_id: id,
            label: q.label.trim(),
            type: q.type,
            options: q.options ?? [],
            required: q.required ?? false,
            follow_up_label:
              q.type === "sim_nao"
                ? q.follow_up_label?.trim() || "Quais? / Justifique?"
                : "Quais? / Justifique?",
            position,
          })),
      );
      if (questionsError) throw questionsError;
      toast.success("Modelo de anamnese salvo.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o modelo.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {template?.id === "new" ? "Novo modelo de anamnese" : "Editar modelo de anamnese"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label>Nome do modelo</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Ex.: Avaliação facial"
              />
            </div>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />{" "}
              Modelo ativo
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Perguntas</h3>
                <p className="text-xs text-muted-foreground">
                  A ordem será mantida na ficha do cliente.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setQuestions([...questions, { label: "", type: "texto", options: [] }])
                }
              >
                <Plus className="size-4" /> Pergunta
              </Button>
            </div>
            {questions.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Adicione perguntas ou importe um modelo do Estetic.
              </div>
            )}
            {questions.map((question, index) => (
              <div
                key={`${index}-${question.label}`}
                className="rounded-lg border border-border p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    value={question.label}
                    onChange={(event) => updateQuestion(index, { label: event.target.value })}
                    placeholder="Pergunta"
                  />
                  <select
                    value={question.type}
                    onChange={(event) => {
                      const type = event.target.value;
                      updateQuestion(index, {
                        type,
                        ...(type === "sim_nao"
                          ? { follow_up_label: question.follow_up_label || "Quais? / Justifique?" }
                          : {}),
                      });
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {["multipla_escolha", "selecao"].includes(question.type) && (
                  <Input
                    className="mt-2"
                    value={(question.options ?? []).join(", ")}
                    onChange={(event) =>
                      updateQuestion(index, {
                        options: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Opções separadas por vírgula"
                  />
                )}
                {question.type === "sim_nao" ? (
                  <div className="mt-2 space-y-1.5 rounded-md border border-dashed border-primary/30 bg-primary-soft/20 p-2">
                    <Label className="text-xs">Pergunta quando a resposta for Sim</Label>
                    <Input
                      value={question.follow_up_label ?? "Quais? / Justifique?"}
                      onChange={(event) =>
                        updateQuestion(index, { follow_up_label: event.target.value })
                      }
                      placeholder="Quais? / Justifique?"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      O cliente verá um campo de texto com esta pergunta somente se marcar Sim.
                    </p>
                  </div>
                ) : null}
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={question.required ?? false}
                    onChange={(event) => updateQuestion(index, { required: event.target.checked })}
                  />{" "}
                  Resposta obrigatória
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar modelo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
