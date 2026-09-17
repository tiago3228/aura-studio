/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Bell, Check, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/session";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const orgId = membership?.organization.id;
  const query = useQuery({
    enabled: !!orgId,
    queryKey: ["notifications", orgId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("id,title,body,kind,read,entity_type,entity_id,created_at")
        .eq("organization_id", orgId ?? "")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  const unread = (query.data ?? []).filter((item: { read: boolean }) => !item.read).length;

  async function openNotification(item: { id: string; entity_id?: string | null }) {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", orgId] });
    setOpen(false);
    if (item.entity_id) navigate({ to: "/clientes/$id", params: { id: item.entity_id } });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Notificações"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-card p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold">Notificações</p>
            <Check className="size-4 text-muted-foreground" />
          </div>
          {(query.data ?? []).length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Nenhuma notificação.</p>
          ) : (
            <div className="mt-1 space-y-1">
              {(query.data ?? []).map(
                (item: {
                  id: string;
                  title: string;
                  body: string | null;
                  read: boolean;
                  entity_id?: string | null;
                  created_at: string;
                }) => (
                  <button
                    type="button"
                    key={item.id}
                    className="flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-muted"
                    onClick={() => openNotification(item)}
                  >
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-muted" : "bg-primary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 size-3 shrink-0 text-muted-foreground" />
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
