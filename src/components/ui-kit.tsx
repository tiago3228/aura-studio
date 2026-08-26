import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface p-5", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl leading-tight font-semibold text-balance sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-pretty text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface p-10 text-center">
      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-primary-soft">
        <span className="size-2.5 rounded-full bg-primary/50" />
      </div>
      <p className="font-display text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-pretty text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="surface space-y-3 p-5">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-3 rounded bg-muted"
          style={{ width: `${90 - i * 18}%` }}
        />
      ))}
      <div className="shimmer h-16 rounded-lg bg-muted" />
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="surface p-6 text-center">
      <p className="font-display text-sm font-semibold text-destructive">Não foi possível carregar</p>
      <p className="mt-1 text-xs text-muted-foreground">{message ?? "Tente novamente em instantes."}</p>
    </div>
  );
}

const toneMap = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  gold: "bg-gold-soft text-gold",
  success: "bg-success-soft text-success",
  danger: "bg-destructive-soft text-destructive",
} as const;

export type Tone = keyof typeof toneMap;

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const hintTone =
    tone === "primary"
      ? "text-primary"
      : tone === "gold"
        ? "text-gold"
        : tone === "danger"
          ? "text-destructive"
          : tone === "success"
            ? "text-success"
            : "text-muted-foreground";
  return (
    <div className="surface p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className={cn("mt-1 text-[11px] font-medium", hintTone)}>{hint}</p> : null}
    </div>
  );
}
