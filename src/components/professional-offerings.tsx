import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Define quais procedimentos e pacotes o profissional oferece.
 * Regra: procedimentos incluídos num pacote ativo deste profissional
 * deixam de aparecer como avulsos na página pública.
 */
export function ProfessionalOfferings({
  professional,
  onDone,
}: {
  professional: { id: string; name: string; organization_id: string };
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [packages, setPackages] = useState<string[]>([]);

  const data = useQuery({
    queryKey: ["offerings", professional.id],
    queryFn: async () => {
      const [svc, pkg, items, ps, pp] = await Promise.all([
        supabase.from("services").select("id, name, price, active").eq("active", true).order("name"),
        supabase.from("packages").select("id, name, price, active").eq("active", true).order("name"),
        supabase.from("package_items").select("package_id, service_id, sessions"),
        supabase
          .from("professional_services")
          .select("service_id")
          .eq("professional_id", professional.id)
          .eq("active", true),
        supabase
          .from("professional_packages")
          .select("package_id")
          .eq("professional_id", professional.id)
          .eq("active", true),
      ]);
      if (svc.error) throw svc.error;
      return {
        services: svc.data ?? [],
        packages: pkg.data ?? [],
        items: items.data ?? [],
        selectedServices: (ps.data ?? []).map((r) => r.service_id),
        selectedPackages: (pp.data ?? []).map((r) => r.package_id),
      };
    },
  });

  useEffect(() => {
    if (!data.data) return;
    setServices(data.data.selectedServices);
    setPackages(data.data.selectedPackages);
  }, [data.data]);

  const blocked = new Set(
    (data.data?.items ?? []).filter((i) => packages.includes(i.package_id)).map((i) => i.service_id),
  );

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("professional_services").delete().eq("professional_id", professional.id),
        supabase.from("professional_packages").delete().eq("professional_id", professional.id),
      ]);
      if (services.length) {
        const { error } = await supabase.from("professional_services").insert(
          services.map((service_id) => ({
            organization_id: professional.organization_id,
            professional_id: professional.id,
            service_id,
          })),
        );
        if (error) throw error;
      }
      if (packages.length) {
        const { error } = await supabase.from("professional_packages").insert(
          packages.map((package_id) => ({
            organization_id: professional.organization_id,
            professional_id: professional.id,
            package_id,
          })),
        );
        if (error) throw error;
      }
      toast.success("Serviços do profissional atualizados.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) =>
    set(on ? [...list, id] : list.filter((v) => v !== id));

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Serviços de {professional.name}</DialogTitle>
      </DialogHeader>

      {data.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-5">
          <section className="space-y-2">
            <Label>Pacotes oferecidos</Label>
            <ul className="grid gap-1.5">
              {data.data!.packages.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                  <Checkbox
                    id={`off-pkg-${p.id}`}
                    checked={packages.includes(p.id)}
                    onCheckedChange={(v) => toggle(packages, setPackages, p.id, !!v)}
                  />
                  <Label htmlFor={`off-pkg-${p.id}`} className="flex-1 text-sm font-normal">
                    {p.name}
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{brl(Number(p.price))}</span>
                </li>
              ))}
              {data.data!.packages.length === 0 ? (
                <li className="text-xs text-muted-foreground">Nenhum pacote ativo cadastrado.</li>
              ) : null}
            </ul>
          </section>

          <section className="space-y-2">
            <Label>Procedimentos avulsos</Label>
            {blocked.size > 0 ? (
              <p className="flex items-start gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Procedimentos que já fazem parte dos pacotes selecionados não aparecem como avulsos na página
                pública deste profissional.
              </p>
            ) : null}
            <ul className="grid gap-1.5">
              {data.data!.services.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                  <Checkbox
                    id={`off-svc-${s.id}`}
                    checked={services.includes(s.id)}
                    onCheckedChange={(v) => toggle(services, setServices, s.id, !!v)}
                  />
                  <Label htmlFor={`off-svc-${s.id}`} className="flex-1 text-sm font-normal">
                    {s.name}
                    {blocked.has(s.id) ? (
                      <span className="ml-1 text-xs text-muted-foreground">(incluso em pacote)</span>
                    ) : null}
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{brl(Number(s.price))}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Se nenhum procedimento for marcado, o profissional oferece todos os que estão liberados para
              agendamento online.
            </p>
          </section>
        </div>
      )}

      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
