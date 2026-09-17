/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RecoverySettings() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const canEdit = isAdminRole(membership?.role);
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    void (supabase as any)
      .from("crm_retention_settings")
      .select("inactivity_days")
      .eq("organization_id", orgId)
      .maybeSingle()
      .then(({ data }: { data: { inactivity_days?: number } | null }) => {
        if (data?.inactivity_days) setDays(data.inactivity_days);
      });
    void (supabase as any)
      .from("organization_recovery_settings")
      .select("enabled,inactivity_days")
      .eq("organization_id", orgId)
      .maybeSingle()
      .then(({ data }: { data: { enabled?: boolean; inactivity_days?: number } | null }) => {
        if (data) {
          setEnabled(data.enabled ?? true);
          if (data.inactivity_days) setDays(data.inactivity_days);
        }
      });
  }, [orgId]);

  async function save() {
    if (!orgId || !canEdit) return;
    setSaving(true);
    try {
      const value = Math.max(1, Math.min(730, Number(days) || 60));
      const [recovery, retention] = await Promise.all([
        (supabase as any)
          .from("organization_recovery_settings")
          .upsert({ organization_id: orgId, enabled, inactivity_days: value }),
        (supabase as any)
          .from("crm_retention_settings")
          .upsert({ organization_id: orgId, inactivity_days: value }),
      ]);
      if (recovery.error) throw recovery.error;
      if (retention.error) throw retention.error;
      toast.success("Configuração de recuperação salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="surface group p-5">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-display text-base font-semibold">
        <RotateCcw className="size-5 text-primary" />
        <span className="flex-1">Clientes em recuperação</span>
        <span className="text-xs font-normal text-muted-foreground group-open:hidden">Abrir</span>
      </summary>
      <div className="mt-5 space-y-4 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">
          O Aura sinaliza clientes sem atendimento dentro do período configurado na aba Retenção do
          CRM.
        </p>
        <div className="flex items-center gap-3 text-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit} />
          <span>Ativar alertas de recuperação</span>
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="recovery-days">Considerar inativo após (dias)</Label>
          <Input
            id="recovery-days"
            type="number"
            min={1}
            max={730}
            value={days}
            disabled={!canEdit}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </div>
        {canEdit ? (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar configuração"}
          </Button>
        ) : null}
      </div>
    </details>
  );
}
