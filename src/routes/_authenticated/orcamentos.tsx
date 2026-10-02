/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Loader2, RefreshCw, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, PageHeader, Pill, SkeletonCard } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — Aura Clínicas" }] }),
  component: Orcamentos,
});

const quoteStatuses = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
  "expirado",
  "convertido",
] as const;
const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  convertido: "Convertido",
};

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function initialQuoteForm() {
  const issueDate = new Date();
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + 30);
  return {
    client_id: "",
    professional_id: "",
    issue_date: localDate(issueDate),
    valid_until: localDate(validUntil),
    service_id: "",
    description: "",
    quantity: "1",
    unit_price: "",
    discount: "0",
    treatment_plan: "",
    prescription: "",
    internal_notes: "",
  };
}

type QuoteOption = { id: string; name: string };
type ServiceOption = QuoteOption & { price: number };

const dateOnlyFmt = (value: string | null | undefined) => {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(year!, month! - 1, day))
    : "—";
};

function Orcamentos() {
  const { data: membership } = useMembership();
  const orgId = membership?.organization.id;
  const client = supabase as any;
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const quotes = useQuery({
    enabled: Boolean(orgId),
    queryKey: ["quotes", orgId],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await client
        .from("quotes")
        .select(
          "id, client_id, professional_id, issue_date, valid_until, total, discount, surcharge, status, clients(name), professionals(name)",
        )
        .eq("organization_id", orgId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () =>
      (quotes.data ?? []).filter((quote: any) => {
        const text =
          `${quote.clients?.name ?? ""} ${quote.professionals?.name ?? ""}`.toLowerCase();
        return (!term || text.includes(term.toLowerCase())) && (!status || quote.status === status);
      }),
    [quotes.data, status, term],
  );

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from("quotes")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento excluído.");
      void queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
  });

  const convert = useMutation({
    mutationFn: async (quote: any) => {
      if (quote.status === "convertido")
        throw new Error("Este orçamento já foi convertido em venda.");
      const { data: items, error: itemsError } = await client
        .from("quote_items")
        .select("service_id, product_id, description, quantity, unit_price, total")
        .eq("quote_id", quote.id)
        .eq("organization_id", orgId);
      if (itemsError) throw itemsError;
      const { data: sale, error: saleError } = await client
        .from("sales")
        .insert({
          organization_id: orgId,
          client_id: quote.client_id,
          professional_id: quote.professional_id,
          total: quote.total,
          discount: quote.discount,
          surcharge: quote.surcharge,
        })
        .select("id")
        .single();
      if (saleError) throw saleError;
      const saleItems = (items ?? []).map((item: any) => ({
        organization_id: orgId,
        sale_id: sale.id,
        service_id: item.service_id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));
      if (saleItems.length) {
        const { error } = await client.from("sale_items").insert(saleItems);
        if (error) throw error;
      }
      const { error } = await client
        .from("quotes")
        .update({ status: "convertido", converted_sale_id: sale.id })
        .eq("id", quote.id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento convertido em venda.");
      void queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível converter."),
  });

  if (quotes.error) return <ErrorState message={(quotes.error as Error).message} />;
  if (!quotes.data) return <SkeletonCard lines={5} />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Orçamentos"
        subtitle={`${filtered.length} orçamento(s)`}
        actions={
          <>
            <Button
              variant="outline"
              disabled={quotes.isFetching}
              onClick={() => void quotes.refetch()}
            >
              <RefreshCw className={`size-4 ${quotes.isFetching ? "animate-spin" : ""}`} />{" "}
              Atualizar
            </Button>
            <Button onClick={() => setOpen(true)}>
              <FilePlus2 className="size-4" /> Novo orçamento
            </Button>
          </>
        }
      />
      <div className="surface mb-5 flex flex-wrap gap-2 p-4">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por cliente ou profissional"
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {quoteStatuses.map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="surface p-5">
          <EmptyState
            title="Nenhum orçamento encontrado"
            description="Crie uma proposta com cliente, validade, itens, descontos e plano de tratamento."
            action={
              <Button onClick={() => setOpen(true)}>
                <FilePlus2 className="size-4" /> Criar orçamento
              </Button>
            }
          />
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Profissional</th>
                <th className="px-5 py-3">Emissão</th>
                <th className="px-5 py-3">Validade</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((quote: any, index: number) => (
                <tr key={quote.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4 font-medium text-muted-foreground">
                    {String(filtered.length - index).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    {quote.client_id ? (
                      <Link
                        to="/clientes/$id"
                        params={{ id: quote.client_id }}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {quote.clients?.name ?? "Cliente"}
                      </Link>
                    ) : (
                      "Cliente avulso"
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {quote.professionals?.name ?? "Não informado"}
                  </td>
                  <td className="px-5 py-4">{dateOnlyFmt(quote.issue_date)}</td>
                  <td className="px-5 py-4">{dateOnlyFmt(quote.valid_until)}</td>
                  <td className="px-5 py-4 font-semibold">{brl(Number(quote.total))}</td>
                  <td className="px-5 py-4">
                    <Pill
                      tone={
                        quote.status === "aprovado" || quote.status === "convertido"
                          ? "success"
                          : quote.status === "recusado" || quote.status === "expirado"
                            ? "danger"
                            : "gold"
                      }
                    >
                      {statusLabels[quote.status] ?? quote.status}
                    </Pill>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={convert.isPending || quote.status === "convertido"}
                        onClick={() => convert.mutate(quote)}
                      >
                        <ShoppingCart className="size-4" /> Converter
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Excluir orçamento"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(quote.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {orgId ? (
        <NewQuoteDialog
          open={open}
          onOpenChange={setOpen}
          orgId={orgId}
          onDone={() => {
            setOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
          }}
        />
      ) : null}
    </div>
  );
}

function NewQuoteDialog({
  open,
  onOpenChange,
  orgId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onDone: () => void;
}) {
  const client = supabase as any;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialQuoteForm);
  const options = useQuery({
    enabled: open && Boolean(orgId),
    queryKey: ["quote-options", orgId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [clients, professionals, services] = await Promise.all([
        client
          .from("clients")
          .select("id,name")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .order("name"),
        client
          .from("professionals")
          .select("id,name")
          .eq("organization_id", orgId)
          .eq("active", true)
          .order("name"),
        client
          .from("services")
          .select("id,name,price")
          .eq("organization_id", orgId)
          .eq("active", true)
          .order("name"),
      ]);
      const failed = [clients, professionals, services].find((result) => result.error);
      if (failed?.error) throw failed.error;
      return {
        clients: clients.data ?? [],
        professionals: professionals.data ?? [],
        services: services.data ?? [],
      };
    },
  });
  const quantity = Number(form.quantity);
  const unitPrice = Number(form.unit_price.replace(",", ".")) || 0;
  const discount = Number(form.discount.replace(",", ".")) || 0;
  const subtotal = quantity * unitPrice;
  const total = Math.max(0, subtotal - discount);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId || !form.description.trim()) {
      toast.error("Informe o item do orçamento.");
      return;
    }
    if (!options.data || options.isLoading) {
      toast.error("Aguarde o carregamento das opções.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      toast.error("Confira o preço e o desconto.");
      return;
    }
    if (form.valid_until < form.issue_date) {
      toast.error("A validade deve ser igual ou posterior à emissão.");
      return;
    }
    setSaving(true);
    try {
      const { data: quote, error } = await client
        .from("quotes")
        .insert({
          organization_id: orgId,
          client_id: form.client_id || null,
          professional_id: form.professional_id || null,
          issue_date: form.issue_date,
          valid_until: form.valid_until,
          subtotal,
          discount,
          total,
          treatment_plan: form.treatment_plan || null,
          prescription: form.prescription || null,
          internal_notes: form.internal_notes || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemError } = await client.from("quote_items").insert({
        organization_id: orgId,
        quote_id: quote.id,
        service_id: form.service_id || null,
        description: form.description.trim(),
        quantity,
        unit_price: unitPrice,
        discount,
        total,
      });
      if (itemError) {
        await client.from("quotes").delete().eq("id", quote.id).eq("organization_id", orgId);
        throw itemError;
      }
      toast.success("Orçamento criado.");
      setForm(initialQuoteForm());
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o orçamento.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Novo orçamento</DialogTitle>
        </DialogHeader>
        {options.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" /> Carregando clientes, profissionais e
            serviços...
          </div>
        ) : null}
        {options.error ? (
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar as opções do orçamento.
          </p>
        ) : null}
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Cliente</Label>
              <select
                value={form.client_id}
                onChange={(event) => setForm({ ...form, client_id: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Cliente avulso</option>
                {(options.data?.clients ?? []).map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <select
                value={form.professional_id}
                onChange={(event) => setForm({ ...form, professional_id: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Não informado</option>
                {(options.data?.professionals ?? []).map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Procedimento do catálogo</Label>
              <select
                value={form.service_id}
                onChange={(event) => {
                  const service = options.data?.services.find(
                    (item: any) => item.id === event.target.value,
                  );
                  setForm({
                    ...form,
                    service_id: event.target.value,
                    description: service?.name ?? form.description,
                    unit_price: service?.price != null ? String(service.price) : form.unit_price,
                  });
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecionar opcionalmente</option>
                {(options.data?.services ?? []).map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input
                type="date"
                value={form.issue_date}
                onChange={(event) => setForm({ ...form, issue_date: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(event) => setForm({ ...form, valid_until: event.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Item / procedimento</Label>
              <Input
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Ex.: Protocolo facial"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preço unitário</Label>
              <Input
                inputMode="decimal"
                value={form.unit_price}
                onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Desconto</Label>
              <Input
                inputMode="decimal"
                value={form.discount}
                onChange={(event) => setForm({ ...form, discount: event.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="sm:col-span-2 flex items-end justify-end">
              <p className="text-right text-sm text-muted-foreground">
                Total do item
                <strong className="mt-1 block text-xl text-foreground">{brl(total)}</strong>
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plano de tratamento</Label>
              <Textarea
                rows={3}
                value={form.treatment_plan}
                onChange={(event) => setForm({ ...form, treatment_plan: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prescrição</Label>
              <Textarea
                rows={3}
                value={form.prescription}
                onChange={(event) => setForm({ ...form, prescription: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações internas</Label>
              <Textarea
                rows={2}
                value={form.internal_notes}
                onChange={(event) => setForm({ ...form, internal_notes: event.target.value })}
                placeholder="Não será exibido ao cliente."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || options.isLoading || !!options.error}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FilePlus2 className="size-4" />
              )}{" "}
              Salvar orçamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
