import { useState } from "react";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
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

export type NewNoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

type NoteForm = {
  title: string;
  body: string;
  dueAt: string;
};

const INITIAL_FORM: NoteForm = {
  title: "",
  body: "",
  dueAt: "",
};

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function NewNoteDialog({ open, onOpenChange, onDone }: NewNoteDialogProps) {
  const { data: membership } = useMembership();
  const [form, setForm] = useState<NoteForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function update<K extends keyof NoteForm>(field: K, value: NoteForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errorMessage) setErrorMessage(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !saving) {
      setForm(INITIAL_FORM);
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const body = form.body.trim();

    if (!membership) {
      setErrorMessage("Sua sessão ainda não está pronta. Tente novamente.");
      return;
    }
    if (!title) {
      setErrorMessage("Informe um título para a anotação.");
      return;
    }
    if (title.length > 120) {
      setErrorMessage("O título deve ter no máximo 120 caracteres.");
      return;
    }
    if (body.length > 2000) {
      setErrorMessage("A anotação deve ter no máximo 2.000 caracteres.");
      return;
    }
    if (form.dueAt && !toIsoOrNull(form.dueAt)) {
      setErrorMessage("Informe uma data e hora válidas.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.from("dashboard_notes").insert({
        organization_id: membership.organization.id,
        user_id: membership.userId,
        title,
        body: body || null,
        due_at: toIsoOrNull(form.dueAt),
      });

      if (error) throw error;

      toast.success("Anotação criada.");
      setForm(INITIAL_FORM);
      onOpenChange(false);
      onDone?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar a anotação.";
      setErrorMessage(message);
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
            Nova anotação
          </DialogTitle>
          <DialogDescription>
            Registre um lembrete rápido para acompanhar no dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dashboard-note-title">Título</Label>
            <Input
              id="dashboard-note-title"
              value={form.title}
              maxLength={120}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Ex.: Retornar mensagem da cliente"
              autoFocus
              required
            />
            <p className="text-right text-[11px] text-muted-foreground">{form.title.length}/120</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dashboard-note-body">Detalhes</Label>
            <Textarea
              id="dashboard-note-body"
              value={form.body}
              maxLength={2000}
              onChange={(event) => update("body", event.target.value)}
              placeholder="Inclua informações importantes para lembrar depois..."
              rows={5}
            />
            <p className="text-right text-[11px] text-muted-foreground">{form.body.length}/2.000</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dashboard-note-due-at">Lembrar em (opcional)</Label>
            <Input
              id="dashboard-note-due-at"
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => update("dueAt", event.target.value)}
            />
          </div>

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
              {saving ? "Salvando..." : "Salvar anotação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
