import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
      {
        name: "description",
        content: "Cadastro de procedimentos, preços, comissões e pacotes de sessões.",
      },
      { property: "og:title", content: "Procedimentos e pacotes — Aura Clínicas" },
      {
        property: "og:description",
        content: "Preços, duração, comissões e pacotes da sua clínica.",
      },
    ],
  }),
  component: Servicos,
});

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number;
  commission_value: number;
  commission_type: "percentual" | "fixo";
  active: boolean;
  online_booking: boolean;
};

function Servicos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [openService, setOpenService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [openPackage, setOpenPackage] = useState(false);
  const [openLibrary, setOpenLibrary] = useState(false);

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["services", orgId],
    queryFn: async () => {
      const [services, packages, items] = await Promise.all([
        supabase.from("services").select("*").order("name"),
        supabase.from("packages").select("*").order("name"),
        supabase.from("package_items").select("package_id, service_id, sessions"),
      ]);
      if (services.error) throw services.error;
      return {
        services: (services.data ?? []) as unknown as ServiceRow[],
        packages: packages.data ?? [],
        items: items.data ?? [],
      };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  async function toggleService(id: string, field: "active" | "online_booking", value: boolean) {
    const patch = field === "active" ? { active: value } : { online_booking: value };
    const { error } = await supabase.from("services").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  }

  async function togglePackage(id: string, field: "active" | "online_booking", value: boolean) {
    const patch = field === "active" ? { active: value } : { online_booking: value };
    const { error } = await supabase.from("packages").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  }

  async function deleteService(service: ServiceRow) {
    if (
      !window.confirm(
        `Excluir o procedimento “${service.name}”? O histórico de agendamentos e vendas será preservado, mas o procedimento sairá da lista.`,
      )
    )
      return;
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Procedimento excluído.");
      refresh();
    }
  }

  async function deletePackage(pkg: { id: string; name: string }) {
    if (
      !window.confirm(
        `Excluir o pacote “${pkg.name}”? As vendas e sessões já realizadas serão preservadas.`,
      )
    )
      return;
    const { error } = await supabase.from("packages").delete().eq("id", pkg.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Pacote excluído.");
      refresh();
    }
  }

  const serviceName = (id: string) =>
    data.data?.services.find((s) => s.id === id)?.name ?? "Procedimento";

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
          <div className="flex flex-wrap gap-2">
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
            <Dialog open={openLibrary} onOpenChange={setOpenLibrary}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Sparkles className="size-4" /> Biblioteca pronta
                </Button>
              </DialogTrigger>
              <LibraryDialog
                existing={(data.data?.services ?? []).map((s) => s.name.toLowerCase())}
                onDone={() => {
                  setOpenLibrary(false);
                  refresh();
                }}
              />
            </Dialog>
          </div>

          {data.isLoading ? (
            <SkeletonCard />
          ) : (data.data?.services.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhum procedimento cadastrado"
              description="Cadastre limpeza de pele, botox, drenagem... ou use a biblioteca pronta."
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
                    <p className="font-display text-base font-semibold tabular-nums">
                      {brl(Number(s.price))}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs">
                    <label className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      Ativo
                      <Switch
                        checked={s.active}
                        onCheckedChange={(v) => toggleService(s.id, "active", v)}
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      Agendamento online
                      <Switch
                        checked={s.online_booking}
                        onCheckedChange={(v) => toggleService(s.id, "online_booking", v)}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingService(s)}
                    >
                      <Pencil className="size-3.5" /> Editar procedimento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-destructive hover:text-destructive"
                      onClick={() => deleteService(s)}
                    >
                      <Trash2 className="size-3.5" /> Excluir procedimento
                    </Button>
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
              {data.data!.packages.map((p) => {
                const items = (data.data?.items ?? []).filter((i) => i.package_id === p.id);
                return (
                  <li key={p.id} className="surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {items.reduce((sum, i) => sum + i.sessions, 0) || p.sessions} sessões ·
                          validade {p.validity_days} dias
                        </p>
                      </div>
                      <p className="font-display text-base font-semibold tabular-nums">
                        {brl(Number(p.price))}
                      </p>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {items.map((i) => (
                        <li key={i.service_id}>
                          <Pill tone="neutral">
                            {i.sessions}x {serviceName(i.service_id)}
                          </Pill>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 grid gap-2 text-xs">
                      <label className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                        Ativo
                        <Switch
                          checked={p.active}
                          onCheckedChange={(v) => togglePackage(p.id, "active", v)}
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                        Agendamento online
                        <Switch
                          checked={p.online_booking}
                          onCheckedChange={(v) => togglePackage(p.id, "online_booking", v)}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-destructive hover:text-destructive"
                        onClick={() => deletePackage(p)}
                      >
                        <Trash2 className="size-3.5" /> Excluir pacote
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={!!editingService} onOpenChange={(value) => !value && setEditingService(null)}>
        {editingService ? (
          <ServiceDialog
            service={editingService}
            onDone={() => {
              setEditingService(null);
              refresh();
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function ServiceDialog({ onDone, service }: { onDone: () => void; service?: ServiceRow }) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    duration_min: String(service?.duration_min ?? 60),
    price: service ? String(service.price) : "",
    commission_value: String(service?.commission_value ?? 30),
    commission_type: service?.commission_type ?? ("percentual" as "percentual" | "fixo"),
    online_booking: service?.online_booking ?? true,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const values = {
        organization_id: membership.organization.id,
        name: form.name,
        description: form.description || null,
        duration_min: Number(form.duration_min),
        price: Number(form.price || 0),
        commission_value: Number(form.commission_value || 0),
        commission_type: form.commission_type,
        online_booking: form.online_booking,
      };
      const { error } = service
        ? await supabase.from("services").update(values).eq("id", service.id)
        : await supabase.from("services").insert(values);
      if (error) throw error;
      toast.success(service ? "Procedimento atualizado." : "Procedimento cadastrado.");
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
        <DialogTitle className="font-display">
          {service ? "Editar procedimento" : "Novo procedimento"}
        </DialogTitle>
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
              onValueChange={(v) =>
                setForm({ ...form, commission_type: v as "percentual" | "fixo" })
              }
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

/** Biblioteca pronta: procedimentos comuns por categoria, com preço e duração editáveis depois. */
function LibraryDialog({ existing, onDone }: { existing: string[]; onDone: () => void }) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const library = useQuery({
    queryKey: ["service-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("id, category, name, duration_min, position")
        .order("category")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = (library.data ?? []).reduce<Record<string, typeof library.data>>((acc, item) => {
    (acc[item.category] ??= [] as never)!.push(item as never);
    return acc;
  }, {});

  async function save() {
    if (!membership || picked.length === 0) return;
    setSaving(true);
    try {
      const rows = (library.data ?? [])
        .filter((l) => picked.includes(l.id))
        .map((l) => ({
          organization_id: membership.organization.id,
          name: l.name,
          duration_min: l.duration_min,
          price: 0,
          online_booking: true,
        }));
      const { error } = await supabase.from("services").insert(rows);
      if (error) throw error;
      toast.success("Procedimentos adicionados. Defina os preços em seguida.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Biblioteca de procedimentos</DialogTitle>
      </DialogHeader>
      <p className="text-xs text-muted-foreground">
        Selecione os procedimentos que sua clínica realiza. Eles entram com preço zerado — ajuste
        depois.
      </p>
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
            <ul className="grid gap-1.5">
              {(items ?? []).map((item) => {
                const already = existing.includes(item.name.toLowerCase());
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`lib-${item.id}`}
                      disabled={already}
                      checked={picked.includes(item.id)}
                      onCheckedChange={(v) =>
                        setPicked((prev) =>
                          v ? [...prev, item.id] : prev.filter((p) => p !== item.id),
                        )
                      }
                    />
                    <Label htmlFor={`lib-${item.id}`} className="flex-1 text-sm font-normal">
                      {item.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {item.duration_min} min
                      </span>
                    </Label>
                    {already ? (
                      <span className="text-xs text-muted-foreground">já cadastrado</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || picked.length === 0}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null} Adicionar{" "}
          {picked.length || ""}
        </Button>
      </DialogFooter>
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
  const [items, setItems] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    validity_days: "180",
    online_booking: true,
  });

  const totalSessions = Object.values(items).reduce((sum, n) => sum + n, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    const entries = Object.entries(items).filter(([, n]) => n > 0);
    if (entries.length === 0) {
      toast.error("Selecione ao menos um procedimento para o pacote.");
      return;
    }
    setSaving(true);
    try {
      const orgId = membership.organization.id;
      const { data: created, error } = await supabase
        .from("packages")
        .insert({
          organization_id: orgId,
          name: form.name,
          description: form.description || null,
          service_id: entries[0]![0],
          sessions: totalSessions,
          price: Number(form.price || 0),
          validity_days: Number(form.validity_days),
          online_booking: form.online_booking,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("package_items").insert(
        entries.map(([service_id, sessions]) => ({
          organization_id: orgId,
          package_id: created!.id,
          service_id,
          sessions,
        })),
      );
      if (itemsError) throw itemsError;

      toast.success("Pacote criado.");
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
        <DialogTitle className="font-display">Novo pacote</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nome do pacote</Label>
          <Input
            id="p-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Pacote Corporal Completo"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Descrição</Label>
          <Textarea
            id="p-desc"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="O que está incluído no pacote"
          />
        </div>

        <div className="space-y-2">
          <Label>Procedimentos incluídos ({totalSessions} sessões)</Label>
          <ul className="grid max-h-56 gap-1.5 overflow-y-auto">
            {services.map((s) => {
              const checked = items[s.id] !== undefined;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <Checkbox
                    id={`pk-${s.id}`}
                    checked={checked}
                    onCheckedChange={(v) =>
                      setItems((prev) => {
                        const next = { ...prev };
                        if (v) next[s.id] = 1;
                        else delete next[s.id];
                        return next;
                      })
                    }
                  />
                  <Label htmlFor={`pk-${s.id}`} className="flex-1 text-sm font-normal">
                    {s.name}
                  </Label>
                  {checked ? (
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20"
                      value={items[s.id]}
                      onChange={(e) =>
                        setItems((prev) => ({
                          ...prev,
                          [s.id]: Math.max(1, Number(e.target.value || 1)),
                        }))
                      }
                    />
                  ) : null}
                </li>
              );
            })}
            {services.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                Cadastre procedimentos antes de criar pacotes.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <Label htmlFor="p-validity">Validade (dias)</Label>
            <Input
              id="p-validity"
              type="number"
              min={1}
              value={form.validity_days}
              onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
          <Label htmlFor="p-online" className="text-sm">
            Disponível para agendamento online
          </Label>
          <Switch
            id="p-online"
            checked={form.online_booking}
            onCheckedChange={(v) => setForm({ ...form, online_booking: v })}
          />
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
