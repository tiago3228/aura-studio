import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CalendarCheck, MapPin, Instagram, MessageCircle, Clock, Award } from "lucide-react";
import { toast } from "sonner";

import { getBookingPage, createPublicBooking, getAvailableSlots } from "@/lib/booking.functions";
import { brl, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/agendar/$slug")({
  head: () => ({
    meta: [
      { title: "Agendamento online — Aura" },
      { name: "description", content: "Escolha seu procedimento e horário e solicite seu agendamento online." },
      { property: "og:title", content: "Agendamento online" },
      { property: "og:description", content: "Escolha seu procedimento e horário em poucos toques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicBooking,
});

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function instagramUrl(value: string) {
  if (value.startsWith("http")) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

function PublicBooking() {
  const { slug } = Route.useParams();
  const load = useServerFn(getBookingPage);
  const loadSlots = useServerFn(getAvailableSlots);
  const submit = useServerFn(createPublicBooking);

  const page = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: () => load({ data: { slug } }),
  });

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const slots = useQuery({
    enabled: !!serviceId && !!professionalId && !!day,
    queryKey: ["booking-slots", slug, serviceId, professionalId, day],
    queryFn: () => loadSlots({ data: { slug, serviceId, professionalId, day } }),
  });

  if (page.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const org = page.data?.org;
  if (!org) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-semibold">Agendamento indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link não existe ou o agendamento online está desativado.
          </p>
        </div>
      </main>
    );
  }

  const brand = org.primary_color || "#1f6f5c";
  const accent = org.secondary_color || "#c9964f";
  const services = page.data!.services;
  const professionals = page.data!.professionals;
  const maxDay = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const addressLine = [org.address, [org.city, org.state].filter(Boolean).join(" — ")]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = addressLine
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.name} ${addressLine}`)}`
    : null;
  const whatsapp = org.whatsapp || org.phone;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId || !professionalId || !day || !time) {
      toast.error("Escolha profissional, procedimento, data e horário.");
      return;
    }
    setSending(true);
    try {
      const result = await submit({
        data: {
          slug,
          serviceId,
          professionalId,
          day,
          time,
          name: form.name,
          phone: form.phone,
          email: form.email,
          notes: form.notes,
        },
      });
      if (result.ok) setDone(true);
      else {
        toast.error(result.message);
        slots.refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível agendar.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div
            className="mx-auto grid size-12 place-items-center rounded-full"
            style={{ backgroundColor: `${brand}1a`, color: brand }}
          >
            <CalendarCheck className="size-5" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold">Solicitação enviada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {org.name} vai confirmar seu horário em breve
            {whatsapp ? ` pelo WhatsApp ${whatsapp}` : ""}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="px-5 pt-10 pb-8 text-center text-white" style={{ backgroundColor: brand }}>
        {org.logo_url ? (
          <img
            src={org.logo_url}
            alt={`Logo ${org.name}`}
            loading="lazy"
            className="mx-auto size-20 rounded-full border-2 border-white/40 object-cover"
          />
        ) : null}
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{org.name}</h1>
        {org.description ? (
          <p className="mx-auto mt-2 max-w-md text-sm text-white/80">{org.description}</p>
        ) : null}
        {addressLine ? (
          <a
            href={mapsUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/80 underline-offset-4 hover:underline"
          >
            <MapPin className="size-3.5" /> {addressLine}
          </a>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {whatsapp ? (
            <a
              href={`https://wa.me/55${onlyDigits(whatsapp)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={instagramUrl(org.instagram)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              <Instagram className="size-3.5" /> Instagram
            </a>
          ) : null}
        </div>
      </header>

      <form onSubmit={send} className="mx-auto max-w-2xl space-y-8 px-5 py-8">
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">Escolha o profissional</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {professionals.map((p) => {
              const selected = professionalId === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setProfessionalId(p.id);
                    setTime("");
                  }}
                  className="surface p-4 text-left transition-shadow"
                  style={selected ? { boxShadow: `0 0 0 2px ${brand}` } : undefined}
                >
                  <div className="flex items-center gap-3">
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.name}
                        loading="lazy"
                        className="size-14 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="grid size-14 shrink-0 place-items-center rounded-full text-sm font-semibold"
                        style={{ backgroundColor: `${brand}1a`, color: brand }}
                      >
                        {initials(p.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      {p.specialty ? (
                        <p className="truncate text-xs" style={{ color: accent }}>
                          {p.specialty}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {p.bio ? <p className="mt-3 text-xs text-muted-foreground">{p.bio}</p> : null}
                  {p.certifications ? (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Award className="mt-0.5 size-3.5 shrink-0" /> {p.certifications}
                    </p>
                  ) : null}
                  <span
                    className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                    style={
                      selected
                        ? { backgroundColor: brand, color: "#fff" }
                        : { backgroundColor: `${brand}14`, color: brand }
                    }
                  >
                    {selected ? "Selecionado" : "Agendar com este profissional"}
                  </span>
                </button>
              );
            })}
            {professionals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum profissional disponível online.</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">Escolha o procedimento</h2>
          <div className="grid gap-2">
            {services.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setTime("");
                }}
                className="surface flex items-start gap-3 p-4 text-left"
                style={serviceId === s.id ? { boxShadow: `0 0 0 2px ${brand}` } : undefined}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                  ) : null}
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {s.duration_min} min
                  </p>
                </div>
                <span className="font-display text-sm font-semibold" style={{ color: brand }}>
                  {brl(Number(s.promo_price ?? s.price))}
                </span>
              </button>
            ))}
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum procedimento disponível online.</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="bk-date">Data</Label>
          <Input
            id="bk-date"
            type="date"
            value={day}
            min={new Date().toISOString().slice(0, 10)}
            max={maxDay}
            onChange={(e) => {
              setDay(e.target.value);
              setTime("");
            }}
            required
          />
        </section>

        <section className="space-y-2">
          <Label>Horário</Label>
          {!serviceId || !professionalId || !day ? (
            <p className="text-xs text-muted-foreground">
              Escolha profissional, procedimento e data para ver os horários.
            </p>
          ) : slots.isFetching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (slots.data?.slots.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">
              {slots.data?.message ?? "Sem horários livres nesta data. Tente outro dia."}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.data!.slots.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setTime(s)}
                  className="rounded-lg border border-border px-2 py-2 text-xs font-semibold"
                  style={time === s ? { backgroundColor: brand, color: "#fff", borderColor: brand } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bk-name">Seu nome</Label>
            <Input
              id="bk-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-phone">WhatsApp</Label>
            <Input
              id="bk-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-email">E-mail (opcional)</Label>
            <Input
              id="bk-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-notes">Observações</Label>
            <Textarea
              id="bk-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={sending || !time}
          style={{ backgroundColor: brand, color: "#fff" }}
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : null} Confirmar agendamento
        </Button>
      </form>
    </main>
  );
}
