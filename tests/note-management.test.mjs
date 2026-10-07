import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDashboardNoteCompletionPatch,
  buildDashboardNotePayload,
  canManageDashboardNote,
  canViewDashboardNote,
  filterDashboardNotes,
  isDashboardNoteOverdue,
} from "../src/lib/note-management.ts";

const form = {
  title: "  Retornar para a cliente  ",
  body: "  Confirmar o horário  ",
  dueAt: "2026-10-06T12:30",
  isPrivate: true,
};

test("normaliza título e detalhes e preserva lembrete e privacidade", () => {
  const result = buildDashboardNotePayload(form);
  assert.deepEqual(result, {
    title: "Retornar para a cliente",
    body: "Confirmar o horário",
    due_at: new Date(form.dueAt).toISOString(),
    is_private: true,
  });
});

test("permite detalhes e lembrete vazios, armazenando-os como null", () => {
  const result = buildDashboardNotePayload({ ...form, body: "  ", dueAt: "", isPrivate: false });
  assert.equal(result.body, null);
  assert.equal(result.due_at, null);
  assert.equal(result.is_private, false);
});

test("rejeita título vazio, título longo, detalhes longos e lembrete inválido", () => {
  assert.throws(() => buildDashboardNotePayload({ ...form, title: "   " }), /título/);
  assert.throws(() => buildDashboardNotePayload({ ...form, title: "x".repeat(121) }), /120/);
  assert.throws(() => buildDashboardNotePayload({ ...form, body: "x".repeat(2001) }), /2\.000/);
  assert.throws(
    () => buildDashboardNotePayload({ ...form, dueAt: "not-a-date" }),
    /data e hora válidas/,
  );
});

test("notas privadas ficam visíveis só para o autor; notas compartilhadas para a equipe", () => {
  const privateNote = { user_id: "ana", is_private: true };
  const sharedNote = { user_id: "ana", is_private: false };
  assert.equal(canViewDashboardNote(privateNote, "ana"), true);
  assert.equal(canViewDashboardNote(privateNote, "bia"), false);
  assert.equal(canViewDashboardNote(privateNote, null), false);
  assert.equal(canViewDashboardNote(sharedNote, "bia"), true);
  assert.equal(canManageDashboardNote(privateNote, "ana"), true);
  assert.equal(canManageDashboardNote(sharedNote, "bia"), false);
});

test("filtra notas pendentes, concluídas e todas", () => {
  const notes = [
    { id: "1", completed_at: null },
    { id: "2", completed_at: "2026-10-06T12:00:00.000Z" },
  ];
  assert.deepEqual(
    filterDashboardNotes(notes, "pendentes").map((note) => note.id),
    ["1"],
  );
  assert.deepEqual(
    filterDashboardNotes(notes, "concluidas").map((note) => note.id),
    ["2"],
  );
  assert.equal(filterDashboardNotes(notes, "todas").length, 2);
});

test("somente o autor pode concluir ou reabrir uma anotação", () => {
  const pending = { user_id: "ana", completed_at: null };
  assert.deepEqual(buildDashboardNoteCompletionPatch(pending, "ana", "2026-10-06T12:00:00.000Z"), {
    completed_at: "2026-10-06T12:00:00.000Z",
    completed_by: "ana",
  });
  assert.deepEqual(
    buildDashboardNoteCompletionPatch(
      { user_id: "ana", completed_at: "2026-10-05T12:00:00.000Z" },
      "ana",
      "2026-10-06T12:00:00.000Z",
    ),
    { completed_at: null, completed_by: null },
  );
  assert.throws(
    () => buildDashboardNoteCompletionPatch(pending, "bia", "2026-10-06T12:00:00.000Z"),
    /Somente o autor/,
  );
});

test("sinaliza lembrete vencido apenas quando a nota está pendente", () => {
  const now = Date.parse("2026-10-06T12:00:00.000Z");
  assert.equal(isDashboardNoteOverdue("2026-10-06T11:59:00.000Z", null, now), true);
  assert.equal(isDashboardNoteOverdue("2026-10-06T12:01:00.000Z", null, now), false);
  assert.equal(isDashboardNoteOverdue("2026-10-06T11:00:00.000Z", now.toString(), now), false);
  assert.equal(isDashboardNoteOverdue(null, null, now), false);
});
