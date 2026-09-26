import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  CalendarCheck,
  MapPin,
  Instagram,
  MessageCircle,
  Clock,
  Award,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import {
  getBookingPage,
  createPublicBooking,
  getAvailableSlots,
  validatePublicCoupon,
} from "@/lib/booking.functions";
import { brl, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/agendar/$slug")({
  head: () => ({
    meta: [
      { title: "Agendamento online — Aura" },
      {
        name: "description",
        content: "Escolha seu procedimento ou pacote e solicite seu agendamento online.",
      },
      { property: "og:title", content: "Agendamento online" },
      {
        property: "og:description",
        content: "Procedimentos e pacotes com horários em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicBooking,
});

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function waLink(value: string) {
  const digits = onlyDigits(value);
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function instagramUrl(value: string) {
  if (value.startsWith("http")) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

function PublicBooking() {
  const { slug } = Route.useParams();
  const load = useServerFn(getBookingPage);
  const loadSlots = useServerFn(getAvailableSlots);
  const submit = useServerFn(createPublicBooking);
  const validateCoupon = useServerFn(validatePublicCoupon);

  const page = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: () => load({ data: { slug } }),
  });

  const [professionalId, setProfessionalId] = useState("");
  const [tab, setTab] = useState<"procedimentos" | "pacotes">("procedimentos");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [packageIds, setPackageIds] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    message: string;
    percentage: number;
  } | null>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const hasChoice = serviceIds.length > 0 || packageIds.length > 0;

  const slots = useQuery({
    enabled: hasChoice && !!professionalId && !!day,
    queryKey: [
      "booking-slots",
      slug,
      serviceIds.join(","),
      packageIds.join(","),
      professionalId,
      day,
    ],
    queryFn: () =>
      loadSlots({
        data: {
          slug,
          professionalId,
          day,
          ...(serviceIds.length ? { serviceIds } : {}),
          ...(packageIds.length ? { packageIds } : {}),
        },
      }),
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
  const professionals = page.data!.professionals;
  const selectedPro = professionals.find((p) => p.id === professionalId) ?? null;
  const selectedServices =
    selectedPro?.services.filter((service) => serviceIds.includes(service.id)) ?? [];
  const selectedDuration = selectedServices.reduce((sum, service) => sum + service.duration_min, 0);
  const selectedPrice = selectedServices.reduce(
    (sum, service) => sum + Number(service.promo_price ?? service.price),
    0,
  );
  const selectedPackages = selectedPro?.packages.filter((pkg) => packageIds.includes(pkg.id)) ?? [];
  const selectedPackagePrice = selectedPackages.reduce((sum, pkg) => sum + Number(pkg.price), 0);
  const originalPrice = selectedPackages.length > 0 ? selectedPackagePrice : selectedPrice;
  const discountAmount = couponResult?.valid
    ? Math.min(originalPrice, (originalPrice * couponResult.percentage) / 100)
    : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);
  const maxDay = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const addressLine = [org.address, [org.city, org.state].filter(Boolean).join(" — ")]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = addressLine
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.name} ${addressLine}`)}`
    : null;
  const whatsapp = org.whatsapp || org.phone;

  function resetChoice() {
    setServiceIds([]);
    setPackageIds([]);
    setTime("");
    setCouponResult(null);
  }

  async function validateCouponCode() {
    if (!couponCode.trim() || !hasChoice) return null;
    setValidatingCoupon(true);
    try {
      const packageServiceIds = selectedPackages.flatMap((pkg) =>
        pkg.items.map((item) => item.service_id),
      );
      const result = await validateCoupon({
        data: {
          slug,
          code: couponCode.trim(),
          serviceIds: [...new Set([...serviceIds, ...packageServiceIds])],
          phone: form.phone || undefined,
        },
      });
      setCouponResult({
        valid: result.valid,
        message: result.message,
        percentage: result.percentage ?? 0,
      });
      return result;
    } catch (err) {
      const result = {
        valid: false,
        message: "Não foi possível validar o cupom.",
        percentage: 0,
      };
      setCouponResult(result);
      if (err instanceof Error) toast.error(err.message);
      return result;
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function applyCoupon() {
    const result = await validateCouponCode();
    if (result?.valid) toast.success(`${result.percentage}% de desconto aplicado.`);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!professionalId || !hasChoice || !day || !time) {
      toast.error("Escolha profissional, serviço, data e horário.");
      return;
    }
    if (couponCode.trim()) {
      const result = await validateCouponCode();
      if (!result?.valid) return;
    }
    setSending(true);
    try {
      const result = await submit({
        data: {
          slug,
          professionalId,
          day,
          time,
          name: form.name,
          phone: form.phone,
          email: form.email,
          notes: form.notes,
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(serviceIds.length ? { serviceIds } : {}),
          ...(packageIds.length ? { packageIds } : {}),
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
          <h1 className="mt-4 font-display text-xl font-semibold">
            Agendamento realizado com sucesso!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {org.name} vai confirmar seu horário em breve.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {whatsapp ? (
              <a
                href={waLink(whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: brand }}
              >
                Falar pelo WhatsApp
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setDone(false);
                resetChoice();
                setDay("");
              }}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"
            >
              Voltar para a página da clínica
            </button>
          </div>
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
              href={waLink(whatsapp)}
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
          <h2 className="font-display text-base font-semibold">1. Escolha o profissional</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {professionals.map((p) => {
              const selected = professionalId === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setProfessionalId(p.id);
                    resetChoice();
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
              <p className="text-sm text-muted-foreground">
                Nenhum profissional disponível online.
              </p>
            ) : null}
          </div>
        </section>

        {selectedPro ? (
          <section className="space-y-3">
            <h2 className="font-display text-base font-semibold">2. Escolha o serviço</h2>
            <div className="flex rounded-lg bg-muted p-1">
              {(["procedimentos", "pacotes"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    resetChoice();
                  }}
                  className="flex-1 rounded-md px-3 py-2 text-xs font-semibold capitalize"
                  style={tab === t ? { backgroundColor: "#fff", color: brand } : undefined}
                >
                  {t === "procedimentos" ? "Procedimentos" : "Pacotes"}
                </button>
              ))}
            </div>

            {tab === "procedimentos" ? (
              <div className="grid gap-2">
                {selectedPro.services.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setServiceIds((current) =>
                        current.includes(s.id)
                          ? current.filter((id) => id !== s.id)
                          : [...current, s.id],
                      );
                      setPackageIds([]);
                      setTime("");
                    }}
                    className="surface flex items-start gap-3 p-4 text-left"
                    style={
                      serviceIds.includes(s.id) ? { boxShadow: `0 0 0 2px ${brand}` } : undefined
                    }
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
                      <span>{brl(Number(s.promo_price ?? s.price))}</span>
                    </span>
                  </button>
                ))}
                {selectedServices.length > 0 ? (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <span>
                      <strong>{selectedServices.length}</strong> procedimento(s) selecionado(s)
                      <span className="ml-2 text-xs text-muted-foreground">
                        {selectedDuration} min
                      </span>
                    </span>
                    <strong style={{ color: brand }}>{brl(selectedPrice)}</strong>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Você pode selecionar mais de um procedimento.
                  </p>
                )}
                {selectedPro.services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este profissional não oferece procedimentos avulsos no momento. Veja a aba
                    Pacotes.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2">
                {selectedPro.packages.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setPackageIds((current) =>
                        current.includes(p.id)
                          ? current.filter((id) => id !== p.id)
                          : [...current, p.id],
                      );
                      setServiceIds([]);
                      setTime("");
                    }}
                    className="surface flex items-start gap-3 p-4 text-left"
                    style={
                      packageIds.includes(p.id) ? { boxShadow: `0 0 0 2px ${brand}` } : undefined
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <Layers className="size-3.5" style={{ color: accent }} /> {p.name}
                      </p>
                      {p.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                      ) : null}
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {p.items.map((i) => (
                          <li key={i.service_id}>
                            {i.sessions}x {i.service_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <span className="font-display text-sm font-semibold" style={{ color: brand }}>
                      {brl(Number(p.price))}
                    </span>
                  </button>
                ))}
                {selectedPackages.length > 0 ? (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <span>
                      <strong>{selectedPackages.length}</strong> pacote(s) selecionado(s)
                    </span>
                    <strong style={{ color: brand }}>{brl(selectedPackagePrice)}</strong>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Você pode selecionar mais de um pacote.
                  </p>
                )}
                {selectedPro.packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum pacote disponível no momento.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        <section className="space-y-2">
          <Label htmlFor="bk-date">3. Data</Label>
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
          <Label>4. Horário</Label>
          {!hasChoice || !professionalId || !day ? (
            <p className="text-xs text-muted-foreground">
              Escolha profissional, serviço e data para ver os horários.
            </p>
          ) : slots.isFetching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (slots.data?.slots.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">
              {slots.data?.message ?? "Sem horários livres nesta data. Tente outro dia."}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.data!.slots.map((s: string) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setTime(s)}
                  className="rounded-lg border border-border px-2 py-2 text-xs font-semibold"
                  style={
                    time === s
                      ? { backgroundColor: brand, color: "#fff", borderColor: brand }
                      : undefined
                  }
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
            <Label htmlFor="bk-coupon">Cupom de desconto</Label>
            <div className="flex gap-2">
              <Input
                id="bk-coupon"
                ref={couponInputRef}
                value={couponCode}
                placeholder="Ex.: DESCONTO10"
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponResult(null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCoupon}
                disabled={validatingCoupon || !hasChoice}
              >
                {validatingCoupon ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
            {couponResult ? (
              <p
                className={`text-xs ${couponResult.valid ? "text-emerald-700" : "text-destructive"}`}
              >
                {couponResult.message}
              </p>
            ) : null}
            {couponResult && !couponResult.valid ? (
              <div
                className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                role="alert"
              >
                <p className="text-sm font-medium text-destructive">
                  Este cupom não é válido. Deseja continuar o agendamento sem usar cupom?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCouponCode("");
                      setCouponResult(null);
                      couponInputRef.current?.focus();
                    }}
                  >
                    Não, inserir outro cupom
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCouponCode("");
                      setCouponResult(null);
                    }}
                  >
                    Sim, continuar agendamento
                  </Button>
                </div>
              </div>
            ) : null}
            {couponResult?.valid ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Valor original</span>
                  <span>{brl(originalPrice)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Desconto ({couponResult.percentage}%)</span>
                  <span>- {brl(discountAmount)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-primary/10 pt-1 font-semibold">
                  <span>Total</span>
                  <span>{brl(finalPrice)}</span>
                </div>
              </div>
            ) : null}
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
          disabled={sending || validatingCoupon || !time}
          style={{ backgroundColor: brand, color: "#fff" }}
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : null} Confirmar agendamento
        </Button>
      </form>
      <footer className="px-5 pb-8 text-center">
        <a
          href="https://clinica-estetica-br.lovable.app"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Conheça o Aura para sua clínica
        </a>
      </footer>
    </main>
  );
}
