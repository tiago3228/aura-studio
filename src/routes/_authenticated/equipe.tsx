import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useMembership, roleLabel } from "@/lib/session";
import { brl, initials } from "@/lib/format";
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

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["team", orgId],
    queryFn: async () => {
      const [professionals, members] = await Promise.all([
        supabase.from("professionals").select("*").order("name"),
        supabase.from("organization_members").select("id, role, user_id, active"),
      ]);
      if (professionals.error) throw professionals.error;
      return { professionals: professionals.data, members: members.data ?? [] };
    },
  });

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
                    {p.specialty ?? "Profissional"} · {p.work_start.slice(0, 5)}–{p.work_end.slice(0, 5)}
                  </p>
                </div>
                <Pill tone={p.active ? "success" : "neutral"}>{p.active ? "ativo" : "inativo"}</Pill>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sessão {p.slot_minutes} min
                {p.lunch_enabled ? ` · almoço ${p.lunch_start.slice(0, 5)}–${p.lunch_end.slice(0, 5)}` : ""}
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
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setEditing(p)}
              >
                <CalendarClock className="size-4" /> Configurar agenda
              </Button>
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
    </div>
  );
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ScheduleDialog({
  professional,
  onDone,
}: {
  professional: Tables<"professionals">;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    work_days: (professional.work_days as number[]) ?? [1, 2, 3, 4, 5],
    work_start: professional.work_start.slice(0, 5),
    work_end: professional.work_end.slice(0, 5),
    lunch_enabled: professional.lunch_enabled,
    lunch_start: (professional.lunch_start ?? "12:00").slice(0, 5),
    lunch_end: (professional.lunch_end ?? "13:00").slice(0, 5),
    slot_minutes: String(professional.slot_minutes),
    slot_gap_min: String(professional.slot_gap_min),
    booking_horizon_days: String(professional.booking_horizon_days),
    online_booking: professional.online_booking,
  });

  function toggleDay(i: number) {
    setForm((f) => ({
      ...f,
      work_days: f.work_days.includes(i) ? f.work_days.filter((d) => d !== i) : [...f.work_days, i].sort(),
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("professionals")
        .update({
          work_days: form.work_days,
          work_start: form.work_start,
          work_end: form.work_end,
          lunch_enabled: form.lunch_enabled,
          lunch_start: form.lunch_start,
          lunch_end: form.lunch_end,
          slot_minutes: Number(form.slot_minutes || 60),
          slot_gap_min: Number(form.slot_gap_min || 0),
          booking_horizon_days: Number(form.booking_horizon_days || 30),
          online_booking: form.online_booking,
        })
        .eq("id", professional.id);
      if (error) throw error;
      toast.success("Agenda atualizada.");
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
        <DialogTitle className="font-display">Agenda de {professional.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    phone: "",
    commission_default: "40",
    commission_type: "percentual" as "percentual" | "fixo",
    work_start: "09:00",
    work_end: "18:00",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("professionals").insert({
        organization_id: membership.organization.id,
        name: form.name,
        specialty: form.specialty || null,
        phone: form.phone || null,
        commission_default: Number(form.commission_default || 0),
        commission_type: form.commission_type,
        work_start: form.work_start,
        work_end: form.work_end,
      });
      if (error) throw error;
      toast.success("Profissional cadastrado.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
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
            <Label htmlFor="pro-phone">Telefone</Label>
            <Input
              id="pro-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
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
              onValueChange={(v) => setForm({ ...form, commission_type: v as "percentual" | "fixo" })}
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
