import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  MessageCircle,
  Clipboard,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { addDays, brl, isoDay, longDate, startOfWeek, timeFmt, dateFmt } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageDialog, type MessageTarget } from "@/components/message-dialog";
import type { MessageEvent as MsgEvent } from "@/lib/messages";
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
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["appointment_status"];

const STATUSES: Status[] = [
  "agendado",
  "confirmado",
  "aguardando",
  "atendido",
  "cancelado",
  "faltou",
  "reagendado",
];

/** Cor e rótulo por status — usados na agenda e na legenda. */
const STATUS_META: Record<Status, { label: string; dot: string; bar: string; text: string }> = {
  agendado: { label: "Agendado", dot: "bg-amber-400", bar: "bg-amber-400", text: "text-amber-700" },
  confirmado: {
    label: "Confirmado",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    text: "text-blue-700",
  },
  aguardando: {
    label: "Aguardando",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    text: "text-orange-700",
  },
  atendido: {
    label: "Atendido",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
  cancelado: { label: "Cancelado", dot: "bg-red-500", bar: "bg-red-500", text: "text-red-700" },
  faltou: {
    label: "Faltou",
    dot: "bg-neutral-700",
    bar: "bg-neutral-700",
    text: "text-neutral-700",
  },
  reagendado: {
    label: "Reagendado",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    text: "text-violet-700",
  },
};

function StatusLegend() {
  return (
    <div className="surface mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <span className="text-xs font-semibold text-muted-foreground">Legenda:</span>
      {STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5 text-xs">
          <span className={`size-2.5 rounded-full ${STATUS_META[s].dot}`} aria-hidden />
          {STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Aura Clínicas" },
      {
        name: "description",
        content: "Agenda por dia e semana com bloqueio automático de conflitos.",
      },
      { property: "og:title", content: "Agenda — Aura Clínicas" },
      { property: "og:description", content: "Agenda por dia e semana da sua clínica." },
    ],
  }),
  component: Agenda,
});

