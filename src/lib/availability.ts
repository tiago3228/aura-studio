/** Utilidades de disponibilidade (fuso fixo do Brasil, UTC-3). */
export const BR_OFFSET = "-03:00";

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(":");
  return Number(h) * 60 + Number(m);
}

export function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Instante UTC correspondente a uma data (YYYY-MM-DD) + minutos locais no fuso BR. */
export function brInstant(day: string, minutes: number) {
  return new Date(`${day}T${fromMinutes(minutes)}:00${BR_OFFSET}`);
}

/** Dia da semana (0=domingo) da data local, sem depender do fuso do servidor. */
export function weekdayOf(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export type SlotConfig = {
  workDays: number[];
  workStart: string;
  workEnd: string;
  lunchEnabled: boolean;
  lunchStart: string;
  lunchEnd: string;
  slotMinutes: number;
  slotGap: number;
  horizonDays: number;
  clinicHours?: Record<string, ClinicDayConfig>;
};

export type ClinicDayConfig = {
  closed: boolean;
  start: string;
  end: string;
  lunchEnabled: boolean;
  lunchStart: string;
  lunchEnd: string;
  extraWindows?: ExtraWindow[];
};

export type ExtraWindow = { start: string; end: string; bookable?: boolean };

/** Intervalos ocupados no dia, em minutos locais. */
export type BusyRange = { start: number; end: number };

export function buildSlots(
  day: string,
  cfg: SlotConfig,
  durationMin: number,
  busy: BusyRange[],
  now = new Date(),
): string[] {
  if (!cfg.workDays.includes(weekdayOf(day))) return [];

  const clinicDay = cfg.clinicHours?.[String(weekdayOf(day))];
  if (clinicDay?.closed) return [];

  const professionalStart = toMinutes(cfg.workStart);
  const professionalEnd = toMinutes(cfg.workEnd);
  const primaryStart = Math.max(professionalStart, clinicDay ? toMinutes(clinicDay.start) : 0);
  const primaryEnd = Math.min(professionalEnd, clinicDay ? toMinutes(clinicDay.end) : 24 * 60);
  const windows: BusyRange[] = [];
  if (primaryStart < primaryEnd) windows.push({ start: primaryStart, end: primaryEnd });
  for (const extra of clinicDay?.extraWindows ?? []) {
    if (extra.bookable === false) continue;
    const extraStart = Math.max(professionalStart, toMinutes(extra.start));
    const extraEnd = Math.min(professionalEnd, toMinutes(extra.end));
    if (extraStart < extraEnd) windows.push({ start: extraStart, end: extraEnd });
  }
  if (!windows.length) return [];
  const step = Math.max(5, cfg.slotMinutes + Math.max(0, cfg.slotGap));
  const blocks: BusyRange[] = [...busy];
  if (cfg.lunchEnabled)
    blocks.push({ start: toMinutes(cfg.lunchStart), end: toMinutes(cfg.lunchEnd) });
  if (clinicDay?.lunchEnabled) {
    blocks.push({ start: toMinutes(clinicDay.lunchStart), end: toMinutes(clinicDay.lunchEnd) });
  }

  const slots: string[] = [];
  for (const window of windows) {
    for (let s = window.start; s + durationMin <= window.end; s += step) {
      const e = s + durationMin;
      if (blocks.some((b) => overlaps(s, e, b.start, b.end))) continue;
      if (brInstant(day, s).getTime() <= now.getTime()) continue;
      const slot = fromMinutes(s);
      if (!slots.includes(slot)) slots.push(slot);
    }
  }
  return slots.sort((a, b) => toMinutes(a) - toMinutes(b));
}
