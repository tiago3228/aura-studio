/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership, isAdminRole } from "@/lib/session";
import { brl, dateFmt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Coupon = {
  id: string;
  code: string;
  percentage: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  single_use_per_client: boolean;
  max_uses: number | null;
  applies_to_all_services: boolean;
  internal_note: string | null;
};

type Service = { id: string; name: string };

type Form = Omit<Coupon, "id"> & { serviceIds: string[] };
const EMPTY: Form = {
  code: "",
  percentage: 10,
  starts_at: "",
  expires_at: "",
  active: true,
  single_use_per_client: false,
  max_uses: null,
  applies_to_all_services: true,
  internal_note: "",
  serviceIds: [],
};

export function DiscountSettings() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const orgId = membership?.organization.id;
  const canEdit = isAdminRole(membership?.role);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    enabled: !!orgId,
    queryKey: ["discount-coupons", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Clínica não identificada.");
      const [coupons, services] = await Promise.all([
        (supabase as any)
          .from("discount_coupons")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select("id,name")
          .eq("organization_id", orgId)
          .eq("active", true)
          .order("name"),
      ]);
      if (coupons.error) throw coupons.error;
      const ids = (coupons.data ?? []).map((c: Coupon) => c.id);
      const links = ids.length
        ? await (supabase as any)
            .from("discount_coupon_services")
            .select("coupon_id,service_id")
            .in("coupon_id", ids)
        : { data: [] };
      const redemptions = ids.length
        ? await (supabase as any)
            .from("discount_coupon_redemptions")
            .select("coupon_id,discount_amount,client_id")
            .in("coupon_id", ids)
        : { data: [] };
      return {
        coupons: (coupons.data ?? []).map((coupon: Coupon) => ({
          ...coupon,
          serviceIds: (links.data ?? [])
            .filter((link: { coupon_id: string }) => link.coupon_id === coupon.id)
            .map((link: { service_id: string }) => link.service_id),
          uses: (redemptions.data ?? []).filter(
            (redemption: { coupon_id: string }) => redemption.coupon_id === coupon.id,
          ),
        })),
        services: (services.data ?? []) as Service[],
      };
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const visibleCoupons = useMemo(() => query.data?.coupons ?? [], [query.data?.coupons]);
  const stats = useMemo(
    () =>
      visibleCoupons.reduce(
        (
          acc: { uses: number; value: number },
          coupon: Coupon & { uses: { discount_amount: number }[] },
        ) => ({
          uses: acc.uses + coupon.uses.length,
          value:
            acc.value + coupon.uses.reduce((sum, item) => sum + Number(item.discount_amount), 0),
        }),
        { uses: 0, value: 0 },
      ),
    [visibleCoupons],
  );

  function edit(coupon: Coupon & { serviceIds: string[] }) {
    setEditing(coupon.id);
    setForm({
      ...coupon,
      starts_at: coupon.starts_at ?? "",
      expires_at: coupon.expires_at ?? "",
      internal_note: coupon.internal_note ?? "",
      serviceIds: coupon.serviceIds,
    });
    setOpenForm(true);
  }

  function reset() {
    setEditing(null);
    setForm(EMPTY);
    setOpenForm(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId || !canEdit) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        code: form.code.trim().toUpperCase(),
        percentage: Number(form.percentage),
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        active: form.active,
        single_use_per_client: form.single_use_per_client,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        applies_to_all_services: form.applies_to_all_services,
        internal_note: form.internal_note || null,
      };
      const result = editing
        ? await (supabase as any)
            .from("discount_coupons")
            .update(payload)
            .eq("id", editing)
            .select("id")
            .single()
        : await (supabase as any).from("discount_coupons").insert(payload).select("id").single();
      if (result.error) throw result.error;
      const couponId = result.data.id;
      await (supabase as any).from("discount_coupon_services").delete().eq("coupon_id", couponId);
      if (!form.applies_to_all_services && form.serviceIds.length) {
        const { error } = await (supabase as any)
          .from("discount_coupon_services")
          .insert(form.serviceIds.map((service_id) => ({ coupon_id: couponId, service_id })));
        if (error) throw error;
      }
      toast.success(editing ? "Cupom atualizado." : "Cupom criado.");
      reset();
      queryClient.invalidateQueries({ queryKey: ["discount-coupons", orgId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cupom.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (
      !canEdit ||
      !window.confirm("Excluir este cupom? O histórico de utilizações será preservado.")
    )
      return;
    const { error } = await (supabase as any).from("discount_coupons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["discount-coupons", orgId] });
  }

  return (
    <details className="surface group p-5">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-display text-base font-semibold">
        <Ticket className="size-5 text-primary" />
        <span className="flex-1">Configurar descontos</span>
        <span className="text-xs font-normal text-muted-foreground group-open:hidden">Abrir</span>
      </summary>
      <div className="mt-5 space-y-4 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Crie cupons para procedimentos, pacotes e campanhas de recuperação.
          </p>
          {canEdit ? (
            <Button
              size="sm"
              onClick={() => {
                setForm(EMPTY);
                setEditing(null);
                setOpenForm(true);
              }}
            >
              <Plus className="size-4" /> Novo cupom
            </Button>
          ) : null}
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-muted p-3">
            <span className="text-muted-foreground">Utilizações</span>
            <strong className="ml-2">{stats.uses}</strong>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <span className="text-muted-foreground">Descontos concedidos</span>
            <strong className="ml-2">{brl(stats.value)}</strong>
          </div>
        </div>
        {openForm ? (
          <form
            onSubmit={save}
            className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">Código</Label>
                <Input
                  id="coupon-code"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DESCONTO10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-percent">Percentual (%)</Label>
                <Input
                  id="coupon-percent"
                  required
                  min={0.01}
                  max={100}
                  step={0.01}
                  type="number"
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-start">Data de início</Label>
                <Input
                  id="coupon-start"
                  type="date"
                  value={form.starts_at ?? ""}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-end">Data de validade</Label>
                <Input
                  id="coupon-end"
                  type="date"
                  value={form.expires_at ?? ""}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-limit">Limite de utilizações</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min={1}
                  value={form.max_uses ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="Sem limite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-note">Observação interna</Label>
                <Input
                  id="coupon-note"
                  value={form.internal_note ?? ""}
                  onChange={(e) => setForm({ ...form, internal_note: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                />{" "}
                Ativo
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.single_use_per_client}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, single_use_per_client: checked })
                  }
                />{" "}
                Uma utilização por cliente
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.applies_to_all_services}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, applies_to_all_services: checked })
                  }
                />{" "}
                Todos os procedimentos
              </label>
            </div>
            {!form.applies_to_all_services ? (
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
                {query.data?.services.map((service) => (
                  <label key={service.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          serviceIds: e.target.checked
                            ? [...form.serviceIds, service.id]
                            : form.serviceIds.filter((id) => id !== service.id),
                        })
                      }
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar cupom"}
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}
        {query.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando cupons...</p>
        ) : visibleCoupons.length === 0 ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Nenhum cupom cadastrado.
          </p>
        ) : (
          <div className="space-y-2">
            {visibleCoupons.map(
              (coupon: Coupon & { uses: { discount_amount: number }[]; serviceIds: string[] }) => (
                <div
                  key={coupon.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Ticket className="size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {coupon.code} · {coupon.percentage}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {coupon.expires_at
                        ? `válido até ${dateFmt(coupon.expires_at)}`
                        : "sem data de validade"}{" "}
                      · {coupon.uses.length} utilização(ões)
                    </p>
                  </div>
                  <span
                    className={
                      coupon.active && (!coupon.expires_at || coupon.expires_at >= today)
                        ? "text-xs text-emerald-700"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {coupon.active ? "ativo" : "inativo"}
                  </span>
                  {canEdit ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => edit(coupon)}
                        aria-label="Editar cupom"
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(coupon.id)}
                        aria-label="Excluir cupom"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </details>
  );
}
