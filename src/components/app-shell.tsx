import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Users,
  Sparkles,
  Wallet,
  Package,
  Percent,
  Bot,
  Settings,
  LayoutDashboard,
  UserCog,
  BarChart3,
  CreditCard,
  LogOut,
  Menu,
  ArrowLeft,
  X,
  ShieldCheck,
  Globe2,
  Building2,
  HelpCircle,
  Flower2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { can, roleLabel, useMembership, useSession } from "@/lib/session";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  area: string;
  icon: typeof CalendarDays;
  mobile?: boolean;
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Visão geral",
    area: "dashboard",
    icon: LayoutDashboard,
    mobile: true,
  },
  { to: "/agenda", label: "Agenda", area: "agenda", icon: CalendarDays, mobile: true },
  { to: "/clientes", label: "Clientes", area: "clientes", icon: Users, mobile: true },
  { to: "/crm", label: "CRM · em construção", area: "crm", icon: BarChart3, mobile: true },
  { to: "/servicos", label: "Procedimentos", area: "procedimentos", icon: Sparkles },
  { to: "/equipe", label: "Equipe", area: "equipe", icon: UserCog },
  { to: "/financeiro", label: "Financeiro", area: "financeiro", icon: Wallet, mobile: true },
  { to: "/pagamentos", label: "Pagamentos", area: "financeiro", icon: CreditCard, mobile: true },
  { to: "/relatorios", label: "Relatórios avançados", area: "financeiro", icon: BarChart3 },
  { to: "/gateways", label: "Integrações de pagamento", area: "financeiro", icon: CreditCard },
  { to: "/estoque", label: "Estoque", area: "estoque", icon: Package },
  { to: "/comissoes", label: "Comissões", area: "comissoes", icon: Percent },
  { to: "/assistente", label: "Assistente IA", area: "assistente", icon: Bot, mobile: true },
  {
    to: "/marketing",
    label: "Aura IA · Marketing",
    area: "assistente",
    icon: Sparkles,
    mobile: true,
  },
  { to: "/assinatura", label: "Assinatura", area: "assinatura", icon: CreditCard },
  { to: "/configuracoes", label: "Ajustes", area: "configuracoes", icon: Settings },
  { to: "/globalizacao", label: "Idioma e moeda", area: "configuracoes", icon: Globe2 },
  { to: "/seguranca", label: "Segurança e auditoria", area: "configuracoes", icon: ShieldCheck },
  { to: "/filiais", label: "Filiais", area: "configuracoes", icon: Building2 },
  {
    to: "/ajuda",
    label: "Central de Ajuda",
    area: "configuracoes",
    icon: HelpCircle,
    mobile: true,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: membership } = useMembership();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { language, setLanguage, navLabel } = useLanguage();

  const items = NAV.filter((item) => can(membership?.role, item.area));
  const isPlatformAdmin = user?.email?.toLowerCase() === "tiago3228@yahoo.com.br";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-5 flex items-center justify-between px-2">
        <Link
          to="/"
          target="_self"
          rel="noreferrer"
          aria-label="Ir para a página inicial pública"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
            <Flower2 className="size-4" />
          </span>
          Aura<span className="text-primary">.</span>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X className="size-5" />
        </button>
      </div>

      <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {membership?.organization.name ?? "Clínica"}
      </p>

      <nav className="flex-1 space-y-0.5">
        {[
          ...items,
          ...(isPlatformAdmin
            ? [
                {
                  to: "/platform-admin",
                  label: "Administração master",
                  area: "platform-admin",
                  icon: ShieldCheck,
                },
              ]
            : []),
        ].map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {navLabel(item.label.replace(" · em construção", ""))}
              {item.label.includes("em construção") ? " · em construção" : ""}
            </Link>
          );
        })}
      </nav>

      <div className="surface mt-4 flex items-center gap-3 p-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(membership?.organization.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{membership?.organization.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {membership ? roleLabel[membership.role] : "—"}
          </p>
        </div>
        <button
          onClick={signOut}
          aria-label="Sair"
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4" />
        </button>
        <select
          aria-label="Idioma"
          className="h-8 rounded-md border border-border bg-transparent px-1.5 text-[11px]"
          value={language}
          onChange={(event) => setLanguage(event.target.value as typeof language)}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl">{sidebar}</aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          {pathname !== "/dashboard" ? (
            <button onClick={() => router.history.back()} aria-label="Voltar">
              <ArrowLeft className="size-5" />
            </button>
          ) : null}
          <button onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
        </div>
        <Link
          to="/"
          target="_self"
          rel="noreferrer"
          aria-label="Ir para a página inicial pública"
          className="flex items-center gap-1.5 font-display text-base font-semibold"
        >
          <Flower2 className="size-4 text-primary" /> Aura<span className="text-primary">.</span>
        </Link>
        <div className="flex items-center gap-1">
          <select
            aria-label="Idioma"
            className="h-8 max-w-24 rounded-md border border-border bg-transparent px-1 text-[10px]"
            value={language}
            onChange={(event) => setLanguage(event.target.value as typeof language)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.value}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="min-w-0 px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:ml-64 lg:px-8 lg:pb-10">
        {children}
      </main>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed right-4 bottom-16 z-20 select-none text-[10px] font-medium tracking-wide text-muted-foreground/35 lg:right-6 lg:bottom-3"
      >
        By Tiago Cardoso
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items
          .filter((i) => i.mobile)
          .map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
