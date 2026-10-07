import { useEffect, useState } from "react";
import { Loader2, LockKeyhole, StickyNote, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, useSession } from "@/lib/session";
import { buildDashboardNotePayload, type DashboardNoteFormValues } from "@/lib/note-management";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

export type DashboardNote = Database["public"]["Tables"]["dashboard_notes"]["Row"];

const EMPTY_FORM: DashboardNoteFormValues = { title: "", body: "", dueAt: "", isPrivate: true };

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function NoteDialog({
  open,
  onOpenChange,
  note,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: DashboardNote | null;
  onDone: () => void;
}) {
  const { data: membership } = useMembership();
  const { user } = useSession();
  const [form, setForm] = useState<DashboardNoteFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      note
        ? {
            title: note.title,
            body: note.body ?? "",
            dueAt: toDatetimeLocal(note.due_at),
            isPrivate: note.is_private,
          }
        : EMPTY_FORM,
    );
    setErrorMessage(null);
  }, [open, note]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !saving) setErrorMessage(null);
    onOpenChange(nextOpen);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!membership) {
      setErrorMessage("Sua sessão ainda não está pronta. Tente novamente.");
      return;
    }
    let values;
    try {
      values = buildDashboardNotePayload(form);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Revise os dados da anotação.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const result = note
        ? await supabase.from("dashboard_notes").update(values).eq("id", note.id)
        : await supabase.from("dashboard_notes").insert({
            ...values,
            organization_id: membership.organization.id,
            user_id: membership.userId,
            author_name:
              user?.user_metadata?.["full_name"]?.toString().trim() ||
              user?.email?.split("@")[0] ||
              "Membro da equipe",
          });
      if (result.error) throw result.error;
      toast.success(note ? "Anotação atualizada." : "Anotação criada.");
      onOpenChange(false);
      onDone();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível salvar a anotação.",
      );
      toast.error("Não foi possível salvar a anotação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
              <StickyNote className="size-4" />
            </span>
            {note ? "Editar anotação" : "Nova anotação"}
          </DialogTitle>
          <DialogDescription>
            {note
              ? "Atualize o conteúdo, o lembrete ou quem pode visualizar."
              : "Crie uma nota rápida, com lembrete e visibilidade definidos por você."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Título</Label>
            <Input
              id="note-title"
              value={form.title}
              maxLength={120}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Ex.: Retornar mensagem da cliente"
              autoFocus
              required
            />
            <p className="text-right text-[11px] text-muted-foreground">{form.title.length}/120</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-body">Detalhes</Label>
            <Textarea
              id="note-body"
              value={form.body}
              maxLength={2000}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Inclua o contexto e as próximas ações..."
              rows={5}
            />
            <p className="text-right text-[11px] text-muted-foreground">{form.body.length}/2.000</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-reminder">Lembrete</Label>
            <Input
              id="note-reminder"
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueAt: event.target.value }))
              }
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(event) =>
                setForm((current) => ({ ...current, isPrivate: event.target.checked }))
              }
              className="mt-1 size-4 accent-primary"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                {form.isPrivate ? (
                  <>
                    <LockKeyhole className="size-4 text-primary" /> Privada
                  </>
                ) : (
                  <>
                    <Users className="size-4 text-primary" /> Compartilhada com a equipe
                  </>
                )}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {form.isPrivate
                  ? "Somente você poderá ver esta anotação."
                  : "Todos os membros da clínica poderão ver; somente você poderá editar ou concluir."}
              </span>
            </span>
          </label>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !membership}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <StickyNote className="size-4" />
              )}
              {saving ? "Salvando..." : note ? "Salvar alterações" : "Salvar anotação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
