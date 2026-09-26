import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock3, Coffee, Copy, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole } from "@/lib/session";
import { PageHeader, Surface, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type ClinicDay = {
  closed: boolean;
  start: string;
  end: string;
  lunchEnabled: boolean;
  lunchStart: string;
  lunchEnd: string;
};

const DAYS = [
  ["0", "Domingo"],
  ["1", "Segunda-feira"],
  ["2", "Terça-feira"],
  ["3", "Quarta-feira"],
  ["4", "Quinta-feira"],
  ["5", "Sexta-feira"],
  ["6", "Sábado"],
] as const;

const DEFAULT_DAY: ClinicDay = {
  closed: false,
  start: "09:00",
  end: "18:00",
  lunchEnabled: true,
  lunchStart: "12:00",
  lunchEnd: "13:00",
};

function normalizeHours(value: unknown): Record<string, ClinicDay> {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    DAYS.map(([id]) => {
      const raw =
        source[id] && typeof source[id] === "object" ? (source[id] as Record<string, unknown>) : {};
      return [
        id,
        {
          closed: typeof raw.closed === "boolean" ? raw.closed : id === "0" || id === "6",
          start: typeof raw.start === "string" ? raw.start.slice(0, 5) : DEFAULT_DAY.start,
          end: typeof raw.end === "string" ? raw.end.slice(0, 5) : DEFAULT_DAY.end,
          lunchEnabled: raw.lunchEnabled !== false,
          lunchStart:
            typeof raw.lunchStart === "string"
              ? raw.lunchStart.slice(0, 5)
              : DEFAULT_DAY.lunchStart,
          lunchEnd:
            typeof raw.lunchEnd === "string" ? raw.lunchEnd.slice(0, 5) : DEFAULT_DAY.lunchEnd,
        },
      ];
    }),
  );
}

export const Route = createFileRoute("/_authenticated/horarios")({
  head: () => ({
    meta: [{ title: "Horários da clínica — Aura Clínicas" }],
  }),
  component: Horarios,
});

function Horarios() {
  const { data: membership, isLoading } = useMembership();
  const org = membership?.organization;
  const canEdit = isAdminRole(membership?.role);
  const [hours, setHours] = useState<Record<string, ClinicDay>>(() => normalizeHours(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) setHours(normalizeHours(org.business_hours));
  }, [org]);

  const openDays = useMemo(() => DAYS.filter(([id]) => !hours[id]?.closed).length, [hours]);

  if (isLoading || !org) return <SkeletonCard />;

  function updateDay(id: string, patch: Partial<ClinicDay>) {
    setHours((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function applyToWeekdays() {
    const monday = hours["1"] ?? DEFAULT_DAY;
    setHours((current) => ({
      ...current,
      ...Object.fromEntries(DAYS.slice(1, 6).map(([id]) => [id, { ...monday }])),
    }));
    toast.success("Horário aplicado de segunda a sexta.");
  }

  async function save() {
    if (!canEdit) return;
    const invalid = DAYS.find(([id]) => {
      const day = hours[id];
      if (!day || day.closed) return false;
      const start = day.start.replace(":", "");
      const end = day.end.replace(":", "");
      const lunchStart = day.lunchStart.replace(":", "");
      const lunchEnd = day.lunchEnd.replace(":", "");
      return (
        start >= end ||
        (day.lunchEnabled && (lunchStart >= lunchEnd || lunchStart < start || lunchEnd > end))
      );
    });
    if (invalid) {
      toast.error(`Confira os horários de ${invalid[1]}.`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ business_hours: hours })
      .eq("id", org.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Horários da clínica salvos.");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Horários da clínica"
        subtitle="Defina quando a clínica recebe agendamentos. A jornada de cada profissional continua sendo respeitada."
        actions={
          <Button onClick={save} disabled={!canEdit || saving}>
            <Save className="size-4" /> {saving ? "Salvando..." : "Salvar horários"}
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Surface className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
            <Clock3 className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Dias abertos</p>
            <p className="font-display text-xl font-semibold">{openDays}/7</p>
          </div>
        </Surface>
        <Surface className="flex items-center gap-3 p-4 sm:col-span-2">
          <span className="grid size-10 place-items-center rounded-full bg-secondary/15 text-secondary">
            <Check className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Regra de disponibilidade</p>
            <p className="text-sm font-semibold">
              O cliente só verá horários dentro desta janela e da agenda do profissional.
            </p>
          </div>
        </Surface>
      </div>

      <Surface className="mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">Grade semanal</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste cada dia e inclua o intervalo de almoço quando necessário.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyToWeekdays}
            disabled={!canEdit}
          >
            <Copy className="size-3.5" /> Copiar segunda para dias úteis
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {DAYS.map(([id, label]) => {
            const day = hours[id] ?? DEFAULT_DAY;
            return (
              <div
                key={id}
                className={`rounded-xl border p-4 transition-colors ${day.closed ? "border-border bg-muted/30" : "border-primary/20 bg-primary-soft/20"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-32 flex-1">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {day.closed ? "Sem agendamentos" : `${day.start}–${day.end}`}
                    </p>
                  </div>
                  <Switch
                    checked={!day.closed}
                    disabled={!canEdit}
                    onCheckedChange={(open) => updateDay(id, { closed: !open })}
                    aria-label={`${label} aberto`}
                  />
                  <span className="w-16 text-right text-xs font-medium">
                    {day.closed ? "Fechado" : "Aberto"}
                  </span>
                </div>
                {!day.closed ? (
                  <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                    <TimeField
                      label="Abertura"
                      value={day.start}
                      disabled={!canEdit}
                      onChange={(value) => updateDay(id, { start: value })}
                    />
                    <TimeField
                      label="Fechamento"
                      value={day.end}
                      disabled={!canEdit}
                      onChange={(value) => updateDay(id, { end: value })}
                    />
                    <label className="flex items-end gap-2 pb-2 text-xs font-medium">
                      <Switch
                        checked={day.lunchEnabled}
                        disabled={!canEdit}
                        onCheckedChange={(value) => updateDay(id, { lunchEnabled: value })}
                      />
                      <span className="flex items-center gap-1">
                        <Coffee className="size-3.5" /> Intervalo
                      </span>
                    </label>
                    {day.lunchEnabled ? (
                      <div className="grid grid-cols-2 gap-2">
                        <TimeField
                          label="Início"
                          value={day.lunchStart}
                          disabled={!canEdit}
                          onChange={(value) => updateDay(id, { lunchStart: value })}
                        />
                        <TimeField
                          label="Fim"
                          value={day.lunchEnd}
                          disabled={!canEdit}
                          onChange={(value) => updateDay(id, { lunchEnd: value })}
                        />
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Surface>

      <p className="text-center text-xs text-muted-foreground">
        Os horários dos profissionais têm prioridade adicional: um horário só aparece quando a
        clínica e o profissional estão disponíveis.
      </p>
    </div>
  );
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
