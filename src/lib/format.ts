export const brl = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

export const brlShort = (value: number | null | undefined) => {
  const n = Number(value ?? 0);
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return brl(n);
};

export const dateFmt = (value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", opts ?? { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        typeof value === "string" ? new Date(value) : value,
      )
    : "—";

export const timeFmt = (value: string | Date | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
        typeof value === "string" ? new Date(value) : value,
      )
    : "—";

export const longDate = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(value);

export const isoDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

export const startOfWeek = (d: Date) => addDays(isoDay(d), -((d.getDay() + 6) % 7));

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

export const initials = (name?: string | null) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
