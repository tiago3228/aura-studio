import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock3, Coffee, Copy, Plus, Save, Trash2 } from "lucide-react";
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
  extraWindows: { start: string; end: string; bookable: boolean }[];
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
  extraWindows: [],
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
          closed: typeof raw["closed"] === "boolean" ? raw["closed"] : id === "0" || id === "6",
          start: typeof raw["start"] === "string" ? raw["start"].slice(0, 5) : DEFAULT_DAY.start,
          end: typeof raw["end"] === "string" ? raw["end"].slice(0, 5) : DEFAULT_DAY.end,
          lunchEnabled: raw["lunchEnabled"] !== false,
          lunchStart:
            typeof raw["lunchStart"] === "string"
              ? raw["lunchStart"].slice(0, 5)
              : DEFAULT_DAY.lunchStart,
          lunchEnd:
            typeof raw["lunchEnd"] === "string"
              ? raw["lunchEnd"].slice(0, 5)
              : DEFAULT_DAY.lunchEnd,
          extraWindows: Array.isArray(raw["extraWindows"])
            ? raw["extraWindows"]
                .filter(
                  (window): window is Record<string, unknown> =>
                    !!window && typeof window === "object" && !Array.isArray(window),
                )
                .map((window) => ({
                  start:
                    typeof window["start"] === "string" ? window["start"].slice(0, 5) : "20:00",
                  end: typeof window["end"] === "string" ? window["end"].slice(0, 5) : "22:00",
                  bookable: window["bookable"] !== false,
                }))
            : [],
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
    setHours((current) => ({ ...current, [id]: { ...DEFAULT_DAY, ...current[id], ...patch } }));
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
    if (!canEdit || !org) return;
    const invalid = DAYS.find(([id]) => {
      const day = hours[id];
      if (!day || day.closed) return false;
      const start = day.start.replace(":", "");
      const end = day.end.replace(":", "");
      const lunchStart = day.lunchStart.replace(":", "");
      const lunchEnd = day.lunchEnd.replace(":", "");
      const extraInvalid = day.extraWindows.some((window) => {
        const extraStart = window.start.replace(":", "");
        const extraEnd = window.end.replace(":", "");
        return extraStart >= extraEnd;
      });
      return (
        start >= end ||
        (day.lunchEnabled && (lunchStart >= lunchEnd || lunchStart < start || lunchEnd > end)) ||
        extraInvalid
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
                    <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-dashed border-primary/30 bg-background/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">Janelas extras</p>
                          <p className="text-[11px] text-muted-foreground">
                            Adicione períodos extras e escolha se ficam livres ou bloqueados para
                            agendamento.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canEdit}
                          onClick={() =>
                            updateDay(id, {
                              extraWindows: [
                                ...day.extraWindows,
                                { start: "20:00", end: "22:00", bookable: true },
                              ],
                            })
                          }
                        >
                          <Plus className="size-3.5" /> Adicionar janela
                        </Button>
                      </div>
                      {day.extraWindows.length ? (
                        <div className="mt-3 space-y-2">
                          {day.extraWindows.map((window, index) => (
                            <div key={`${id}-extra-${index}`} className="flex items-end gap-2">
                              <TimeField
                                label="Início"
                                value={window.start}
                                disabled={!canEdit}
                                onChange={(value) =>
                                  updateDay(id, {
                                    extraWindows: day.extraWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, start: value } : item,
                                    ),
                                  })
                                }
                              />
                              <TimeField
                                label="Fim"
                                value={window.end}
                                disabled={!canEdit}
                                onChange={(value) =>
                                  updateDay(id, {
                                    extraWindows: day.extraWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, end: value } : item,
                                    ),
                                  })
                                }
                              />
                              <label className="flex min-h-10 min-w-44 flex-1 flex-col justify-center gap-1 text-[11px] font-medium">
                                <span className="text-muted-foreground">Tipo de janela</span>
                                <select
                                  value={window.bookable ? "bookable" : "blocked"}
                                  disabled={!canEdit}
                                  onChange={(event) =>
                                    updateDay(id, {
                                      extraWindows: day.extraWindows.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, bookable: event.target.value === "bookable" }
                                          : item,
                                      ),
                                    })
                                  }
                                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                                >
                                  <option value="bookable">Livre para agendamento</option>
                                  <option value="blocked">Bloqueada sem agendamento</option>
                                </select>
                              </label>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={!canEdit}
                                aria-label="Remover janela extra"
                                onClick={() =>
                                  updateDay(id, {
                                    extraWindows: day.extraWindows.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  })
                                }
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
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
