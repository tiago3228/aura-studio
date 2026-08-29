import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl, dateFmt } from "@/lib/format";
import { PageHeader, Pill, SkeletonCard, EmptyState, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type MovementType = Database["public"]["Enums"]["movement_type"];

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Aura Clínicas" },
      { name: "description", content: "Controle de produtos, consumo por procedimento e alertas de estoque mínimo." },
      { property: "og:title", content: "Estoque — Aura Clínicas" },
      { property: "og:description", content: "Produtos, consumo e alertas de estoque mínimo." },
    ],
  }),
  component: Estoque,
});

function Estoque() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const queryClient = useQueryClient();
  const [openProduct, setOpenProduct] = useState(false);
  const [moveProduct, setMoveProduct] = useState<{ id: string; name: string } | null>(null);

  const data = useQuery({
    enabled: !!orgId,
    queryKey: ["inventory", orgId],
    queryFn: async () => {
      const [products, movements] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase
          .from("inventory_movements")
          .select("id, type, quantity, note, created_at, products(name)")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (products.error) throw products.error;
      return { products: products.data, movements: movements.data ?? [] };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventory"] });

  if (data.isLoading) return <SkeletonCard />;
  const products = data.data!.products;
  const value = products.reduce((acc, p) => acc + Number(p.stock) * Number(p.cost_price), 0);
  const low = products.filter((p) => Number(p.stock) <= Number(p.min_stock));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Estoque"
        subtitle="Produtos de uso interno e revenda"
        actions={
          <Dialog open={openProduct} onOpenChange={setOpenProduct}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo produto
              </Button>
            </DialogTrigger>
            <ProductDialog
              onDone={() => {
                setOpenProduct(false);
                refresh();
              }}
            />
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Produtos" value={String(products.length)} />
        <StatCard label="Valor em estoque" value={brl(value)} tone="primary" />
        <StatCard label="Abaixo do mínimo" value={String(low.length)} tone={low.length ? "danger" : "success"} />
      </div>

      {products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nenhum produto"
            description="Cadastre insumos e produtos de revenda para controlar consumo e custo."
          />
        </div>
      ) : (
        <ul className="surface mt-6 divide-y divide-border p-0">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category ?? "sem categoria"} · custo {brl(Number(p.cost_price))} · venda{" "}
                  {brl(Number(p.sale_price))}
                </p>
              </div>
              <Pill tone={Number(p.stock) <= Number(p.min_stock) ? "danger" : "success"}>
                {Number(p.stock)} {p.unit}
              </Pill>
              <Button size="sm" variant="outline" onClick={() => setMoveProduct({ id: p.id, name: p.name })}>
                <ArrowDownUp className="size-3.5" /> Movimentar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!moveProduct} onOpenChange={(o) => !o && setMoveProduct(null)}>
        {moveProduct ? (
          <MovementDialog
            product={moveProduct}
            onDone={() => {
              setMoveProduct(null);
              refresh();
            }}
          />
        ) : null}
      </Dialog>

      {data.data!.movements.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-base font-semibold">Últimas movimentações</h2>
          <ul className="surface divide-y divide-border p-0">
            {data.data!.movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{dateFmt(m.created_at)}</span>
                <span className="min-w-0 flex-1 truncate">{m.products?.name}</span>
                <Pill tone={m.type === "entrada" ? "success" : "danger"}>
                  {m.type} {Number(m.quantity)}
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProductDialog({ onDone }: { onDone: () => void }) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "un",
    stock: "0",
    min_stock: "2",
    cost_price: "",
    sale_price: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("products").insert({
        organization_id: membership.organization.id,
        name: form.name,
        category: form.category || null,
        unit: form.unit,
        stock: Number(form.stock || 0),
        min_stock: Number(form.min_stock || 0),
        cost_price: Number(form.cost_price || 0),
        sale_price: Number(form.sale_price || 0),
      });
      if (error) throw error;
      toast.success("Produto cadastrado.");
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
        <DialogTitle className="font-display">Novo produto</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pr-name">Nome</Label>
          <Input
            id="pr-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pr-cat">Categoria</Label>
            <Input
              id="pr-cat"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-unit">Unidade</Label>
            <Input
              id="pr-unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="un, ml, g"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pr-stock">Estoque atual</Label>
            <Input
              id="pr-stock"
              type="number"
              step="0.01"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-min">Estoque mínimo</Label>
            <Input
              id="pr-min"
              type="number"
              step="0.01"
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pr-cost">Custo (R$)</Label>
            <Input
              id="pr-cost"
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-sale">Venda (R$)</Label>
            <Input
              id="pr-sale"
              type="number"
              step="0.01"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
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

function MovementDialog({
  product,
  onDone,
}: {
  product: { id: string; name: string };
  onDone: () => void;
}) {
  const { data: membership } = useMembership();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<MovementType>("entrada");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    setSaving(true);
    try {
      const qty = Number(quantity || 0);
      const { error } = await supabase.from("inventory_movements").insert({
        organization_id: membership.organization.id,
        product_id: product.id,
        type,
        quantity: qty,
        note: note || null,
      });
      if (error) throw error;

      const { data: current } = await supabase
        .from("products")
        .select("stock")
        .eq("id", product.id)
        .single();
      const delta = type === "entrada" ? qty : type === "ajuste" ? 0 : -qty;
      const next = type === "ajuste" ? qty : Number(current?.stock ?? 0) + delta;
      await supabase.from("products").update({ stock: next }).eq("id", product.id);

      toast.success("Movimentação registrada.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">Movimentar {product.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["entrada", "saida", "consumo", "perda", "ajuste"] as MovementType[]).map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mv-qty">Quantidade</Label>
          <Input
            id="mv-qty"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mv-note">Observação</Label>
          <Input id="mv-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Confirmar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
