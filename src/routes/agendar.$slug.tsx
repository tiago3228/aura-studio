import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CalendarCheck, MapPin } from "lucide-react";
import { toast } from "sonner";

import { getBookingPage, createPublicBooking } from "@/lib/booking.functions";
import { brl } from "@/lib/format";
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

function PublicBooking() {
  const { slug } = Route.useParams();
  const load = useServerFn(getBookingPage);
  const submit = useServerFn(createPublicBooking);

  const page = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: () => load({ data: { slug } }),
  });

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

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

  const services = page.data!.services;
  const professionals = page.data!.professionals;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId || !date || !time) {
      toast.error("Escolha procedimento, data e horário.");
      return;
    }
    setSending(true);
    try {
      const result = await submit({
        data: {
          slug,
          serviceId,
          professionalId: professionalId || null,
          startsAt: new Date(`${date}T${time}`).toISOString(),
          name: form.name,
          phone: form.phone,
          email: form.email,
          notes: form.notes,
        },
      });
      if (result.ok) setDone(true);
      else toast.error(result.message);
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
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft">
            <CalendarCheck className="size-5 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold">Solicitação enviada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {org.name} vai confirmar seu horário em breve
            {org.whatsapp ? ` pelo WhatsApp ${org.whatsapp}` : ""}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <header className="text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{org.name}</h1>
        {org.description ? <p className="mt-2 text-sm text-muted-foreground">{org.description}</p> : null}
        {org.city ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {org.city}
          </p>
        ) : null}
      </header>

      <form onSubmit={send} className="mt-8 space-y-6">
        <section className="space-y-2">
          <Label>Procedimento</Label>
          <div className="grid gap-2">
            {services.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`surface flex items-center gap-3 p-4 text-left transition-colors ${
                  serviceId === s.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.duration_min} min</p>
                </div>
                <span className="font-display text-sm font-semibold">
                  {brl(Number(s.promo_price ?? s.price))}
                </span>
              </button>
            ))}
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum procedimento disponível online.</p>
            ) : null}
          </div>
        </section>

        {professionals.length > 0 ? (
          <section className="space-y-2">
            <Label>Profissional (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {professionals.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfessionalId(professionalId === p.id ? "" : p.id)}
                  className={`rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors ${
                    professionalId === p.id ? "bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bk-date">Data</Label>
            <Input id="bk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-time">Horário</Label>
            <Input id="bk-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

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

        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : null} Solicitar agendamento
        </Button>
      </form>
    </main>
  );
}
