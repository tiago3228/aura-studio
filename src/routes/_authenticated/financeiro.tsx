import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { isAdminRole, useMembership } from "@/lib/session";
import { getFinancialIntelligence } from "@/lib/secure-actions.functions";
import { calculateMonthlyGoalProgress } from "@/lib/monthly-goal";
import { useLanguage } from "@/lib/language";
import { addDays, brl, brlShort, dateFmt, isoDay } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, StatCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Database } from "@/integrations/supabase/types";

type Method = Database["public"]["Enums"]["payment_method"];

const METHODS: Method[] = ["pix", "credito", "debito", "dinheiro", "transferencia", "outros"];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Aura Clínicas" },
      {
        name: "description",
        content: "Fluxo de caixa, vendas, contas a pagar e a receber da clínica.",
      },
      { property: "og:title", content: "Financeiro — Aura Clínicas" },
      {
        property: "og:description",
        content: "Fluxo de caixa e contas da sua clínica de estética.",
      },
    ],
  }),
  component: Financeiro,
});

function Financeiro() {
  const { data: membership } = useMembership();
  const { t } = useLanguage();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const fetchFinancialIntelligence = useServerFn(getFinancialIntelligence);
  const [openSale, setOpenSale] = useState(false);
  const [openBill, setOpenBill] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const [goalForm, setGoalForm] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartKey = localDateKey(monthStart);
  const currentDayKey = localDateKey(now);

  const from = addDays(isoDay(new Date()), -29);

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["finance", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Organização não selecionada.");
      const [sales, payable, receivable, payments] = await Promise.all([
        supabase
          .from("sales")
          .select("id, total, cost, discount, created_at, clients(name)")
          .eq("organization_id", orgId)
          .gte("created_at", from.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("accounts_payable")
          .select("*")
          .eq("organization_id", orgId)
          .order("due_date"),
        supabase
          .from("accounts_receivable")
          .select("*")
          .eq("organization_id", orgId)
          .order("due_date"),
        supabase
          .from("payments")
          .select("method, amount")
          .eq("organization_id", orgId)
          .gte("created_at", from.toISOString()),
      ]);
      if (sales.error) throw sales.error;
      return {
        sales: sales.data,
        payable: payable.data ?? [],
        receivable: receivable.data ?? [],
        payments: payments.data ?? [],
      };
    },
  });

  const monthRevenueQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["monthly-revenue-achieved", orgId, monthStartKey, currentDayKey],
    queryFn: async () => {
      const result = (await fetchFinancialIntelligence({
        data: { from: monthStartKey, to: currentDayKey, locationId: null },
      })) as { summary?: { revenue?: number | string } };
      return Number(result.summary?.revenue ?? 0);
    },
  });

  const monthlyGoalQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["monthly-revenue-goal", orgId, monthStartKey],
    queryFn: async () => {
      if (!orgId) return null;
      const { data: goal, error } = await supabase
        .from("monthly_revenue_goals")
        .select("id, target_amount")
        .eq("organization_id", orgId)
        .eq("month_start", monthStartKey)
        .maybeSingle();
      if (error) throw error;
      return goal;
    },
  });

  if (data.isLoading) return <SkeletonCard />;
  const d = data.data!;

  const revenue = d.sales.reduce((acc, s) => acc + Number(s.total), 0);
  const cost = d.sales.reduce((acc, s) => acc + Number(s.cost), 0);
  const openPayable = d.payable
    .filter((p) => p.status !== "pago")
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const openReceivable = d.receivable
    .filter((p) => p.status !== "pago")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const byDay = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(isoDay(new Date()), -13 + i);
    const total = d.sales
      .filter((s) => isoDay(new Date(s.created_at)).getTime() === day.getTime())
      .reduce((acc, s) => acc + Number(s.total), 0);
    return { dia: dateFmt(day, { day: "2-digit", month: "2-digit" }), total };
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["finance"] });
    void queryClient.invalidateQueries({ queryKey: ["monthly-revenue-achieved", orgId] });
  };
  const monthRevenue = monthRevenueQuery.data ?? 0;
  const monthlyTarget = Number(monthlyGoalQuery.data?.target_amount ?? 0);
  const goalProgress = calculateMonthlyGoalProgress(monthRevenue, monthlyTarget);

  async function saveMonthlyGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetAmount = Number(goalForm);
    if (!orgId || !membership || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Informe uma meta maior que zero.");
      return;
    }
    setSavingGoal(true);
    const { error } = await supabase.from("monthly_revenue_goals").upsert(
      {
        organization_id: orgId,
        month_start: monthStartKey,
        target_amount: targetAmount,
        created_by: membership.userId,
      },
      { onConflict: "organization_id,month_start" },
    );
    setSavingGoal(false);
    if (error) {
      toast.error("Não foi possível salvar a meta. Verifique sua permissão financeira.");
      return;
    }
    toast.success("Meta mensal salva.");
    setOpenGoal(false);
    void queryClient.invalidateQueries({
      queryKey: ["monthly-revenue-goal", orgId, monthStartKey],
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("Financeiro")}
        subtitle={t("Últimos 30 dias")}
        actions={
          <>
            <Dialog open={openSale} onOpenChange={setOpenSale}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> {t("Registrar venda")}
                </Button>
              </DialogTrigger>
              <SaleDialog
                onDone={() => {
                  setOpenSale(false);
                  refresh();
                }}
              />
            </Dialog>
            <Dialog open={openBill} onOpenChange={setOpenBill}>
              <DialogTrigger asChild>
                <Button variant="outline">{t("Conta a pagar")}</Button>
              </DialogTrigger>
              <BillDialog
                onDone={() => {
                  setOpenBill(false);
                  refresh();
                }}
              />
            </Dialog>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Receita")} value={brl(revenue)} tone="success" />
        <StatCard label={t("Custos de venda")} value={brl(cost)} tone="danger" />
        <StatCard label={t("A receber")} value={brl(openReceivable)} tone="gold" />
        <StatCard label={t("A pagar")} value={brl(openPayable)} tone="danger" />
      </div>

      <section className="surface mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Target className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold">Meta de faturamento mensal</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          {isAdminRole(membership?.role) ? (
            <Button
              variant={monthlyTarget ? "outline" : "default"}
              onClick={() => {
                setGoalForm(monthlyTarget ? String(monthlyTarget) : "");
                setOpenGoal(true);
              }}
            >
              <Target className="size-4" /> {monthlyTarget ? "Editar meta" : "Definir meta"}
            </Button>
          ) : null}
        </div>

        {monthlyTarget > 0 ? (
          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento atingido</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                  {brl(monthRevenue)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    de {brl(monthlyTarget)}
                  </span>
                </p>
              </div>
              <p className="font-display text-xl font-semibold text-primary tabular-nums">
                {goalProgress.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </p>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progresso da meta mensal de faturamento"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(goalProgress.percentage, 100)}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(goalProgress.percentage, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {!goalProgress.reached ? (
                <>
                  Faltam{" "}
                  <span className="font-semibold text-foreground">
                    {brl(goalProgress.remaining)}
                  </span>{" "}
                  para atingir a meta.
                </>
              ) : (
                <>
                  Meta atingida! Você superou o objetivo em{" "}
                  <span className="font-semibold text-success">{brl(goalProgress.exceededBy)}</span>
                  .
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
            Defina o objetivo deste mês para acompanhar o valor atingido e quanto ainda falta.
          </p>
        )}
        {monthRevenueQuery.error || monthlyGoalQuery.error ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            Não foi possível atualizar os dados da meta neste momento.
          </p>
        ) : null}
      </section>

      <Dialog open={openGoal} onOpenChange={setOpenGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Meta de faturamento mensal</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMonthlyGoal} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthly-revenue-target">
                Meta para{" "}
                {monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} (R$)
              </Label>
              <Input
                id="monthly-revenue-target"
                type="number"
                min="0.01"
                step="0.01"
                value={goalForm}
                onChange={(event) => setGoalForm(event.target.value)}
                placeholder="Ex.: 25000,00"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenGoal(false)}
                disabled={savingGoal}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingGoal || !membership}>
                {savingGoal ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Target className="size-4" />
                )}
                {savingGoal ? "Salvando..." : "Salvar meta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="surface mt-6 p-5">
        <h2 className="mb-4 font-display text-base font-semibold">{t("Receita por dia")}</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                tickFormatter={(v) => brlShort(Number(v))}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <ChartTooltip
                formatter={(v) => brl(Number(v))}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <Tabs defaultValue="vendas" className="mt-6">
        <TabsList>
          <TabsTrigger value="vendas">{t("Vendas")}</TabsTrigger>
          <TabsTrigger value="pagar">{t("A pagar")}</TabsTrigger>
          <TabsTrigger value="receber">{t("A receber")}</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-4">
          {d.sales.length === 0 ? (
            <EmptyState
              title={t("Nenhuma venda")}
              description={t("Registre vendas para acompanhar o caixa.")}
            />
          ) : (
            <ul className="surface divide-y divide-border p-0">
              {d.sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.clients?.name ?? t("Venda avulsa")}</p>
                    <p className="text-xs text-muted-foreground">{dateFmt(s.created_at)}</p>
                  </div>
                  <span className="font-semibold tabular-nums">{brl(Number(s.total))}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="pagar" className="mt-4">
          <BillList items={d.payable} onPaid={refresh} table="accounts_payable" />
        </TabsContent>
        <TabsContent value="receber" className="mt-4">
          <BillList items={d.receivable} onPaid={refresh} table="accounts_receivable" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Bill = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: Database["public"]["Enums"]["account_status"];
};

function BillList({
  items,
  table,
  onPaid,
}: {
  items: Bill[];
  table: "accounts_payable" | "accounts_receivable";
  onPaid: () => void;
}) {
  if (items.length === 0)
    return (
      <EmptyState title="Nada por aqui" description="Nenhum lançamento registrado até o momento." />
    );

  async function markPaid(id: string) {
    const { error } = await supabase
      .from(table)
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Baixa registrada.");
      onPaid();
    }
  }

  return (
    <ul className="surface divide-y divide-border p-0">
      {items.map((b) => (
        <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{b.description}</p>
            <p className="text-xs text-muted-foreground">vence {dateFmt(b.due_date)}</p>
          </div>
          <span className="font-semibold tabular-nums">{brl(Number(b.amount))}</span>
          <Pill tone={b.status === "pago" ? "success" : b.status === "vencido" ? "danger" : "gold"}>
            {b.status}
          </Pill>
          {b.status !== "pago" ? (
            <Button size="sm" variant="outline" onClick={() => markPaid(b.id)}>
              Baixar
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SaleDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    professional_id: "",
    description: "",
    total: "",
    cost: "",
    method: "pix" as Method,
  });

  const lists = useQuery({
    enabled: !!membership,
    queryKey: ["sale-lists", membership?.organization.id],
    queryFn: async () => {
      const [clients, professionals] = await Promise.all([
        supabase.from("clients").select("id, name").is("deleted_at", null).order("name"),
        supabase
          .from("professionals")
          .select("id, name, commission_default, commission_type")
          .eq("active", true),
      ]);
      return { clients: clients.data ?? [], professionals: professionals.data ?? [] };
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const total = Number(form.total || 0);
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          organization_id: membership.organization.id,
          client_id: form.client_id || null,
          professional_id: form.professional_id || null,
          total,
          cost: Number(form.cost || 0),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("sale_items").insert({
        organization_id: membership.organization.id,
        sale_id: sale.id,
        description: form.description || "Atendimento",
        quantity: 1,
        unit_price: total,
        total,
      });

      await supabase.from("payments").insert({
        organization_id: membership.organization.id,
        sale_id: sale.id,
        method: form.method,
        amount: total,
        status: "pago",
        paid_at: new Date().toISOString(),
      });

      const pro = lists.data?.professionals.find((p) => p.id === form.professional_id);
      if (pro) {
        const gross =
          pro.commission_type === "percentual"
            ? (total * Number(pro.commission_default)) / 100
            : Number(pro.commission_default);
        await supabase.from("commission_entries").insert({
          organization_id: membership.organization.id,
          professional_id: pro.id,
          sale_id: sale.id,
          base_amount: total,
          gross,
          deductions: 0,
          net: gross,
        });
      }

      toast.success("Venda registrada.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display">Registrar venda</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              {lists.data?.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Profissional (gera comissão)</Label>
          <Select
            value={form.professional_id}
            onValueChange={(v) => setForm({ ...form, professional_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              {lists.data?.professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sale-desc">Descrição</Label>
          <Input
            id="sale-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Limpeza de pele"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sale-total">Valor (R$)</Label>
            <Input
              id="sale-total"
              type="number"
              min={0}
              step="0.01"
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-cost">Custo (R$)</Label>
            <Input
              id="sale-cost"
              type="number"
              min={0}
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <Select
            value={form.method}
            onValueChange={(v) => setForm({ ...form, method: v as Method })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Registrar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function BillDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "",
    supplier: "",
    amount: "",
    due_date: new Date().toISOString().slice(0, 10),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("accounts_payable").insert({
        organization_id: membership.organization.id,
        description: form.description,
        supplier: form.supplier || null,
        amount: Number(form.amount || 0),
        due_date: form.due_date,
      });
      if (error) throw error;
      toast.success("Conta cadastrada.");
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
        <DialogTitle className="font-display">Nova conta a pagar</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="b-desc">Descrição</Label>
          <Input
            id="b-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-supplier">Fornecedor</Label>
          <Input
            id="b-supplier"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-amount">Valor (R$)</Label>
            <Input
              id="b-amount"
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-due">Vencimento</Label>
            <Input
              id="b-due"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              required
            />
          </div>
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
