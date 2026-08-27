import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { can, roleLabel, useMembership } from "@/lib/session";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  area: string;
  icon: typeof CalendarDays;
  mobile?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Visão geral", area: "dashboard", icon: LayoutDashboard, mobile: true },
  { to: "/agenda", label: "Agenda", area: "agenda", icon: CalendarDays, mobile: true },
  { to: "/clientes", label: "Clientes", area: "clientes", icon: Users, mobile: true },
  { to: "/servicos", label: "Procedimentos", area: "procedimentos", icon: Sparkles },
  { to: "/equipe", label: "Equipe", area: "equipe", icon: UserCog },
  { to: "/financeiro", label: "Financeiro", area: "financeiro", icon: Wallet, mobile: true },
  { to: "/estoque", label: "Estoque", area: "estoque", icon: Package },
  { to: "/comissoes", label: "Comissões", area: "comissoes", icon: Percent },
  { to: "/assistente", label: "Assistente IA", area: "assistente", icon: Bot, mobile: true },
  { to: "/configuracoes", label: "Ajustes", area: "configuracoes", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: membership } = useMembership();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((item) => can(membership?.role, item.area));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-5 flex items-center justify-between px-2">
        <Link to="/dashboard" className="font-display text-lg font-semibold tracking-tight">
          Aura<span className="text-gold">.</span>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X className="size-5" />
        </button>
      </div>

      <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {membership?.organization.name ?? "Clínica"}
      </p>

      <nav className="flex-1 space-y-0.5">
        {items.map((item) => {
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
              {item.label}
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
        <button onClick={signOut} aria-label="Sair" className="text-muted-foreground hover:text-destructive">
          <LogOut className="size-4" />
        </button>
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

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
        <span className="font-display text-base font-semibold">
          Aura<span className="text-gold">.</span>
        </span>
        <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sair">
          <LogOut className="size-4" />
        </Button>
      </header>

      <main className="px-4 pt-6 pb-28 lg:ml-64 lg:px-8 lg:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur lg:hidden">
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
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
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
