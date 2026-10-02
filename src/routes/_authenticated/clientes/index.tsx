import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Scale } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { useLanguage } from "@/lib/language";
import { dateFmt, initials } from "@/lib/format";
import { PageHeader, SkeletonCard, EmptyState, Pill } from "@/components/ui-kit";
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

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Aura Clínicas" },
      {
        name: "description",
        content: "Base de clientes com histórico, tags e prontuário digital.",
      },
      { property: "og:title", content: "Clientes — Aura Clínicas" },
      { property: "og:description", content: "Base de clientes da sua clínica de estética." },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { data: membership } = useMembership();
  const { t } = useLanguage();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const clients = useQuery({
    enabled: !!orgId,
    queryKey: ["clients", orgId],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email, tags, birth_date, created_at")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("name")
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

  const filtered = (clients.data ?? []).filter((c) =>
    `${c.name} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("Clientes")}
        subtitle={`${clients.data?.length ?? 0} ${t("cadastros ativos")}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> {t("Novo cliente")}
              </Button>
            </DialogTrigger>
            <NewClientDialog
              onDone={() => {
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["clients"] });
              }}
            />
          </Dialog>
        }
      />

      <div className="relative mb-5">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("Buscar por nome, telefone ou e-mail")}
          className="pl-9"
        />
      </div>

      {clients.data && clients.data.length > 1 ? (
        <div className="mb-5">
          <Button type="button" variant="outline" onClick={() => setCompareOpen((value) => !value)}>
            <Scale className="size-4" />{" "}
            {compareOpen ? "Ocultar comparação" : "Comparar evolução de duas pacientes"}
          </Button>
          {compareOpen ? <PatientComparison clients={clients.data} /> : null}
        </div>
      ) : null}

      {clients.isLoading ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("Nenhum cliente encontrado")}
          description={t(
            "Cadastre sua base de clientes para acompanhar histórico, pacotes e prontuários.",
          )}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to="/clientes/$id"
                params={{ id: c.id }}
                className="surface surface-hover flex items-center gap-3 p-4"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.phone ?? c.email ?? t("Sem contato")}
                  </p>
                </div>
                {c.birth_date ? (
                  <Pill tone="gold">
                    {dateFmt(c.birth_date, { day: "2-digit", month: "2-digit" })}
                  </Pill>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ComparisonClient = { id: string; name: string };
type ComparisonRecord = {
  client_id: string;
  performed_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
};

function PatientComparison({ clients }: { clients: ComparisonClient[] }) {
  const [firstId, setFirstId] = useState(clients[0]?.id ?? "");
  const [secondId, setSecondId] = useState(clients[1]?.id ?? "");
  const [metric, setMetric] = useState<"weight_kg" | "waist_cm" | "hip_cm">("weight_kg");
  const records = useQuery({
    enabled: Boolean(firstId && secondId && firstId !== secondId),
    queryKey: ["patient-comparison", firstId, secondId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_records")
        .select("client_id, performed_at, weight_kg, waist_cm, hip_cm")
        .in("client_id", [firstId, secondId])
        .order("performed_at", { ascending: true });
      if (error) throw error;
      return data as ComparisonRecord[];
    },
  });
  const first = clients.find((client) => client.id === firstId);
  const second = clients.find((client) => client.id === secondId);
  const byDate = new Map<string, { date: string; first?: number; second?: number }>();
  (records.data ?? []).forEach((record) => {
    const date = dateFmt(record.performed_at);
    const value = record[metric];
    if (value === null || value === undefined) return;
    const item = byDate.get(date) ?? { date };
    item[record.client_id === firstId ? "first" : "second"] = value;
    byDate.set(date, item);
  });
  const labels = { weight_kg: "Peso (kg)", waist_cm: "Cintura (cm)", hip_cm: "Quadril (cm)" };
  return (
    <section className="surface mt-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Comparativo de evolução</h3>
          <p className="text-xs text-muted-foreground">
            Compare uma medida de duas pacientes ao longo dos atendimentos.
          </p>
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={metric}
          onChange={(event) => setMetric(event.target.value as typeof metric)}
          aria-label="Métrica comparativa"
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={firstId}
          onChange={(event) => setFirstId(event.target.value)}
          aria-label="Primeira paciente"
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={secondId}
          onChange={(event) => setSecondId(event.target.value)}
          aria-label="Segunda paciente"
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      {firstId === secondId ? (
        <p className="mt-3 text-sm text-destructive">Selecione duas pacientes diferentes.</p>
      ) : null}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...byDate.values()]} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} width={42} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="first"
              name={first?.name ?? "Paciente 1"}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="second"
              name={second?.name ?? "Paciente 2"}
              stroke="#c084fc"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!records.isLoading && byDate.size === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Ainda não há registros para essa métrica nas pacientes selecionadas.
        </p>
      ) : null}
    </section>
  );
}

function NewClientDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    birth_date: "",
    origin: "",
    notes: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("clients").insert({
        organization_id: membership.organization.id,
        name: form.name,
        phone: form.phone || null,
        whatsapp: form.phone || null,
        email: form.email || null,
        birth_date: form.birth_date || null,
        origin: form.origin || null,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success(t("Cliente cadastrado."));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Erro ao salvar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">{t("Novo cliente")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">{t("Nome completo")}</Label>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">WhatsApp</Label>
            <Input
              id="c-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-birth">{t("Nascimento")}</Label>
            <Input
              id="c-birth"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-email">E-mail</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-origin">{t("Como conheceu")}</Label>
            <Input
              id="c-origin"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder={t("Instagram, indicação...")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-notes">{t("Observações")}</Label>
          <Textarea
            id="c-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} {t("Cadastrar")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
