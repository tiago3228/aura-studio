import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Procedimentos e pacotes — Aura Clínicas" },
      { name: "description", content: "Cadastro de procedimentos, preços, comissões e pacotes de sessões." },
      { property: "og:title", content: "Procedimentos e pacotes — Aura Clínicas" },
      { property: "og:description", content: "Preços, duração, comissões e pacotes da sua clínica." },
    ],
  }),
  component: Servicos,
});

function Servicos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [openService, setOpenService] = useState(false);
  const [openPackage, setOpenPackage] = useState(false);

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["services", orgId],
    queryFn: async () => {
      const [services, packages] = await Promise.all([
        supabase.from("services").select("*").order("name"),
        supabase.from("packages").select("*, services(name)").order("name"),
      ]);
      if (services.error) throw services.error;
      return { services: services.data, packages: packages.data ?? [] };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Procedimentos"
        subtitle="Preço, duração, comissão e disponibilidade para agendamento online."
      />

      <Tabs defaultValue="procedimentos">
        <TabsList>
          <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
          <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
        </TabsList>

        <TabsContent value="procedimentos" className="mt-4 space-y-4">
          <Dialog open={openService} onOpenChange={setOpenService}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo procedimento
              </Button>
            </DialogTrigger>
            <ServiceDialog
              onDone={() => {
                setOpenService(false);
                refresh();
              }}
            />
          </Dialog>

          {data.isLoading ? (
            <SkeletonCard />
          ) : (data.data?.services.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhum procedimento cadastrado"
              description="Cadastre limpeza de pele, botox, drenagem... com preço, duração e comissão."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.data!.services.map((s) => (
                <li key={s.id} className="surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.duration_min} min · comissão{" "}
                        {s.commission_type === "percentual"
                          ? `${Number(s.commission_value)}%`
                          : brl(Number(s.commission_value))}
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold tabular-nums">{brl(Number(s.price))}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Pill tone={s.active ? "success" : "neutral"}>{s.active ? "ativo" : "inativo"}</Pill>
                    {s.online_booking ? <Pill tone="primary">agendamento online</Pill> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="pacotes" className="mt-4 space-y-4">
          <Dialog open={openPackage} onOpenChange={setOpenPackage}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo pacote
              </Button>
            </DialogTrigger>
            <PackageDialog
              services={data.data?.services ?? []}
              onDone={() => {
                setOpenPackage(false);
                refresh();
              }}
            />
          </Dialog>

          {(data.data?.packages.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhum pacote"
              description="Pacotes de sessões aumentam a recorrência e o ticket médio."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.data!.packages.map((p) => (
                <li key={p.id} className="surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sessions} sessões · {p.services?.name ?? "múltiplos serviços"} · validade{" "}
                        {p.validity_days} dias
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold tabular-nums">{brl(Number(p.price))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServiceDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_min: "60",
    price: "",
    commission_value: "30",
    commission_type: "percentual" as "percentual" | "fixo",
    online_booking: true,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("services").insert({
        organization_id: membership.organization.id,
        name: form.name,
        description: form.description || null,
        duration_min: Number(form.duration_min),
        price: Number(form.price || 0),
        commission_value: Number(form.commission_value || 0),
        commission_type: form.commission_type,
        online_booking: form.online_booking,
      });
      if (error) throw error;
      toast.success("Procedimento cadastrado.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Novo procedimento</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-name">Nome</Label>
          <Input
            id="s-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Limpeza de pele profunda"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-duration">Duração (min)</Label>
            <Input
              id="s-duration"
              type="number"
              min={5}
              step={5}
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-price">Preço (R$)</Label>
            <Input
              id="s-price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-comm">Comissão</Label>
            <Input
              id="s-comm"
              type="number"
              min={0}
              step="0.01"
              value={form.commission_value}
              onChange={(e) => setForm({ ...form, commission_value: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.commission_type}
              onValueChange={(v) => setForm({ ...form, commission_type: v as "percentual" | "fixo" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-desc">Descrição</Label>
          <Textarea
            id="s-desc"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
          <Label htmlFor="s-online" className="text-sm">
            Disponível para agendamento online
          </Label>
          <Switch
            id="s-online"
            checked={form.online_booking}
            onCheckedChange={(v) => setForm({ ...form, online_booking: v })}
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

function PackageDialog({
  services,
  onDone,
}: {
  services: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    service_id: "",
    sessions: "10",
    price: "",
    validity_days: "180",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("packages").insert({
        organization_id: membership.organization.id,
        name: form.name,
        service_id: form.service_id || null,
        sessions: Number(form.sessions),
        price: Number(form.price || 0),
        validity_days: Number(form.validity_days),
      });
      if (error) throw error;
      toast.success("Pacote criado.");
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
        <DialogTitle className="font-display">Novo pacote</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nome do pacote</Label>
          <Input
            id="p-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Drenagem 10 sessões"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Procedimento vinculado</Label>
          <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-sessions">Sessões</Label>
            <Input
              id="p-sessions"
              type="number"
              min={1}
              value={form.sessions}
              onChange={(e) => setForm({ ...form, sessions: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-price">Preço</Label>
            <Input
              id="p-price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-validity">Validade</Label>
            <Input
              id="p-validity"
              type="number"
              min={1}
              value={form.validity_days}
              onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Criar pacote
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
