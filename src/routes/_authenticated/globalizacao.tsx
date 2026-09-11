/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { PageHeader, Surface } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/globalizacao")({
  head: () => ({ meta: [{ title: "Globalização — Aura Clínicas" }] }),
  component: GlobalizacaoPage,
});
const defaults = {
  language_code: "pt-BR",
  currency_code: "BRL",
  timezone: "America/Sao_Paulo",
  date_format: "dd/MM/yyyy",
  first_day_of_week: 0,
  decimal_separator: ",",
  thousands_separator: ".",
};
function GlobalizacaoPage() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const settings = useQuery({
    enabled: !!orgId,
    queryKey: ["localization", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organization_localization_settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (settings.data) setForm({ ...defaults, ...settings.data });
  }, [settings.data]);
  async function save() {
    if (!orgId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("organization_localization_settings")
      .upsert(
        { ...form, organization_id: orgId, updated_at: new Date().toISOString() },
        { onConflict: "organization_id" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Preferências globais salvas.");
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Globalização"
        subtitle="Idioma, moeda, datas e fuso horário da sua clínica."
      />
      <Surface className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
            <Globe2 className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Preferências regionais</h2>
            <p className="text-sm text-muted-foreground">
              Os valores históricos continuam armazenados na moeda original. A conversão exige taxa
              cadastrada.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Idioma"
            value={form.language_code}
            onChange={(value) => setForm({ ...form, language_code: value })}
            options={[
              ["pt-BR", "Português (Brasil)"],
              ["en-US", "English (United States)"],
              ["es-ES", "Español"],
              ["fr-FR", "Français"],
            ]}
          />
          <Field
            label="Moeda padrão"
            value={form.currency_code}
            onChange={(value) => setForm({ ...form, currency_code: value })}
            options={[
              ["BRL", "Real brasileiro (R$)"],
              ["USD", "Dólar americano ($)"],
              ["EUR", "Euro (€)"],
              ["GBP", "Libra (£)"],
              ["ARS", "Peso argentino"],
              ["CLP", "Peso chileno"],
              ["MXN", "Peso mexicano"],
            ]}
          />
          <Field
            label="Fuso horário"
            value={form.timezone}
            onChange={(value) => setForm({ ...form, timezone: value })}
            options={[
              ["America/Sao_Paulo", "Brasília / São Paulo"],
              ["America/New_York", "Nova York"],
              ["America/Mexico_City", "Cidade do México"],
              ["Europe/Lisbon", "Lisboa"],
              ["Europe/Madrid", "Madri"],
            ]}
          />
          <Field
            label="Formato de data"
            value={form.date_format}
            onChange={(value) => setForm({ ...form, date_format: value })}
            options={[
              ["dd/MM/yyyy", "31/12/2026"],
              ["MM/dd/yyyy", "12/31/2026"],
              ["yyyy-MM-dd", "2026-12-31"],
            ]}
          />
          <Field
            label="Separador decimal"
            value={form.decimal_separator}
            onChange={(value) => setForm({ ...form, decimal_separator: value })}
            options={[
              [",", "Vírgula (1.234,56)"],
              [".", "Ponto (1,234.56)"],
            ]}
          />
          <Field
            label="Primeiro dia da semana"
            value={String(form.first_day_of_week)}
            onChange={(value) => setForm({ ...form, first_day_of_week: Number(value) })}
            options={[
              ["0", "Domingo"],
              ["1", "Segunda-feira"],
            ]}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar preferências
        </Button>
      </Surface>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([key, label]) => (
          <option value={key} key={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
