import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  CalendarClock,
  ListChecks,
  ShieldCheck,
  Link2,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  hasPermission,
  useMembership,
  roleLabel,
  PERMISSION_GROUPS,
  type PermissionMap,
} from "@/lib/session";
import { useServerFn } from "@tanstack/react-start";
import { generateCollaboratorAccessLink, inviteCollaborator } from "@/lib/collaborator.functions";
import { createProfessionalCredentials } from "@/lib/professional-credentials.functions";
import { brl, initials } from "@/lib/format";
import { resizeImage } from "@/lib/image";
import { Textarea } from "@/components/ui/textarea";
import { ProfessionalOfferings } from "@/components/professional-offerings";
import { PageHeader, Pill, SkeletonCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Aura Clínicas" },
      { name: "description", content: "Profissionais, jornada de trabalho e regras de comissão." },
      { property: "og:title", content: "Equipe — Aura Clínicas" },
      { property: "og:description", content: "Profissionais e comissões da sua clínica." },
    ],
  }),
  component: Equipe,
});

function Equipe() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"professionals"> | null>(null);
  const [offeringFor, setOfferingFor] = useState<Tables<"professionals"> | null>(null);
  const [accessFor, setAccessFor] = useState<Tables<"professionals"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"professionals"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["team", orgId],
    queryFn: async () => {
      const [professionals, members] = await Promise.all([
        supabase.from("professionals").select("*").order("name"),
        supabase
          .from("organization_members")
          .select("id, role, user_id, active, permissions, professional_id"),
      ]);
      if (professionals.error) throw professionals.error;
      return { professionals: professionals.data, members: members.data ?? [] };
    },
  });

  async function deleteProfessional() {
    if (!deleteTarget || !hasPermission(membership, "equipe.editar")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("professionals").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(`${deleteTarget.name} foi excluído da equipe.`);
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir o profissional.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Equipe"
        subtitle="Cada profissional tem jornada própria — a agenda respeita esses horários."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo profissional
              </Button>
            </DialogTrigger>
            <ProfessionalDialog
              onDone={() => {
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["team"] });
              }}
            />
          </Dialog>
        }
      />

      {data.isLoading ? (
        <SkeletonCard />
      ) : (data.data?.professionals.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum profissional"
          description="Cadastre sua equipe para distribuir a agenda e calcular comissões."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.data!.professionals.map((p) => (
            <li key={p.id} className="surface p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.specialty ?? "Profissional"} · {p.work_start.slice(0, 5)}–
                    {p.work_end.slice(0, 5)}
                  </p>
                </div>
                <Pill tone={p.active ? "success" : "neutral"}>
                  {p.active ? "ativo" : "inativo"}
                </Pill>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sessão {p.slot_minutes} min
                {p.lunch_enabled
                  ? ` · almoço ${p.lunch_start.slice(0, 5)}–${p.lunch_end.slice(0, 5)}`
                  : ""}
                {` · agenda até ${p.booking_horizon_days} dias`}
                {p.online_booking ? " · online ativo" : " · online desligado"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {WEEKDAYS.map((d, i) => (
                  <span
                    key={d}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      (p.work_days as number[]).includes(i)
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d}
                  </span>
                ))}
                <span className="ml-auto text-xs font-semibold">
                  {p.commission_type === "percentual"
                    ? `${Number(p.commission_default)}%`
                    : brl(Number(p.commission_default))}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                  <CalendarClock className="size-4" /> Configurar agenda
                </Button>
                <Button variant="outline" size="sm" onClick={() => setOfferingFor(p)}>
                  <ListChecks className="size-4" /> Serviços e pacotes
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAccessFor(p)}>
                  <ShieldCheck className="size-4" /> Acesso e permissões
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={!hasPermission(membership, "equipe.editar")}
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 className="size-4" /> Excluir profissional
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-semibold">Acessos ao sistema</h2>
        <ul className="surface divide-y divide-border p-0">
          {(data.data?.members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="truncate">
                {m.user_id === membership?.userId ? "Você" : `Usuário ${m.user_id.slice(0, 8)}`}
              </span>
              <Pill tone={m.active ? "primary" : "neutral"}>{roleLabel[m.role]}</Pill>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing ? (
          <ScheduleDialog
            professional={editing}
            onDone={() => {
              setEditing(null);
              queryClient.invalidateQueries({ queryKey: ["team"] });
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={!!offeringFor} onOpenChange={(v) => !v && setOfferingFor(null)}>
        {offeringFor ? (
          <ProfessionalOfferings
            professional={offeringFor}
            onDone={() => {
              setOfferingFor(null);
              queryClient.invalidateQueries({ queryKey: ["team"] });
            }}
          />
        ) : null}
      </Dialog>
      <Dialog open={!!accessFor} onOpenChange={(v) => !v && setAccessFor(null)}>
        {accessFor ? (
          <AccessDialog
            professional={accessFor}
            {...(() => {
              const member = data.data?.members.find(
                (item) => item.professional_id === accessFor.id,
              );
              return member ? { member } : {};
            })()}
            onDone={() => {
              setAccessFor(null);
              queryClient.invalidateQueries({ queryKey: ["team"] });
            }}
          />
        ) : null}
      </Dialog>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissional definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} será removido da equipe e do banco de dados. Agendamentos e
              vendas históricos permanecem registrados, mas deixam de apontar para este
              profissional. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteProfessional();
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
type ProfessionalExtraWindow = { start: string; end: string; bookable: boolean };
function normalizeProfessionalExtraWindows(value: unknown): ProfessionalExtraWindow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item),
    )
    .filter((item) => typeof item["start"] === "string" && typeof item["end"] === "string")
    .map((item) => ({
      start: String(item["start"]).slice(0, 5),
      end: String(item["end"]).slice(0, 5),
      bookable: item["bookable"] !== false,
    }));
}

function ScheduleDialog({
  professional,
  onDone,
}: {
  professional: Tables<"professionals">;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    work_days: (professional.work_days as number[]) ?? [1, 2, 3, 4, 5],
    work_start: professional.work_start.slice(0, 5),
    work_end: professional.work_end.slice(0, 5),
    extra_windows: normalizeProfessionalExtraWindows(professional.extra_windows),
    lunch_enabled: professional.lunch_enabled,
    lunch_start: (professional.lunch_start ?? "12:00").slice(0, 5),
    lunch_end: (professional.lunch_end ?? "13:00").slice(0, 5),
    slot_minutes: String(professional.slot_minutes),
    slot_gap_min: String(professional.slot_gap_min),
    booking_horizon_days: String(professional.booking_horizon_days),
    online_booking: professional.online_booking,
    specialty: professional.specialty ?? "",
    bio: professional.bio ?? "",
    certifications: professional.certifications ?? "",
    photo_url: professional.photo_url ?? "",
  });

  useEffect(() => {
    let alive = true;
    const path = form.photo_url;
    if (!path) {
      setPreview(null);
      return;
    }
    if (path.startsWith("http")) {
      setPreview(path);
      return;
    }
    supabase.storage
      .from("clinic-files")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive) setPreview(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [form.photo_url]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const resized = await resizeImage(file, 600);
      const path = `${professional.organization_id}/professionals/${professional.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("clinic-files")
        .upload(path, resized, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, photo_url: path }));
      toast.success("Foto carregada. Salve para publicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  function toggleDay(i: number) {
    setForm((f) => ({
      ...f,
      work_days: f.work_days.includes(i)
        ? f.work_days.filter((d) => d !== i)
        : [...f.work_days, i].sort(),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const invalidExtra = form.extra_windows.some(
      (window) => window.start.replace(":", "") >= window.end.replace(":", ""),
    );
    if (invalidExtra) {
      toast.error("Confira os horários das janelas extras.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("professionals")
        .update({
          work_days: form.work_days,
          work_start: form.work_start,
          work_end: form.work_end,
          extra_windows: form.extra_windows,
          lunch_enabled: form.lunch_enabled,
          lunch_start: form.lunch_start,
          lunch_end: form.lunch_end,
          slot_minutes: Number(form.slot_minutes || 60),
          slot_gap_min: Number(form.slot_gap_min || 0),
          booking_horizon_days: Number(form.booking_horizon_days || 30),
          online_booking: form.online_booking,
          specialty: form.specialty || null,
          bio: form.bio || null,
          certifications: form.certifications || null,
          photo_url: form.photo_url || null,
        })
        .eq("id", professional.id);
      if (error) throw error;
      toast.success("Perfil e agenda atualizados.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Perfil e agenda de {professional.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Perfil público</p>
          <div className="flex items-center gap-3">
            {preview ? (
              <img
                src={preview}
                alt={professional.name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-16 place-items-center rounded-full bg-muted text-xs text-muted-foreground">
                sem foto
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
                {uploading ? "Enviando..." : preview ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {preview ? (
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive"
                  onClick={() => setForm({ ...form, photo_url: "" })}
                >
                  Remover
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-spec">Especialidades</Label>
            <Input
              id="sc-spec"
              value={form.specialty}
              placeholder="Estética facial e corporal"
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-bio">Descrição profissional</Label>
            <Textarea
              id="sc-bio"
              rows={3}
              value={form.bio}
              placeholder="Especialista em estética facial e corporal, com formação em limpeza de pele..."
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-cert">Cursos e certificações</Label>
            <Textarea
              id="sc-cert"
              rows={2}
              value={form.certifications}
              onChange={(e) => setForm({ ...form, certifications: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Dias de atendimento</Label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((d, i) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleDay(i)}
                className={`rounded-full border border-border px-3 py-1.5 text-xs font-semibold ${
                  form.work_days.includes(i) ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sc-start">Início</Label>
            <Input
              id="sc-start"
              type="time"
              value={form.work_start}
              onChange={(e) => setForm({ ...form, work_start: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-end">Fim</Label>
            <Input
              id="sc-end"
              type="time"
              value={form.work_end}
              onChange={(e) => setForm({ ...form, work_end: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary-soft/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Janelas extras deste profissional</p>
              <p className="text-xs text-muted-foreground">
                A clínica também precisa liberar a mesma janela.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  extra_windows: [
                    ...current.extra_windows,
                    { start: "20:00", end: "22:00", bookable: true },
                  ],
                }))
              }
            >
              <Plus className="size-3.5" /> Adicionar janela
            </Button>
          </div>
          {form.extra_windows.length ? (
            <div className="mt-3 space-y-2">
              {form.extra_windows.map((window, index) => (
                <div key={`professional-extra-${index}`} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={window.start}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          extra_windows: current.extra_windows.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, start: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={window.end}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          extra_windows: current.extra_windows.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, end: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="min-w-44 flex-1">
                    <Label>Tipo</Label>
                    <select
                      value={window.bookable ? "bookable" : "blocked"}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          extra_windows: current.extra_windows.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, bookable: e.target.value === "bookable" }
                              : item,
                          ),
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="bookable">Livre para agendamento</option>
                      <option value="blocked">Bloqueada sem agendamento</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remover janela extra"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        extra_windows: current.extra_windows.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                  >
                    <span className="text-lg text-destructive">×</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.lunch_enabled}
            onChange={(e) => setForm({ ...form, lunch_enabled: e.target.checked })}
          />
          Intervalo de almoço
        </label>
        {form.lunch_enabled ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sc-ls">Almoço início</Label>
              <Input
                id="sc-ls"
                type="time"
                value={form.lunch_start}
                onChange={(e) => setForm({ ...form, lunch_start: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-le">Almoço fim</Label>
              <Input
                id="sc-le"
                type="time"
                value={form.lunch_end}
                onChange={(e) => setForm({ ...form, lunch_end: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sc-slot">Sessão (min)</Label>
            <Input
              id="sc-slot"
              type="number"
              min={10}
              step={5}
              value={form.slot_minutes}
              onChange={(e) => setForm({ ...form, slot_minutes: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-gap">Intervalo (min)</Label>
            <Input
              id="sc-gap"
              type="number"
              min={0}
              step={5}
              value={form.slot_gap_min}
              onChange={(e) => setForm({ ...form, slot_gap_min: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-hor">Horizonte (dias)</Label>
            <Input
              id="sc-hor"
              type="number"
              min={1}
              max={180}
              value={form.booking_horizon_days}
              onChange={(e) => setForm({ ...form, booking_horizon_days: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.online_booking}
            onChange={(e) => setForm({ ...form, online_booking: e.target.checked })}
          />
          Disponível no agendamento online
        </label>

        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar agenda
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ProfessionalDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
  const createCredentials = useServerFn(createProfessionalCredentials);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    bio: "",
    certifications: "",
    phone: "",
    login_username: "",
    login_password: "",
    commission_default: "40",
    commission_type: "percentual" as "percentual" | "fixo",
    work_start: "09:00",
    work_end: "18:00",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    const username = form.login_username.trim();
    const password = form.login_password;
    if (username !== "" && password === "") {
      setCredentialError("Informe uma senha para este usuário.");
      return;
    }
    if (username === "" && password !== "") {
      setCredentialError("Informe um usuário para esta senha.");
      return;
    }
    setCredentialError(null);
    setSaving(true);
    let createdProfessionalId: string | null = null;
    try {
      const { data: professional, error } = await supabase
        .from("professionals")
        .insert({
          organization_id: membership.organization.id,
          name: form.name,
          specialty: form.specialty || null,
          bio: form.bio || null,
          certifications: form.certifications || null,
          phone: form.phone || null,
          commission_default: Number(form.commission_default || 0),
          commission_type: form.commission_type,
          work_start: form.work_start,
          work_end: form.work_end,
        })
        .select("id")
        .single();
      if (error) throw error;
      createdProfessionalId = professional.id;
      if (username && password) {
        await createCredentials({
          data: {
            organizationId: membership.organization.id,
            professionalId: professional.id,
            username,
            password,
          },
        });
      }
      if (photoFile && professional) {
        setUploading(true);
        const resized = await resizeImage(photoFile, 600);
        const path = `${membership.organization.id}/professionals/${professional.id}-${Date.now()}.jpg`;
        const upload = await supabase.storage
          .from("clinic-files")
          .upload(path, resized, { contentType: "image/jpeg", upsert: true });
        if (upload.error) throw upload.error;
        const update = await supabase
          .from("professionals")
          .update({ photo_url: path })
          .eq("id", professional.id);
        if (update.error) throw update.error;
      }
      toast.success("Profissional cadastrado.");
      onDone();
    } catch (err) {
      if (createdProfessionalId) {
        await supabase.from("professionals").delete().eq("id", createdProfessionalId);
      }
      const rawMessage = err instanceof Error ? err.message : "Erro ao salvar.";
      const message = rawMessage.toLowerCase().includes("weak")
        ? "Não foi possível criar o acesso com essa senha."
        : rawMessage;
      setCredentialError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">Novo profissional</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pro-name">Nome</Label>
          <Input
            id="pro-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pro-spec">Especialidade</Label>
            <Input
              id="pro-spec"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="Esteticista"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pro-phone">WhatsApp do profissional</Label>
            <Input
              id="pro-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold">Acesso do profissional (opcional)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crie um usuário e uma senha temporária para ele entrar sem depender de e-mail.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pro-login-username">Usuário</Label>
              <Input
                id="pro-login-username"
                value={form.login_username}
                onChange={(e) => {
                  setCredentialError(null);
                  setForm({ ...form, login_username: e.target.value });
                }}
                placeholder="atena"
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pro-login-password">Senha temporária</Label>
              <Input
                id="pro-login-password"
                type="password"
                value={form.login_password}
                onChange={(e) => {
                  setCredentialError(null);
                  setForm({ ...form, login_password: e.target.value });
                }}
                placeholder="mínimo de 6 caracteres"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A senha não fica salva no cadastro; o Supabase armazena somente o hash seguro.
          </p>
          {credentialError ? (
            <p className="mt-2 text-sm font-medium text-destructive">{credentialError}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pro-bio">Descrição profissional</Label>
          <Textarea
            id="pro-bio"
            rows={3}
            value={form.bio}
            placeholder="Apresente a experiência e o estilo de atendimento..."
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pro-certifications">Cursos e certificações</Label>
          <Textarea
            id="pro-certifications"
            rows={2}
            placeholder="Ex.: Curso de limpeza de pele, especialização em estética corporal..."
            value={form.certifications}
            onChange={(e) => setForm({ ...form, certifications: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pro-photo">Foto profissional</Label>
          <Input
            id="pro-photo"
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            A foto será redimensionada e armazenada com isolamento da clínica.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pro-comm">Comissão padrão</Label>
            <Input
              id="pro-comm"
              type="number"
              min={0}
              step="0.01"
              value={form.commission_default}
              onChange={(e) => setForm({ ...form, commission_default: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.commission_type}
              onValueChange={(v) =>
                setForm({ ...form, commission_type: v as "percentual" | "fixo" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pro-start">Início</Label>
            <Input
              id="pro-start"
              type="time"
              value={form.work_start}
              onChange={(e) => setForm({ ...form, work_start: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pro-end">Fim</Label>
            <Input
              id="pro-end"
              type="time"
              value={form.work_end}
              onChange={(e) => setForm({ ...form, work_end: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function AccessDialog({
  professional,
  member,
  onDone,
}: {
  professional: Tables<"professionals">;
  member?: Pick<
    Tables<"organization_members">,
    "active" | "id" | "permissions" | "professional_id" | "role" | "user_id"
  >;
  onDone: () => void;
}) {
  const { data: membership } = useMembership();
  const sendInvite = useServerFn(inviteCollaborator);
  const createAccessLink = useServerFn(generateCollaboratorAccessLink);
  const [email, setEmail] = useState(professional.email ?? "");
  const [phone, setPhone] = useState(professional.phone ?? "");
  const [role, setRole] = useState<"manager" | "reception" | "professional">(
    member?.role === "manager" || member?.role === "reception" ? member.role : "professional",
  );
  const [active, setActive] = useState(member?.active ?? true);
  const [permissions, setPermissions] = useState<PermissionMap>(
    (member?.permissions as PermissionMap | null) ?? {
      "agenda.ver": true,
      "agenda.propria": true,
      "agenda.criar": true,
      "agenda.editar": true,
      "clientes.ver": true,
      "clientes.criar": true,
      "clientes.editar": true,
    },
  );
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership || !email.trim()) {
      toast.error("Informe o e-mail de acesso.");
      return;
    }
    setSaving(true);
    try {
      if (member && active) {
        await sendInvite({
          data: {
            organizationId: membership.organization.id,
            professionalId: professional.id,
            email: email.trim(),
            role,
            permissions,
          },
        });
        toast.success("Acesso liberado e vínculo atualizado.");
      } else if (member) {
        const { error } = await supabase
          .from("organization_members")
          .update({ role, active, permissions, professional_id: professional.id })
          .eq("id", member.id);
        if (error) throw error;
        toast.success(active ? "Acesso atualizado." : "Acesso bloqueado.");
      } else {
        await sendInvite({
          data: {
            organizationId: membership.organization.id,
            professionalId: professional.id,
            email: email.trim(),
            role,
            permissions,
          },
        });
        toast.success("Convite enviado. O colaborador criará a própria senha pelo link recebido.");
      }
      const { error: profileError } = await supabase
        .from("professionals")
        .update({ email: email.trim(), phone: phone.trim() || null })
        .eq("id", professional.id);
      if (profileError) throw profileError;
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o acesso.");
    } finally {
      setSaving(false);
    }
  }
  async function copyLink() {
    if (!membership || !email.trim()) {
      toast.error("Informe o e-mail e salve o acesso antes de gerar o link.");
      return;
    }
    try {
      const result = await createAccessLink({
        data: { organizationId: membership.organization.id, email: email.trim() },
      });
      await navigator.clipboard.writeText(result.actionLink);
      toast.success("Link de acesso autenticado copiado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o link.");
    }
  }
  async function shareWhatsApp() {
    if (!phone.trim()) {
      toast.error("Cadastre o WhatsApp do colaborador antes de compartilhar.");
      return;
    }
    if (!membership || !email.trim()) {
      toast.error("Informe o e-mail e salve o acesso antes de compartilhar o link.");
      return;
    }
    try {
      const result = await createAccessLink({
        data: { organizationId: membership.organization.id, email: email.trim() },
      });
      const digits = phone.replace(/\D/g, "");
      const international = digits.startsWith("55") ? digits : `55${digits}`;
      const text = `Olá, ${professional.name}! Este é o seu link de acesso ao Aura: ${result.actionLink}`;
      window.open(
        `https://wa.me/${international}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o link.");
    }
  }
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Acesso de {professional.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="access-email">E-mail de acesso</Label>
            <Input
              id="access-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="profissional@clinica.com.br"
            />
            <p className="text-xs text-muted-foreground">
              A senha não é cadastrada pela clínica. Depois do convite, o colaborador acessa o link
              recebido e cria a própria senha.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="professional">Profissional</option>
              <option value="reception">Recepção</option>
              <option value="manager">Gerente</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="access-whatsapp">WhatsApp do colaborador</Label>
            <Input
              id="access-whatsapp"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{" "}
            Acesso ativo
          </label>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="mb-3 text-sm font-semibold">Permissões personalizadas</p>
          <div className="space-y-4">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.area}>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{group.area}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <label key={permission.key} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={permissions[permission.key] === true}
                        onChange={(e) =>
                          setPermissions((current) => ({
                            ...current,
                            [permission.key]: e.target.checked,
                          }))
                        }
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copyLink}>
            <Link2 className="size-4" /> Copiar link de acesso
          </Button>
          <Button type="button" variant="outline" onClick={shareWhatsApp}>
            <MessageCircle className="size-4" /> Compartilhar no WhatsApp
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar acesso
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
