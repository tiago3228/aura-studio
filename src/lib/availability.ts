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
};

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

  const startOfDay = toMinutes(cfg.workStart);
  const endOfDay = toMinutes(cfg.workEnd);
  const step = Math.max(5, cfg.slotMinutes + Math.max(0, cfg.slotGap));
  const blocks: BusyRange[] = [...busy];
  if (cfg.lunchEnabled) blocks.push({ start: toMinutes(cfg.lunchStart), end: toMinutes(cfg.lunchEnd) });

  const slots: string[] = [];
  for (let s = startOfDay; s + durationMin <= endOfDay; s += step) {
    const e = s + durationMin;
    if (blocks.some((b) => overlaps(s, e, b.start, b.end))) continue;
    if (brInstant(day, s).getTime() <= now.getTime()) continue;
    slots.push(fromMinutes(s));
  }
  return slots;
}
