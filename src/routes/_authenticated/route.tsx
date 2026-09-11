import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useMembership } from "@/lib/session";
import { SkeletonCard } from "@/components/ui-kit";
import { LanguageProvider } from "@/lib/language";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: membership, isLoading } = useMembership();
  const navigate = useNavigate();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    if (!membership || typeof window === "undefined") return;
    const key = "aura-platform-session-id";
    const existing = window.localStorage.getItem(key);
    const sessionId = existing ?? crypto.randomUUID();
    window.localStorage.setItem(key, sessionId);
    const send = (eventType: "entered" | "heartbeat" | "left") => {
      void supabase.rpc(
        "platform_touch_session" as never,
        {
          _session_id: sessionId,
          _organization_id: membership.organization.id,
          _event_type: eventType,
          _user_agent: navigator.userAgent,
        } as never,
      );
    };
    send(existing ? "heartbeat" : "entered");
    const interval = window.setInterval(() => send("heartbeat"), 30_000);
    const onLeave = () => send("left");
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onLeave);
      send("left");
    };
  }, [membership]);

  useEffect(() => {
    if (!isLoading && membership === null && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, membership, navigate, pathname]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <SkeletonCard />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (!membership) {
    return <Outlet />;
  }

  return (
    <LanguageProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </LanguageProvider>
  );
}
