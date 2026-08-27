import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { addDays, brl, isoDay, longDate, startOfWeek, timeFmt, dateFmt } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
];

const statusTone = {
  agendado: "neutral",
  confirmado: "primary",
  aguardando: "gold",
  atendido: "success",
  cancelado: "danger",
  faltou: "danger",
  reagendado: "gold",
} as const;

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Aura Clínicas" },
      { name: "description", content: "Agenda por dia e semana com bloqueio automático de conflitos." },
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
  const [open, setOpen] = useState(false);

  const range = useMemo(() => {
    const from = view === "dia" ? anchor : startOfWeek(anchor);
    const to = addDays(from, view === "dia" ? 1 : 7);
    return { from, to };
  }, [anchor, view]);

  const appointments = useQuery({
    enabled: !!orgId,
    queryKey: ["appointments", orgId, range.from.toISOString(), view],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name, phone), services(name), professionals(name)")
        .gte("starts_at", range.from.toISOString())
        .lt("starts_at", range.to.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });

  const lists = useQuery({
    enabled: !!orgId,
    queryKey: ["agenda-lists", orgId],
    queryFn: async () => {
      const [clients, services, professionals] = await Promise.all([
        supabase.from("clients").select("id, name").is("deleted_at", null).order("name"),
        supabase.from("services").select("id, name, duration_min, price").eq("active", true).order("name"),
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const days = view === "dia" ? [range.from] : Array.from({ length: 7 }, (_, i) => addDays(range.from, i));

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
              onDone={() => {
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["appointments"] });
              }}
            />
          </Dialog>
        }
      />

      <div className="surface mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
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

      {appointments.isLoading ? (
        <SkeletonCard />
      ) : (appointments.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum agendamento neste período"
          description="Clique em Agendar para criar o primeiro atendimento — o sistema valida horários automaticamente."
        />
      ) : (
        <div className={view === "semana" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {days.map((day) => {
            const items = (appointments.data ?? []).filter(
              (a) => isoDay(new Date(a.starts_at)).getTime() === day.getTime(),
            );
            if (view === "dia") {
              return items.map((a) => (
                <AppointmentRow key={a.id} appointment={a} onStatus={setStatus.mutate} />
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
                      <li key={a.id} className="rounded-lg bg-muted/60 p-2 text-xs">
                        <span className="font-semibold tabular-nums">{timeFmt(a.starts_at)}</span>{" "}
                        {a.clients?.name ?? a.guest_name ?? "Cliente"}
                        <span className="block text-muted-foreground">{a.services?.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
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
    guest_name: string | null;
    clients: { name: string } | null;
    services: { name: string } | null;
    professionals: { name: string } | null;
  };
  onStatus: (input: { id: string; status: Status }) => void;
};

function AppointmentRow({ appointment: a, onStatus }: AppointmentRowProps) {
  return (
    <article className="surface surface-hover flex flex-wrap items-center gap-4 p-4">
      <div className="w-16 shrink-0">
        <p className="font-display text-base font-semibold tabular-nums">{timeFmt(a.starts_at)}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">{timeFmt(a.ends_at)}</p>
      </div>
      <div className="min-w-40 flex-1">
        <p className="text-sm font-semibold">{a.clients?.name ?? a.guest_name ?? "Cliente avulso"}</p>
        <p className="text-xs text-muted-foreground">
          {a.services?.name ?? "Serviço"} · {a.professionals?.name ?? "Sem profissional"}
        </p>
        {a.notes ? <p className="mt-1 text-xs text-muted-foreground italic">{a.notes}</p> : null}
      </div>
      <span className="text-sm font-semibold tabular-nums">{brl(Number(a.price))}</span>
      <Pill tone={statusTone[a.status]}>{a.status}</Pill>
      <Select value={a.status} onValueChange={(status) => onStatus({ id: a.id, status: status as Status })}>
        <SelectTrigger className="w-36" aria-label="Alterar status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </article>
  );
}

type Lists = {
  clients: { id: string; name: string }[];
  services: { id: string; name: string; duration_min: number; price: number }[];
  professionals: { id: string; name: string }[];
};

function NewAppointmentDialog({ lists, onDone }: { lists?: Lists; onDone: () => void }) {
  const { data: membership } = useMembership();
  const [form, setForm] = useState({
    client_id: "",
    service_id: "",
    professional_id: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const service = lists?.services.find((s) => s.id === form.service_id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const starts = new Date(`${form.date}T${form.time}:00`);
      const ends = new Date(starts.getTime() + (service?.duration_min ?? 60) * 60000);
      const { error } = await supabase.from("appointments").insert({
        organization_id: membership.organization.id,
        client_id: form.client_id || null,
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
              {lists?.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Procedimento</Label>
          <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
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
