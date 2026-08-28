import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
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
      { name: "description", content: "Base de clientes com histórico, tags e prontuário digital." },
      { property: "og:title", content: "Clientes — Aura Clínicas" },
      { property: "og:description", content: "Base de clientes da sua clínica de estética." },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const clients = useQuery({
    enabled: !!orgId,
    queryKey: ["clients", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email, tags, birth_date, created_at")
        .is("deleted_at", null)
        .order("name");
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
        title="Clientes"
        subtitle={`${clients.data?.length ?? 0} cadastros ativos`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo cliente
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
          placeholder="Buscar por nome, telefone ou e-mail"
          className="pl-9"
        />
      </div>

      {clients.isLoading ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Cadastre sua base de clientes para acompanhar histórico, pacotes e prontuários."
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
                    {c.phone ?? c.email ?? "Sem contato"}
                  </p>
                </div>
                {c.birth_date ? <Pill tone="gold">{dateFmt(c.birth_date, { day: "2-digit", month: "2-digit" })}</Pill> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewClientDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
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
      toast.success("Cliente cadastrado.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">Novo cliente</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Nome completo</Label>
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
            <Label htmlFor="c-birth">Nascimento</Label>
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
            <Label htmlFor="c-origin">Como conheceu</Label>
            <Input
              id="c-origin"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder="Instagram, indicação..."
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-notes">Observações</Label>
          <Textarea
            id="c-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Cadastrar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
