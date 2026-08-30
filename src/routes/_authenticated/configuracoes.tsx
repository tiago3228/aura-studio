import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole, roleLabel } from "@/lib/session";
import { slugify } from "@/lib/format";
import { PageHeader, Surface, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Aura Clínicas" },
      { name: "description", content: "Dados da clínica, link de agendamento online e preferências." },
      { property: "og:title", content: "Configurações — Aura Clínicas" },
      { property: "og:description", content: "Ajuste os dados e o agendamento online da clínica." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { data: membership, isLoading } = useMembership();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    address: "",
    city: "",
    state: "",
    booking_slug: "",
    online_booking_enabled: true,
  });

  const org = membership?.organization;

  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name ?? "",
      description: org.description ?? "",
      phone: org.phone ?? "",
      whatsapp: org.whatsapp ?? "",
      instagram: org.instagram ?? "",
      address: org.address ?? "",
      city: org.city ?? "",
      state: org.state ?? "",
      booking_slug: org.booking_slug ?? "",
      online_booking_enabled: org.online_booking_enabled ?? true,
    });
  }, [org]);

  if (isLoading || !org) return <SkeletonCard />;
  const canEdit = isAdminRole(membership?.role);
  const bookingUrl =
    typeof window !== "undefined" && form.booking_slug
      ? `${window.location.origin}/agendar/${form.booking_slug}`
      : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: form.name,
          description: form.description || null,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          instagram: form.instagram || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          booking_slug: slugify(form.booking_slug || form.name),
          online_booking_enabled: form.online_booking_enabled,
        })
        .eq("id", org.id);
      if (error) throw error;
      toast.success("Configurações salvas.");
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Configurações" subtitle={`Seu acesso: ${roleLabel[membership!.role]}`} />

      <form onSubmit={save} className="space-y-6">
        <Surface className="space-y-4 p-5">
          <h2 className="font-display text-base font-semibold">Dados da clínica</h2>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-name">Nome</Label>
            <Input
              id="cfg-name"
              value={form.name}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-desc">Descrição</Label>
            <Textarea
              id="cfg-desc"
              rows={3}
              value={form.description}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-phone">Telefone</Label>
              <Input
                id="cfg-phone"
                value={form.phone}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-wpp">WhatsApp</Label>
              <Input
                id="cfg-wpp"
                value={form.whatsapp}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-insta">Instagram</Label>
              <Input
                id="cfg-insta"
                value={form.instagram}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-city">Cidade</Label>
              <Input
                id="cfg-city"
                value={form.city}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-addr">Endereço</Label>
            <Input
              id="cfg-addr"
              value={form.address}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </Surface>

        <Surface className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">Agendamento online</h2>
              <p className="text-xs text-muted-foreground">Página pública para clientes marcarem sozinhos.</p>
            </div>
            <Switch
              checked={form.online_booking_enabled}
              disabled={!canEdit}
              onCheckedChange={(v) => setForm({ ...form, online_booking_enabled: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-slug">Link personalizado</Label>
            <Input
              id="cfg-slug"
              value={form.booking_slug}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, booking_slug: e.target.value })}
            />
          </div>
          {bookingUrl ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{bookingUrl}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(bookingUrl);
                  toast.success("Link copiado.");
                }}
              >
                <Copy className="size-3.5" /> Copiar
              </Button>
            </div>
          ) : null}
        </Surface>

        {canEdit ? (
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar alterações
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas proprietários e gerentes podem alterar as configurações.
          </p>
        )}
      </form>
    </div>
  );
}
