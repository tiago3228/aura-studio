/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole, roleLabel } from "@/lib/session";
import { slugify } from "@/lib/format";
import { publicAppUrl } from "@/lib/public-url";
import { resizeImage } from "@/lib/image";
import { PageHeader, Surface, SkeletonCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_TEMPLATES, MESSAGE_EVENTS, MESSAGE_VARIABLES } from "@/lib/messages";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Aura Clínicas" },
      {
        name: "description",
        content: "Dados da clínica, link de agendamento online e preferências.",
      },
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
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
    google_review_url: "",
    online_booking_enabled: true,
    logo_url: "",
    primary_color: "#1f6f5c",
    secondary_color: "#c9964f",
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
      google_review_url:
        (org as typeof org & { google_review_url?: string }).google_review_url ?? "",
      online_booking_enabled: org.online_booking_enabled ?? true,
      logo_url: org.logo_url ?? "",
      primary_color: org.primary_color || "#1f6f5c",
      secondary_color: org.secondary_color || "#c9964f",
    });
  }, [org]);

  useEffect(() => {
    let alive = true;
    const path = form.logo_url;
    if (!path) {
      setLogoPreview(null);
      return;
    }
    if (path.startsWith("http")) {
      setLogoPreview(path);
      return;
    }
    supabase.storage
      .from("clinic-files")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive) setLogoPreview(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [form.logo_url]);

  async function uploadLogo(file: File) {
    if (!org) return;
    setUploading(true);
    try {
      const resized = await resizeImage(file, 512);
      const path = `${org.id}/branding/logo-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("clinic-files")
        .upload(path, resized, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, logo_url: path }));
      toast.success("Logo carregada. Salve para publicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a logo.");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !org) return <SkeletonCard />;
  const canEdit = isAdminRole(membership?.role);
  const bookingUrl =
    form.booking_slug
      ? publicAppUrl(`/agendar/${form.booking_slug}`)
      : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
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
          google_review_url: form.google_review_url || null,
          online_booking_enabled: form.online_booking_enabled,
          logo_url: form.logo_url || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
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
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-addr">Endereço</Label>
              <Input
                id="cfg-addr"
                value={form.address}
                disabled={!canEdit}
                placeholder="Rua X, nº 100 — Centro"
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-state">Estado</Label>
              <Input
                id="cfg-state"
                value={form.state}
                maxLength={2}
                disabled={!canEdit}
                placeholder="ES"
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </Surface>

        <Surface className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">Avaliações no Google</h2>
            <p className="text-xs text-muted-foreground">
              Cole o link da sua página de avaliações. Ele será usado na mensagem de satisfação
              pós-atendimento.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-google-review">Link de avaliação do Google</Label>
            <Input
              id="cfg-google-review"
              type="url"
              placeholder="https://g.page/r/.../review"
              value={form.google_review_url}
              disabled={!canEdit}
              onChange={(e) => setForm({ ...form, google_review_url: e.target.value })}
            />
          </div>
        </Surface>

        <Surface className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">Personalização do link público</h2>
            <p className="text-xs text-muted-foreground">
              Logo e cores aparecem só na página pública — o sistema interno não muda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo da clínica"
                className="size-16 rounded-xl object-cover"
              />
            ) : (
              <span className="grid size-16 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                sem logo
              </span>
            )}
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
                  {uploading ? "Enviando..." : logoPreview ? "Trocar logo" : "Enviar logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogo(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {logoPreview ? (
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive"
                    onClick={() => setForm({ ...form, logo_url: "" })}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-primary">Cor principal</Label>
              <div className="flex items-center gap-2">
                <input
                  id="cfg-primary"
                  type="color"
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  value={form.primary_color}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                />
                <Input
                  value={form.primary_color}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-secondary">Cor de destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  id="cfg-secondary"
                  type="color"
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  value={form.secondary_color}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                />
                <Input
                  value={form.secondary_color}
                  disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div
              className="p-5 text-center text-white"
              style={{ backgroundColor: form.primary_color }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt=""
                  className="mx-auto size-12 rounded-full border border-white/40 object-cover"
                />
              ) : null}
              <p className="mt-2 font-display text-base font-semibold">
                {form.name || "Sua clínica"}
              </p>
              {form.address || form.city ? (
                <p className="mt-1 text-xs text-white/80">
                  {[form.address, [form.city, form.state].filter(Boolean).join(" — ")]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
              <span className="text-xs text-muted-foreground">Prévia da página pública</span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: form.secondary_color }}
              >
                Agendar
              </span>
            </div>
          </div>
        </Surface>

        <Surface className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">Agendamento online</h2>
              <p className="text-xs text-muted-foreground">
                Página pública para clientes marcarem sozinhos.
              </p>
            </div>
            <Switch
              checked={form.online_booking_enabled}
              disabled={!canEdit}
              onCheckedChange={(v) => setForm({ ...form, online_booking_enabled: v })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cfg-slug">Link personalizado</Label>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      booking_slug: slugify(form.name.split(/\s+/)[0] || "clinica"),
                    })
                  }
                >
                  Usar slug curto
                </Button>
              ) : null}
            </div>
            <Input
              id="cfg-slug"
              value={form.booking_slug}
              disabled={!canEdit}
              placeholder="cardoso"
              onChange={(e) =>
                setForm({
                  ...form,
                  booking_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
              onBlur={() => setForm({ ...form, booking_slug: slugify(form.booking_slug) })}
            />
            <p className="text-xs text-muted-foreground">
              Use apenas um nome curto, sem espaços ou acentos. Exemplo: <strong>cardoso</strong>. O
              domínio longo é o endereço de prévia do Lovable; com um domínio próprio configurado,
              ele também ficará curto.
            </p>
          </div>
          {bookingUrl ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {bookingUrl}
              </span>
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
          <p className="text-xs text-muted-foreground">
            Este link usa o endereço público publicado e abre para suas clientes sem exigir acesso
            ao projeto.
          </p>
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

      <MessageTemplates canEdit={canEdit} orgId={org?.id} />
    </div>
  );
}

/** Ajustes → Mensagens: modelos usados no envio manual pelo WhatsApp. */
function MessageTemplates({ canEdit, orgId }: { canEdit: boolean; orgId?: string }) {
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [actives, setActives] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const templates = useQuery({
    enabled: !!orgId,
    queryKey: ["message-templates", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, event, body, active");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!templates.data) return;
    const b: Record<string, string> = {};
    const a: Record<string, boolean> = {};
    for (const e of MESSAGE_EVENTS) {
      const found = templates.data.find((t) => t.event === e.value);
      b[e.value] = found?.body ?? DEFAULT_TEMPLATES[e.value];
      a[e.value] = found ? found.active : true;
    }
    setBodies(b);
    setActives(a);
  }, [templates.data]);

  async function save(event: string) {
    if (!orgId) return;
    setSavingKey(event);
    try {
      const existing = templates.data?.find((t) => t.event === event);
      const payload = {
        organization_id: orgId,
        event,
        name: MESSAGE_EVENTS.find((e) => e.value === event)?.label ?? event,
        body: bodies[event] ?? "",
        active: actives[event] ?? true,
      };
      const { error } = existing
        ? await supabase.from("message_templates").update(payload).eq("id", existing.id)
        : await supabase.from("message_templates").insert(payload);
      if (error) throw error;
      toast.success("Modelo salvo.");
      templates.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Surface className="mt-6 space-y-5 p-5">
      <div>
        <h2 className="font-display text-base font-semibold">Mensagens</h2>
        <p className="text-xs text-muted-foreground">
          Modelos usados no botão “Mensagem” da agenda. Nada é enviado automaticamente — você revisa
          antes.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Variáveis: {MESSAGE_VARIABLES.join("  ")}
        </p>
      </div>

      {MESSAGE_EVENTS.map((e) => (
        <div key={e.value} className="space-y-2 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`tpl-${e.value}`}>{e.label}</Label>
            <Switch
              checked={actives[e.value] ?? true}
              disabled={!canEdit}
              onCheckedChange={(v) => setActives((prev) => ({ ...prev, [e.value]: v }))}
            />
          </div>
          <Textarea
            id={`tpl-${e.value}`}
            rows={3}
            disabled={!canEdit}
            value={bodies[e.value] ?? ""}
            onChange={(evt) => setBodies((prev) => ({ ...prev, [e.value]: evt.target.value }))}
          />
          {canEdit ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={savingKey === e.value}
                onClick={() => save(e.value)}
              >
                {savingKey === e.value ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
                modelo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setBodies((prev) => ({ ...prev, [e.value]: DEFAULT_TEMPLATES[e.value] }))
                }
              >
                Restaurar padrão
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </Surface>
  );
}
