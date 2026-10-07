export type DashboardNoteFilter = "pendentes" | "concluidas" | "todas";

export type DashboardNoteFormValues = {
  title: string;
  body: string;
  dueAt: string;
  isPrivate: boolean;
};

export type DashboardNotePayload = {
  title: string;
  body: string | null;
  due_at: string | null;
  is_private: boolean;
};

export type NoteAccess = {
  user_id: string;
  is_private: boolean;
};

export type NoteCompletionState = {
  user_id: string;
  completed_at: string | null;
};

export function canViewDashboardNote(note: NoteAccess, userId: string | null | undefined): boolean {
  return !note.is_private || (!!userId && note.user_id === userId);
}

export function canManageDashboardNote(
  note: Pick<NoteAccess, "user_id">,
  userId: string | null | undefined,
): boolean {
  return !!userId && note.user_id === userId;
}

export function filterDashboardNotes<T extends { completed_at: string | null }>(
  notes: T[],
  filter: DashboardNoteFilter,
): T[] {
  if (filter === "pendentes") return notes.filter((note) => !note.completed_at);
  if (filter === "concluidas") return notes.filter((note) => !!note.completed_at);
  return notes;
}

export function buildDashboardNotePayload(form: DashboardNoteFormValues): DashboardNotePayload {
  const title = form.title.trim();
  const body = form.body.trim();

  if (!title) throw new Error("Informe um título para a anotação.");
  if (title.length > 120 || body.length > 2000) {
    throw new Error("O título aceita até 120 caracteres e os detalhes até 2.000.");
  }

  let dueAt: string | null = null;
  if (form.dueAt) {
    const reminder = new Date(form.dueAt);
    if (Number.isNaN(reminder.getTime())) {
      throw new Error("Informe uma data e hora válidas para o lembrete.");
    }
    dueAt = reminder.toISOString();
  }

  return {
    title,
    body: body || null,
    due_at: dueAt,
    is_private: form.isPrivate,
  };
}

export function buildDashboardNoteCompletionPatch(
  note: NoteCompletionState,
  userId: string | null | undefined,
  completedAt: string,
): { completed_at: string | null; completed_by: string | null } {
  if (!canManageDashboardNote(note, userId)) {
    throw new Error("Somente o autor pode concluir ou reabrir esta anotação.");
  }

  return note.completed_at
    ? { completed_at: null, completed_by: null }
    : { completed_at: completedAt, completed_by: userId ?? null };
}

export function isDashboardNoteOverdue(
  dueAt: string | null,
  completedAt: string | null,
  now = Date.now(),
): boolean {
  return !!dueAt && !completedAt && new Date(dueAt).getTime() < now;
}
