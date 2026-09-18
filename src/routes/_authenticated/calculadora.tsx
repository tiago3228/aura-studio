import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Delete,
  Equal,
  Percent,
  RotateCcw,
} from "lucide-react";

import { useLanguage } from "@/lib/language";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({ meta: [{ title: "Calculadora — Aura Clínicas" }] }),
  component: CalculadoraPage,
});

type Panel = "common" | "margin" | null;
type Operator = "+" | "−" | "×" | "÷";

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculate(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right;
  if (operator === "−") return left - right;
  if (operator === "×") return left * right;
  return right === 0 ? null : left / right;
}

function CommonCalculator() {
  const { t } = useLanguage();
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [replaceDisplay, setReplaceDisplay] = useState(true);

  function clear() {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setReplaceDisplay(true);
  }

  function digit(value: string) {
    if (replaceDisplay || display === "Erro") {
      setDisplay(value === "." ? "0." : value);
      setReplaceDisplay(false);
      return;
    }
    if (value === "." && display.includes(".")) return;
    setDisplay(display === "0" && value !== "." ? value : `${display}${value}`);
  }

  function chooseOperator(next: Operator) {
    const current = parseNumber(display);
    if (stored !== null && operator) {
      const result = calculate(stored, current, operator);
      if (result === null) {
        setDisplay("Erro");
        setStored(null);
        setOperator(null);
        setReplaceDisplay(true);
        return;
      }
      setStored(result);
      setDisplay(String(result));
    } else {
      setStored(current);
    }
    setOperator(next);
    setReplaceDisplay(true);
  }

  function equals() {
    if (stored === null || !operator) return;
    const result = calculate(stored, parseNumber(display), operator);
    if (result === null) {
      setDisplay("Erro");
    } else {
      setDisplay(String(Number(result.toFixed(10))));
    }
    setStored(null);
    setOperator(null);
    setReplaceDisplay(true);
  }

  const keys = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "−"],
    ["0", ".", "C", "+"],
  ];

  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-sm">
      <div
        className="mb-4 rounded-lg bg-foreground p-5 text-right text-3xl font-semibold tabular-nums text-background"
        aria-live="polite"
      >
        {display.replace(".", ",")}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.flat().map((key) => {
          const isOperator = ["÷", "×", "−", "+"].includes(key);
          const isClear = key === "C";
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "min-h-12 rounded-lg border text-lg font-semibold transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                isOperator && "border-primary/30 bg-primary-soft text-primary",
                isClear && "border-destructive/30 bg-destructive-soft text-destructive",
              )}
              onClick={() =>
                isClear ? clear() : isOperator ? chooseOperator(key as Operator) : digit(key)
              }
              aria-label={isClear ? t("Limpar") : key}
            >
              {key === "." ? "," : key}
            </button>
          );
        })}
        <button
          type="button"
          className="col-span-4 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
          onClick={equals}
        >
          <Equal className="size-5" /> =
        </button>
      </div>
    </div>
  );
}

function MarginCalculator() {
  const { t } = useLanguage();
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("30");
  const [discount, setDiscount] = useState("0");
  const costValue = parseNumber(cost);
  const marginValue = Math.min(99.99, Math.max(0, parseNumber(margin)));
  const discountValue = Math.min(99.99, Math.max(0, parseNumber(discount)));
  const result = useMemo(() => {
    if (costValue <= 0) return null;
    const suggested = costValue / (1 - marginValue / 100);
    const discounted = suggested * (1 - discountValue / 100);
    const profit = suggested - costValue;
    const discountedProfit = discounted - costValue;
    return {
      suggested,
      profit,
      markup: (suggested / costValue - 1) * 100,
      discounted,
      discountedProfit,
      discountedMargin: discounted > 0 ? (discountedProfit / discounted) * 100 : 0,
    };
  }, [costValue, marginValue, discountValue]);
  const money = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const reset = () => {
    setCost("");
    setMargin("30");
    setDiscount("0");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">{t("Dados do produto")}</h3>
        <div className="space-y-1.5">
          <Label htmlFor="calc-cost">{t("Custo total do produto")}</Label>
          <Input
            id="calc-cost"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="25,00"
          />
          <p className="text-xs text-muted-foreground">
            {t("Informe matéria-prima, embalagem e outros custos diretos do produto.")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calc-margin">{t("Margem de lucro desejada")}</Label>
          <div className="relative">
            <Input
              id="calc-margin"
              type="number"
              min={0}
              max={99.99}
              step="0.01"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              className="pr-9"
            />
            <Percent className="absolute top-2.5 right-3 size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("A margem representa o lucro como percentual do preço final.")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calc-discount">{t("Desconto simulado")}</Label>
          <div className="relative">
            <Input
              id="calc-discount"
              type="number"
              min={0}
              max={99.99}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="pr-9"
            />
            <Percent className="absolute top-2.5 right-3 size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Use este campo para verificar quanto sobrará caso você ofereça um desconto.")}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCcw className="size-4" /> {t("Limpar")}
        </Button>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-base font-semibold">{t("Resultado da simulação")}</h3>
        {result ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Result
              label={t("Preço de venda sugerido")}
              value={money(result.suggested)}
              highlight
            />
            <Result label={t("Lucro por unidade")} value={money(result.profit)} />
            <Result label={t("Markup sobre o custo")} value={`${result.markup.toFixed(2)}%`} />
            <Result label={t("Preço com desconto")} value={money(result.discounted)} />
            <Result
              label={t("Lucro após desconto")}
              value={money(result.discountedProfit)}
              danger={result.discountedProfit < 0}
            />
            <Result
              label={t("Margem depois do desconto")}
              value={`${result.discountedMargin.toFixed(2)}%`}
              danger={result.discountedMargin < 0}
            />
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            {t("Informe o custo do produto para visualizar os resultados.")}
          </p>
        )}
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          {t(
            "Esta é uma simulação. Considere taxas, impostos, frete, comissões e despesas fixas antes de definir o preço final.",
          )}
        </p>
      </section>
    </div>
  );
}

function Result({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/60 p-3",
        highlight && "border border-primary/30 bg-primary-soft",
        danger && "border border-destructive/40 bg-destructive-soft",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CalculadoraPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState<Panel>(null);
  const toggle = (panel: Exclude<Panel, null>) =>
    setOpen((current) => (current === panel ? null : panel));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("Calculadora")}
        subtitle={t("Faça simulações rápidas para a operação da sua clínica.")}
      />
      <div className="space-y-4">
        <CalculatorPanel
          title={t("Calculadora comum")}
          description={t("Operações básicas para o dia a dia.")}
          open={open === "common"}
          onClick={() => toggle("common")}
        >
          <CommonCalculator />
        </CalculatorPanel>
        <CalculatorPanel
          title={t("Calculadora de preço e margem")}
          description={t("Simule preços, lucro, markup e descontos.")}
          open={open === "margin"}
          onClick={() => toggle("margin")}
        >
          <MarginCalculator />
        </CalculatorPanel>
      </div>
    </div>
  );
}

function CalculatorPanel({
  title,
  description,
  open,
  onClick,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50"
        onClick={onClick}
        aria-expanded={open}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold">
          <Calculator className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
        {open ? (
          <ChevronUp className="size-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-5 text-muted-foreground" />
        )}
      </button>
      {open ? <div className="border-t border-border p-4">{children}</div> : null}
    </section>
  );
}