function Agenda() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState(() => isoDay(new Date()));
  const [view, setView] = useState<"dia" | "semana">("dia");
  const [locationId, setLocationId] = useState("");
  const [open, setOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null);
  const bookingUrl =
    typeof window !== "undefined" && membership?.organization.booking_slug
      ? `${window.location.origin}/agendar/${membership.organization.booking_slug}`
      : "";

  const range = useMemo(() => {
    const from = view === "dia" ? anchor : startOfWeek(anchor);
    const to = addDays(from, view === "dia" ? 1 : 7);
    return { from, to };
  }, [anchor, view]);

  const appointments = useQuery({
    enabled: !!orgId,
    queryKey: ["appointments", orgId, range.from.toISOString(), view, locationId],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, clients(name, phone), services(name), professionals(name)")
        .gte("starts_at", range.from.toISOString())
        .lt("starts_at", range.to.toISOString())
        .order("starts_at");
      if (locationId) query = query.eq("location_id", locationId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const locations = useQuery({
    enabled: !!orgId,
    queryKey: ["agenda-locations", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_locations")
        .select("id, name")
        .eq("active", true)
        .order("is_main", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lists = useQuery({
    enabled: !!orgId,
    queryKey: ["agenda-lists", orgId],
    queryFn: async () => {
      const [clients, services, professionals] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, phone, email")
          .is("deleted_at", null)
          .order("name"),
        supabase
          .from("services")
          .select("id, name, duration_min, price")
          .eq("active", true)
          .order("name"),
        supabase.from("professionals").select("id, name").eq("active", true).order("name"),
      ]);
      return {
        clients: clients.data ?? [],
        services: services.data ?? [],
        professionals: professionals.data ?? [],
      };
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;

      // Sessão de pacote só é consumida quando o atendimento acontece.
      if (status !== "atendido") return;
      const { data: appt } = await supabase
        .from("appointments")
        .select("client_package_id")
        .eq("id", id)
        .maybeSingle();
      if (!appt?.client_package_id) return;
      const { data: pack } = await supabase
        .from("client_packages")
        .select("sessions_used, sessions_total")
        .eq("id", appt.client_package_id)
        .maybeSingle();
      if (!pack) return;
      const used = Math.min(pack.sessions_used + 1, pack.sessions_total);
      await supabase
        .from("client_packages")
        .update({ sessions_used: used, active: used < pack.sessions_total })
        .eq("id", appt.client_package_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const days =
    view === "dia" ? [range.from] : Array.from({ length: 7 }, (_, i) => addDays(range.from, i));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Agenda"
        subtitle="Conflitos de profissional e sala são bloqueados automaticamente."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Agendar
              </Button>
            </DialogTrigger>
            <NewAppointmentDialog
              lists={lists.data}
              locationId={locationId || undefined}
              onDone={() => {
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["appointments"] });
              }}
            />
          </Dialog>
        }
      />

      <div className="surface mb-5 flex flex-wrap items-center gap-3 border-primary/20 bg-primary-soft/40 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">Agendamento online</p>
          <p className="mt-1 truncate text-sm font-medium">
            Envie este link para seus clientes agendarem sozinhos
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {bookingUrl || "Configure o link público em Configurações."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!bookingUrl}
            onClick={() => {
              void navigator.clipboard.writeText(bookingUrl);
              toast.success("Link copiado.");
            }}
          >
            <Clipboard className="size-4" /> Copiar link
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!bookingUrl}
            onClick={() => window.open(bookingUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-4" /> Abrir
          </Button>
        </div>
      </div>

      <div className="surface mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">Todas as filiais</option>
          {locations.data?.map((location) => (
            <option value={location.id} key={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor(addDays(anchor, view === "dia" ? -1 : -7))}
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-44 text-center text-sm font-semibold">
            {view === "dia"
              ? longDate(anchor)
              : `${dateFmt(range.from, { day: "2-digit", month: "short" })} – ${dateFmt(addDays(range.to, -1), { day: "2-digit", month: "short" })}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor(addDays(anchor, view === "dia" ? 1 : 7))}
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(isoDay(new Date()))}>
            Hoje
          </Button>
        </div>
        <div className="flex rounded-lg bg-muted p-1">
          {(["dia", "semana"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <StatusLegend />

      {appointments.isLoading ? (
        <SkeletonCard />
      ) : (appointments.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum agendamento neste período"
          description="Clique em Agendar para criar o primeiro atendimento — o sistema valida horários automaticamente."
        />
      ) : (
        <div
          className={view === "semana" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}
        >
          {days.map((day) => {
            const items = (appointments.data ?? []).filter(
              (a) => isoDay(new Date(a.starts_at)).getTime() === day.getTime(),
            );
            if (view === "dia") {
              return items.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appointment={a}
                  onStatus={setStatus.mutate}
                  onMessage={setMessageTarget}
                />
              ));
            }
            return (
              <section key={day.toISOString()} className="surface p-4">
                <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {dateFmt(day, { weekday: "short", day: "2-digit", month: "2-digit" })}
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Livre</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((a) => (
                      <li
                        key={a.id}
                        title={STATUS_META[a.status].label}
                        className="flex gap-2 rounded-lg bg-muted/60 p-2 text-xs"
                      >
                        <span
                          className={`w-1 shrink-0 rounded-full ${STATUS_META[a.status].bar}`}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="font-semibold tabular-nums">{timeFmt(a.starts_at)}</span>{" "}
                          {a.clients?.name ?? a.guest_name ?? "Cliente"}
                          <span className="block text-muted-foreground">{a.services?.name}</span>
                          <span className={`block font-semibold ${STATUS_META[a.status].text}`}>
                            {STATUS_META[a.status].label}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!messageTarget} onOpenChange={(v) => !v && setMessageTarget(null)}>
        {messageTarget ? (
          <MessageDialog target={messageTarget} onDone={() => setMessageTarget(null)} />
        ) : null}
      </Dialog>
    </div>
  );
}

type AppointmentRowProps = {
  appointment: {
    id: string;
    starts_at: string;
    ends_at: string;
    status: Status;
    price: number;
    notes: string | null;
    client_id: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    clients: { name: string; phone: string | null } | null;
    services: { name: string } | null;
    professionals: { name: string } | null;
  };
  onStatus: (input: { id: string; status: Status }) => void;
  onMessage: (target: MessageTarget) => void;
};

const SUGGESTED: Partial<Record<Status, MsgEvent>> = {
  confirmado: "confirmacao",
  cancelado: "cancelamento",
  reagendado: "reagendamento",
  atendido: "satisfacao",
};

function AppointmentRow({ appointment: a, onStatus, onMessage }: AppointmentRowProps) {
  const meta = STATUS_META[a.status];
  const target: MessageTarget = {
    appointmentId: a.id,
    clientId: a.client_id,
    clientName: a.clients?.name ?? a.guest_name ?? "Cliente",
    phone: a.clients?.phone ?? a.guest_phone,
    serviceName: a.services?.name ?? "atendimento",
    professionalName: a.professionals?.name ?? "nossa equipe",
    startsAt: a.starts_at,
    ...(SUGGESTED[a.status] ? { suggested: SUGGESTED[a.status]! } : {}),
  };

  return (
    <article
      className="surface surface-hover flex flex-wrap items-center gap-4 p-4"
      title={`Status: ${meta.label}`}
    >
      <span className={`h-10 w-1.5 shrink-0 rounded-full ${meta.bar}`} aria-hidden />
      <div className="w-14 shrink-0">
        <p className="font-display text-base font-semibold tabular-nums">{timeFmt(a.starts_at)}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">{timeFmt(a.ends_at)}</p>
      </div>
      <div className="min-w-40 flex-1">
        <p className="text-sm font-semibold">
          {a.clients?.name ?? a.guest_name ?? "Cliente avulso"}
        </p>
        <p className="text-xs text-muted-foreground">
          {a.services?.name ?? "Serviço"} · {a.professionals?.name ?? "Sem profissional"}
        </p>
        {a.notes ? <p className="mt-1 text-xs text-muted-foreground italic">{a.notes}</p> : null}
      </div>
      <span className="text-sm font-semibold tabular-nums">{brl(Number(a.price))}</span>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
        <span className={`size-2.5 rounded-full ${meta.dot}`} aria-hidden />
        {meta.label}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onMessage(target)}
        disabled={!target.phone}
        title={target.phone ? "Enviar mensagem ao cliente" : "Cliente sem WhatsApp cadastrado"}
      >
        <MessageCircle className="size-4" /> Mensagem
      </Button>
      <Select
        value={a.status}
        onValueChange={(status) => onStatus({ id: a.id, status: status as Status })}
      >
        <SelectTrigger className="w-36" aria-label="Alterar status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </article>
  );
}

type Lists = {
  clients: { id: string; name: string; phone: string | null; email: string | null }[];
  services: { id: string; name: string; duration_min: number; price: number }[];
  professionals: { id: string; name: string }[];
};

function NewAppointmentDialog({
  lists,
  locationId,
  onDone,
}: {
  lists: Lists | undefined;
  locationId?: string;
  onDone: () => void;
}) {
  const { data: membership } = useMembership();
  const [form, setForm] = useState({
    client_id: "",
    service_id: "",
    professional_id: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    notes: "",
    new_client_name: "",
    new_client_phone: "",
    new_client_email: "",
  });
  const [saving, setSaving] = useState(false);

  const service = lists?.services.find((s) => s.id === form.service_id);
  const isNewClient = form.client_id === "__new__";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const starts = new Date(`${form.date}T${form.time}:00`);
      const ends = new Date(starts.getTime() + (service?.duration_min ?? 60) * 60000);
      let clientId = form.client_id && form.client_id !== "__new__" ? form.client_id : null;
      if (isNewClient) {
        const name = form.new_client_name.trim();
        const phone = form.new_client_phone.trim();
        const email = form.new_client_email.trim().toLowerCase();
        if (!name) throw new Error("Informe o nome do cliente.");
        const normalizedPhone = phone.replace(/\D/g, "");
        const duplicate = lists?.clients.find(
          (client) =>
            (normalizedPhone && (client.phone ?? "").replace(/\D/g, "") === normalizedPhone) ||
            (email && (client.email ?? "").toLowerCase() === email),
        );
        if (duplicate) {
          clientId = duplicate.id;
          toast.info(
            `Cliente já cadastrado: ${duplicate.name}. O agendamento será vinculado a ele.`,
          );
        } else {
          const { data: created, error: clientError } = await supabase
            .from("clients")
            .insert({
              organization_id: membership.organization.id,
              location_id: locationId || null,
              name,
              phone: phone || null,
              whatsapp: phone || null,
              email: email || null,
              notes: form.notes || null,
            })
            .select("id")
            .single();
          if (clientError) throw clientError;
          clientId = created.id;
        }
      }
      const { error } = await supabase.from("appointments").insert({
        organization_id: membership.organization.id,
        location_id: locationId || null,
        client_id: clientId,
        service_id: form.service_id || null,
        professional_id: form.professional_id || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        price: service?.price ?? 0,
        notes: form.notes || null,
        source: "interno",
      });
      if (error) throw error;
      toast.success("Agendamento criado.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Novo agendamento</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__">+ Novo cliente neste agendamento</SelectItem>
              {lists?.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isNewClient ? (
          <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">Cadastro rápido do cliente</p>
            <div className="space-y-1.5">
              <Label htmlFor="new-client-name">Nome completo</Label>
              <Input
                id="new-client-name"
                value={form.new_client_name}
                onChange={(e) => setForm({ ...form, new_client_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-client-phone">WhatsApp</Label>
                <Input
                  id="new-client-phone"
                  value={form.new_client_phone}
                  onChange={(e) => setForm({ ...form, new_client_phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-client-email">E-mail</Label>
                <Input
                  id="new-client-email"
                  type="email"
                  value={form.new_client_email}
                  onChange={(e) => setForm({ ...form, new_client_email: e.target.value })}
                />
              </div>
            </div>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label>Procedimento</Label>
          <Select
            value={form.service_id}
            onValueChange={(v) => setForm({ ...form, service_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {lists?.services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {brl(Number(s.price))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Profissional</Label>
          <Select
            value={form.professional_id}
            onValueChange={(v) => setForm({ ...form, professional_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {lists?.professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
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
