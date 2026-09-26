/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { PageHeader, Pill, Surface } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/filiais")({
  head: () => ({ meta: [{ title: "Filiais — Aura Clínicas" }] }),
  component: FiliaisPage,
});
function FiliaisPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", city: "", address: "" });
  const [saving, setSaving] = useState(false);
  const locations = useQuery({
    enabled: !!orgId,
    queryKey: ["locations", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organization_locations")
        .select("*")
        .order("is_main", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("organization_locations").insert({
      organization_id: orgId,
      ...form,
      code: form.code.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Filial cadastrada.");
    setForm({ name: "", code: "", city: "", address: "" });
    void queryClient.invalidateQueries({ queryKey: ["locations", orgId] });
    return;
  }
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Filiais" subtitle="Gerencie unidades, endereços e operação por local." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Surface className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Nova filial</h2>
          </div>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Unidade Vila Velha"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="vila-velha"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Cadastrar filial
          </Button>
        </Surface>
        <Surface className="divide-y divide-border p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Unidades cadastradas</h2>
          {locations.data?.map((location: any) => (
            <div className="flex items-center gap-3 py-4 first:pt-0" key={location.id}>
              <div className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{location.name}</p>
                <p className="text-xs text-muted-foreground">
                  {location.code} {location.city ? `· ${location.city}` : ""}
                </p>
              </div>
              <Pill tone={location.active ? "success" : "neutral"}>
                {location.is_main ? "Principal" : location.active ? "Ativa" : "Inativa"}
              </Pill>
            </div>
          ))}
          {!locations.data?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p>
          ) : null}
        </Surface>
      </div>
    </div>
  );
}
