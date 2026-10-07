import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  LockKeyhole,
  Pencil,
  Plus,
  RotateCcw,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { dateFmt, timeFmt } from "@/lib/format";
import {
  buildDashboardNoteCompletionPatch,
  canManageDashboardNote,
  canViewDashboardNote,
  filterDashboardNotes,
  isDashboardNoteOverdue,
} from "@/lib/note-management";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { NoteDialog, type DashboardNote } from "@/components/dashboard/note-dialog";

export const Route = createFileRoute("/_authenticated/anotacoes")({
  head: () => ({
    meta: [
      { title: "Anotações — Aura Clínicas" },
      { name: "description", content: "Notas, lembretes e tarefas da equipe da clínica." },
    ],
  }),
  component: Anotacoes,
});

type NoteFilter = "pendentes" | "concluidas" | "todas";

function Anotacoes() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NoteFilter>("pendentes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardNote | null>(null);
  const orgId = membership?.organization.id;
  const notesQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard-notes", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("dashboard_notes")
        .select("*")
        .eq("organization_id", orgId)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DashboardNote[];
    },
  });

  const notes = notesQuery.data ?? [];
  const visibleNotes = notes.filter((note) => canViewDashboardNote(note, membership?.userId));
  const filteredNotes = filterDashboardNotes(visibleNotes, filter);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["dashboard-notes", orgId] });
  }

  async function setCompleted(note: DashboardNote) {
    let completionPatch;
    try {
      completionPatch = buildDashboardNoteCompletionPatch(
        note,
        membership?.userId,
        new Date().toISOString(),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar a anotação.",
      );
      return;
    }
    const { error } = await supabase
      .from("dashboard_notes")
      .update(completionPatch)
      .eq("id", note.id);
    if (error) {
      toast.error("Não foi possível atualizar a anotação.");
      return;
    }
    toast.success(completionPatch.completed_at ? "Anotação concluída." : "Anotação reaberta.");
    refresh();
  }

  async function deleteNote(note: DashboardNote) {
    const confirmed = window.confirm(
      `Excluir a anotação “${note.title}”? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    const { error } = await supabase.from("dashboard_notes").delete().eq("id", note.id);
    if (error) {
      toast.error("Não foi possível excluir a anotação.");
      return;
    }
    toast.success("Anotação excluída.");
    refresh();
  }

  if (notesQuery.isLoading) return <SkeletonCard lines={3} />;
  if (notesQuery.error) return <ErrorState message={(notesQuery.error as Error).message} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Anotações"
        subtitle="Organize lembretes pessoais e compartilhe notas com a equipe."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Nova anotação
          </Button>
        }
      />

      <div
        className="mb-5 flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Filtrar anotações"
      >
        {(
          [
            [
              "pendentes",
              `Pendentes (${visibleNotes.filter((note) => !note.completed_at).length})`,
            ],
            [
              "concluidas",
              `Concluídas (${visibleNotes.filter((note) => !!note.completed_at).length})`,
            ],
            ["todas", `Todas (${visibleNotes.length})`],
          ] as [NoteFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredNotes.length === 0 ? (
        <EmptyState
          title={filter === "concluidas" ? "Nenhuma nota concluída" : "Nenhuma anotação por aqui"}
          description={
            filter === "pendentes"
              ? "Crie uma nota para registrar uma tarefa ou lembrete. Suas notas começam privadas."
              : "As anotações correspondentes a este filtro aparecerão aqui."
          }
          action={
            filter === "pendentes" ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" /> Criar anotação
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {filteredNotes.map((note) => {
            const isOwner = canManageDashboardNote(note, membership?.userId);
            const isOverdue = isDashboardNoteOverdue(note.due_at, note.completed_at);
            return (
              <li
                key={note.id}
                className={`surface p-4 sm:p-5 ${note.completed_at ? "opacity-75" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={note.completed_at ? "Reabrir anotação" : "Concluir anotação"}
                    title={note.completed_at ? "Reabrir anotação" : "Concluir anotação"}
                    onClick={() => void setCompleted(note)}
                    disabled={!isOwner}
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      note.completed_at
                        ? "border-success bg-success text-white"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {note.completed_at ? (
                      <Check className="size-4" />
                    ) : (
                      <CheckCheck className="size-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={`font-semibold ${note.completed_at ? "text-muted-foreground line-through" : ""}`}
                      >
                        {note.title}
                      </h2>
                      <Pill tone={note.is_private ? "neutral" : "primary"}>
                        <span className="inline-flex items-center gap-1">
                          {note.is_private ? (
                            <LockKeyhole className="size-3" />
                          ) : (
                            <Users className="size-3" />
                          )}
                          {note.is_private ? "Privada" : "Compartilhada"}
                        </span>
                      </Pill>
                      {note.completed_at ? <Pill tone="success">Concluída</Pill> : null}
                    </div>
                    {note.body ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {note.body}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <StickyNote className="size-3.5" /> {note.author_name}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" /> Criada em{" "}
                        {dateFmt(note.created_at, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {note.due_at ? (
                        <span
                          className={`inline-flex items-center gap-1.5 ${isOverdue ? "font-semibold text-destructive" : ""}`}
                        >
                          <Bell className="size-3.5" />
                          {isOverdue ? "Atrasada · " : "Lembrete · "}
                          {dateFmt(note.due_at, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          às {timeFmt(note.due_at)}
                        </span>
                      ) : null}
                      {note.completed_at ? (
                        <span>Concluída em {dateFmt(note.completed_at)}</span>
                      ) : null}
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar anotação"
                        title="Editar anotação"
                        onClick={() => {
                          setEditing(note);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir anotação"
                        title="Excluir anotação"
                        onClick={() => void deleteNote(note)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                  {!isOwner && !note.completed_at ? (
                    <span className="sr-only">
                      Somente o autor pode editar ou concluir esta anotação.
                    </span>
                  ) : null}
                  {!isOwner && note.completed_at ? (
                    <RotateCcw className="mt-1 size-4 text-muted-foreground" />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editing}
        onDone={() => {
          setEditing(null);
          refresh();
        }}
      />
    </div>
  );
}
