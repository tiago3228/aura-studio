import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { can, isAdminRole, useMembership } from "@/lib/session";
import { EmptyState, PageHeader, SkeletonCard, Surface } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
};

type SignupAssets = {
  waba_id: string;
  phone_number_id?: string;
  business_id?: string;
  finish_event: string;
};

type FacebookLoginResponse = {
  authResponse?: { code?: string };
};

type FacebookSdk = {
  init: (options: {
    appId: string;
    autoLogAppEvents: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: {
      config_id: string;
      response_type: "code";
      override_default_response_type: boolean;
      extras: { setup: Record<string, never> };
    },
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

type WhatsAppTab = "overview" | "automations" | "templates" | "history";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  validateSearch: (search: Record<string, unknown>): { tab: WhatsAppTab } => {
    const tab = search["tab"];
    return {
      tab:
        tab === "automations" || tab === "templates" || tab === "history" || tab === "overview"
          ? tab
          : "overview",
    };
  },
  head: () => ({
    meta: [
      { title: "WhatsApp Business — Aura Clínicas" },
      {
        name: "description",
        content:
          "Conecte o WhatsApp Business da clínica e acompanhe modelos, automações e mensagens.",
      },
    ],
  }),
  component: WhatsAppPage,
});

const META_GRAPH_VERSION = "v26.0";
const APP_ID = import.meta.env["VITE_META_APP_ID"]?.trim() ?? "";
const CONFIG_ID = import.meta.env["VITE_META_CONFIG_ID"]?.trim() ?? "";
let facebookSdkPromise: Promise<void> | null = null;

function isMetaOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "www.facebook.com";
  } catch {
    return false;
  }
}

function parseSignupMessage(raw: unknown): { event: string; data: Record<string, unknown> } | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as { type?: unknown; event?: unknown; data?: unknown };
  if (candidate.type !== "WA_EMBEDDED_SIGNUP" || typeof candidate.event !== "string") return null;
  if (!candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data))
    return null;
  return { event: candidate.event, data: candidate.data as Record<string, unknown> };
}

function validMetaId(value: unknown): value is string {
  return typeof value === "string" && /^\d{5,32}$/.test(value);
}

function loadFacebookSdk(appId: string) {
  if (window.FB) return Promise.resolve();
  if (facebookSdkPromise) return facebookSdkPromise;
  facebookSdkPromise = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      facebookSdkPromise = null;
      reject(new Error("META_SDK_TIMEOUT"));
    }, 15_000);
    window.fbAsyncInit = () => {
      if (!window.FB) {
        window.clearTimeout(timeout);
        facebookSdkPromise = null;
        reject(new Error("META_SDK_UNAVAILABLE"));
        return;
      }
      window.FB.init({
        appId,
        autoLogAppEvents: false,
        xfbml: false,
        version: META_GRAPH_VERSION,
      });
      window.clearTimeout(timeout);
      resolve();
    };
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => {
      window.clearTimeout(timeout);
      facebookSdkPromise = null;
      reject(new Error("META_SDK_LOAD_FAILED"));
    };
    document.head.appendChild(script);
  });
  return facebookSdkPromise;
}

function beginEmbeddedSignup(
  appId: string,
  configId: string,
): Promise<{ code: string; assets: SignupAssets }> {
  return new Promise((resolve, reject) => {
    let code: string | null = null;
    let assets: SignupAssets | null = null;
    let finished = false;
    let codeTimer: number | undefined;
    const totalTimer = window.setTimeout(() => fail("META_SIGNUP_TIMEOUT"), 90_000);

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(totalTimer);
      if (codeTimer) window.clearTimeout(codeTimer);
    };
    const fail = (reason: string) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error(reason));
    };
    const completeIfReady = () => {
      if (finished || !code || !assets) return;
      finished = true;
      const result = { code, assets };
      code = null;
      cleanup();
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (!isMetaOrigin(event.origin)) return;
      const message = parseSignupMessage(event.data);
      if (!message) return;
      if (message.event === "CANCEL" || message.event === "ERROR") {
        fail("META_SIGNUP_CANCELLED");
        return;
      }
      if (!["FINISH", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"].includes(message.event)) return;
      const wabaId = message.data["waba_id"];
      const phoneNumberId = message.data["phone_number_id"];
      const businessId = message.data["business_id"];
      const isCoexistence = message.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
      if (!validMetaId(wabaId) || (!isCoexistence && !validMetaId(phoneNumberId))) {
        fail("META_SIGNUP_ASSETS_MISSING");
        return;
      }
      assets = {
        waba_id: wabaId,
        ...(validMetaId(phoneNumberId) ? { phone_number_id: phoneNumberId } : {}),
        ...(validMetaId(businessId) ? { business_id: businessId } : {}),
        finish_event: message.event,
      };
      completeIfReady();
    };

    window.addEventListener("message", onMessage);
    window.FB?.login(
      (response) => {
        const receivedCode = response.authResponse?.code;
        if (
          typeof receivedCode !== "string" ||
          receivedCode.length < 16 ||
          receivedCode.length > 4096
        ) {
          fail("META_SIGNUP_NO_CODE");
          return;
        }
        code = receivedCode;
        codeTimer = window.setTimeout(() => fail("META_CODE_EXPIRED"), 25_000);
        completeIfReady();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
    if (!window.FB) fail("META_SDK_UNAVAILABLE");
  });
}

const AUTOMATIONS = [
  {
    id: "appointment-confirmation",
    title: "Confirmação de agendamento",
    detail: "Após um novo agendamento",
  },
  {
    id: "appointment-reminder-24h",
    title: "Lembrete de consulta",
    detail: "Antes do horário marcado",
  },
  {
    id: "post-appointment",
    title: "Acompanhamento pós-atendimento",
    detail: "Após a conclusão do atendimento",
  },
];

function WhatsAppPage() {
  const { data: membership, isLoading: membershipLoading } = useMembership();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { tab: activeTab } = Route.useSearch();
  const organizationId = membership?.organization.id;
  const canView = can(membership?.role, "whatsapp", membership?.permissions);
  const canConnect = isAdminRole(membership?.role);
  const [connecting, setConnecting] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [phonePin, setPhonePin] = useState("");

  const integration = useQuery({
    enabled: !!organizationId,
    queryKey: ["whatsapp-integration", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from("whatsapp_integrations")
        .select(
          "id, display_name, phone_number, phone_number_id, active, verified, onboarding_state, last_webhook_at, last_error, updated_at",
        )
        .eq("organization_id", organizationId)
        .eq("provider", "meta_cloud")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const connected = integration.data?.active === true && integration.data?.verified === true;

  const templates = useQuery({
    enabled: !!organizationId && connected && activeTab === "templates",
    queryKey: ["whatsapp-meta-templates", organizationId, integration.data?.id],
    queryFn: async (): Promise<MetaTemplate[]> => {
      if (!organizationId) return [];
      const { data, error } = await supabase.functions.invoke("whatsapp-sync-templates", {
        body: { organization_id: organizationId, refresh: false },
      });
      if (error || !data?.ok || !Array.isArray(data.templates)) {
        throw new Error("TEMPLATE_CACHE_LOOKUP_FAILED");
      }
      return data.templates as MetaTemplate[];
    },
  });

  const history = useQuery({
    enabled: !!organizationId && connected && activeTab === "history",
    queryKey: ["whatsapp-history", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select(
          "id, direction, message_type, body, delivery_status, created_at, sent_at, delivered_at, read_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const connectedAtLabel = useMemo(() => {
    const lastWebhook = integration.data?.last_webhook_at;
    return lastWebhook
      ? new Date(lastWebhook).toLocaleString("pt-BR")
      : "Ainda sem eventos recebidos";
  }, [integration.data?.last_webhook_at]);

  function requestWhatsAppConnection() {
    if (!organizationId || !canConnect) return;
    if (!APP_ID || !CONFIG_ID) {
      toast.error("A conexão direta ainda não está habilitada pela plataforma.", {
        description:
          "O Aura precisa concluir a configuração e a revisão do aplicativo Meta. Você não precisa informar tokens.",
      });
      return;
    }
    setPhonePin("");
    setConnectDialogOpen(true);
  }

  async function connectWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !canConnect || !/^\d{6}$/.test(phonePin)) return;
    const submittedPin = phonePin;
    setPhonePin("");
    setConnectDialogOpen(false);
    setConnecting(true);
    try {
      await loadFacebookSdk(APP_ID);
      const signup = await beginEmbeddedSignup(APP_ID, CONFIG_ID);
      if (signup.assets.finish_event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
        throw new Error("META_COEXISTENCE_REQUIRES_SYNC");
      }
      if (!signup.assets.phone_number_id) throw new Error("META_SIGNUP_ASSETS_MISSING");
      const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
        body: {
          organization_id: organizationId,
          code: signup.code,
          waba_id: signup.assets.waba_id,
          phone_number_id: signup.assets.phone_number_id,
          business_id: signup.assets.business_id ?? null,
          finish_event: signup.assets.finish_event,
          phone_pin: submittedPin,
        },
      });
      if (error || !data?.ok) throw new Error("WHATSAPP_CONNECT_FAILED");
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-integration", organizationId] });
      toast.success("WhatsApp conectado.", {
        description:
          "A conta foi registrada pela Meta. O envio de mensagens pelo Aura ainda não está habilitado nesta etapa.",
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "META_SIGNUP_CANCELLED") {
        toast.message("Conexão cancelada. Nenhuma mensagem foi enviada.");
      } else if (code === "META_CODE_EXPIRED") {
        toast.error("A autorização Meta expirou antes da finalização. Tente novamente.");
      } else if (code === "META_COEXISTENCE_REQUIRES_SYNC") {
        toast.error("Este número precisa do fluxo de coexistência da Meta.", {
          description:
            "O Aura ainda não implementou a sincronização obrigatória de contatos e histórico; nenhum token foi trocado nem mensagem enviada.",
        });
      } else {
        toast.error("Não foi possível concluir a conexão.", {
          description:
            "Nenhuma mensagem foi enviada. Verifique a configuração do Aura ou tente novamente mais tarde.",
        });
      }
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-integration", organizationId] });
      setConnecting(false);
      setPhonePin("");
    }
  }

  async function disconnectWhatsApp() {
    if (!organizationId || !integration.data?.id || !canConnect) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-disconnect", {
        body: { organization_id: organizationId, integration_id: integration.data.id },
      });
      if (error || !data?.ok) throw new Error("DISCONNECT_FAILED");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["whatsapp-integration", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["whatsapp-meta-templates", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["whatsapp-history", organizationId] }),
      ]);
      toast.success("WhatsApp desconectado com segurança.", {
        description: "O Aura removeu sua credencial. O número não foi desregistrado da Meta.",
      });
    } catch {
      toast.error("Não foi possível concluir a desconexão.", {
        description:
          "Se a Meta já confirmou a remoção do webhook, a limpeza local ainda precisa ser repetida. A credencial permanece criptografada no Vault até a confirmação completa.",
      });
    } finally {
      setDisconnecting(false);
      setDisconnectDialogOpen(false);
    }
  }

  async function syncMetaTemplates() {
    if (!organizationId || !connected || !canConnect) return;
    setSyncingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-sync-templates", {
        body: { organization_id: organizationId, refresh: true },
      });
      if (error || !data?.ok || !Array.isArray(data.templates)) throw new Error("SYNC_FAILED");
      await queryClient.invalidateQueries({
        queryKey: ["whatsapp-meta-templates", organizationId, integration.data?.id],
      });
      toast.success(`Modelos Meta atualizados: ${data.templates.length}.`);
    } catch {
      toast.error("Não foi possível atualizar os modelos Meta.");
    } finally {
      setSyncingTemplates(false);
    }
  }

  if (membershipLoading) return <SkeletonCard />;
  if (!membership) {
    return (
      <EmptyState
        title="Organização indisponível"
        description="Entre novamente na clínica para consultar a conexão do WhatsApp."
      />
    );
  }
  if (!canView) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Solicite ao proprietário da clínica a permissão para visualizar o WhatsApp."
      />
    );
  }

  const tabs: Array<{ id: WhatsAppTab; label: string }> = [
    { id: "overview", label: "Visão geral" },
    { id: "automations", label: "Automações" },
    { id: "templates", label: "Modelos Meta" },
    { id: "history", label: "Histórico de mensagens" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="WhatsApp Business"
        subtitle="Conecte o número da clínica e organize mensagens em um só lugar."
      />

      <div
        role="tablist"
        aria-label="Recursos do WhatsApp"
        className="flex flex-wrap gap-2 border-b pb-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => void navigate({ to: "/whatsapp", search: { tab: tab.id } })}
            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {integration.isLoading ? <SkeletonCard /> : null}
      {integration.error ? (
        <Surface className="flex items-start gap-3 border border-amber-300/60 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium">O status da conexão não pôde ser consultado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A tela permanece em modo seguro; nenhum número é considerado conectado sem confirmação
              do backend.
            </p>
          </div>
        </Surface>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <Surface className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
                  <MessageCircle className="size-6" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {connected
                      ? (integration.data?.display_name ?? "WhatsApp da clínica")
                      : "Conectar WhatsApp"}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {connected
                      ? "A conta da clínica está conectada à plataforma Meta. O envio pelo Aura ainda não está habilitado."
                      : "Conecte o número da clínica pela Meta. Nesta etapa, o Aura ainda não envia mensagens e não solicita tokens ou chaves; o PIN de segurança é usado somente no cadastro."}
                  </p>
                  {connected && integration.data?.phone_number ? (
                    <p className="mt-2 text-sm font-medium">{integration.data.phone_number}</p>
                  ) : null}
                </div>
              </div>
              {connected ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="size-4" /> Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  <Clock3 className="size-4" /> Não conectado
                </span>
              )}
            </div>

            {!connected ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={requestWhatsAppConnection}
                  disabled={!canConnect || connecting}
                >
                  {connecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageCircle className="size-4" />
                  )}
                  {connecting ? "Abrindo a Meta…" : "Conectar WhatsApp Business"}
                </Button>
                {!canConnect ? (
                  <p className="text-xs text-muted-foreground">
                    Somente proprietário ou gerente pode conectar um número.
                  </p>
                ) : !APP_ID || !CONFIG_ID ? (
                  <p className="text-xs text-muted-foreground">
                    A conexão direta será habilitada após a configuração e revisão do app Meta pelo
                    Aura.
                  </p>
                ) : null}
                {canConnect &&
                integration.data?.id &&
                (integration.data.onboarding_state === "failed" ||
                  integration.data.onboarding_state === "pending_setup") ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDisconnectDialogOpen(true)}
                    disabled={disconnecting}
                  >
                    <Unplug className="size-4" /> Limpar conexão incompleta
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Último evento do WhatsApp: {connectedAtLabel}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  Envio pelo Aura ainda não habilitado
                </div>
                {canConnect ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDisconnectDialogOpen(true)}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Unplug className="size-4" />
                    )}
                    Desconectar
                  </Button>
                ) : null}
              </div>
            )}
          </Surface>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Qualidade do número",
                value: connected ? "Métrica ainda não integrada" : "—",
                icon: ShieldCheck,
              },
              {
                label: "Envio pelo Aura",
                value: connected ? "Ainda não habilitado" : "—",
                icon: Wifi,
              },
              {
                label: "Limite de envio",
                value: connected ? "Métrica ainda não integrada" : "—",
                icon: RefreshCw,
              },
              {
                label: "Cadastro na Meta",
                value: connected ? "Conectado" : "Não conectado",
                icon: CheckCircle2,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Surface key={item.label} className="space-y-2 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-4" /> {item.label}
                  </div>
                  <p className="text-sm font-semibold">{item.value}</p>
                </Surface>
              );
            })}
          </div>

          <Surface className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">Ainda pode usar os modelos atuais do Aura</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O envio manual continua abrindo o WhatsApp para revisão. Essas mensagens ainda não
                aparecem no histórico Meta do Aura.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/mensagens">
                Ver modelos de mensagens <ExternalLink className="size-4" />
              </Link>
            </Button>
          </Surface>
        </div>
      ) : null}

      {activeTab === "automations" ? (
        <div className="space-y-4">
          <Surface className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Automações protegidas por consentimento</p>
              <p className="text-sm text-muted-foreground">
                A ativação dependerá de conexão confirmada, modelo Meta aprovado e opt-in
                documentado do cliente. Nesta etapa local, nenhuma regra está ativa e nenhum envio
                automático é disparado.
              </p>
            </div>
          </Surface>
          <div className="grid gap-3 md:grid-cols-3">
            {AUTOMATIONS.map((automation) => (
              <Surface key={automation.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{automation.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{automation.detail}</p>
                  </div>
                  <Switch disabled checked={false} aria-label={`${automation.title} desativada`} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Desativada · aguarda conexão e configuração segura
                </p>
              </Surface>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "templates" ? (
        <div className="space-y-4">
          <Surface className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">Modelos de mensagem da Meta</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Apenas modelos aprovados pela Meta podem iniciar mensagens fora da janela de
                atendimento.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void syncMetaTemplates()}
              disabled={!connected || !canConnect || syncingTemplates}
            >
              {syncingTemplates ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Atualizar modelos
            </Button>
          </Surface>
          {!connected ? (
            <EmptyState
              title="WhatsApp ainda não conectado"
              description="Conecte o número da clínica para consultar os modelos cadastrados na Meta."
            />
          ) : templates.isLoading ? (
            <SkeletonCard />
          ) : templates.error ? (
            <EmptyState
              title="Modelos indisponíveis"
              description="Não foi possível carregar os modelos sincronizados da Meta. Tente atualizar novamente."
            />
          ) : !templates.data?.length ? (
            <EmptyState
              title="Modelos ainda não sincronizados"
              description="Use “Atualizar modelos” para consultar o estado atual no WABA da clínica."
            />
          ) : (
            <div className="space-y-2">
              {templates.data.map((template) => (
                <Surface
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.language} · {template.category}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {template.status}
                  </span>
                </Surface>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "history" ? (
        !connected ? (
          <EmptyState
            title="WhatsApp ainda não conectado"
            description="O histórico aparecerá aqui depois que a Meta confirmar a conexão e chegarem eventos reais."
          />
        ) : history.isLoading ? (
          <SkeletonCard />
        ) : history.error ? (
          <EmptyState
            title="Histórico indisponível"
            description="Não foi possível consultar as mensagens. Nenhum dado local foi inventado."
          />
        ) : !history.data?.length ? (
          <EmptyState
            title="Ainda sem mensagens"
            description="As mensagens recebidas pela Meta aparecerão aqui. Mensagens enviadas pelo link wa.me não são sincronizadas com o Aura."
          />
        ) : (
          <div className="space-y-2">
            <Surface className="p-3 text-xs text-muted-foreground">
              Nesta etapa, este histórico registra mensagens recebidas por webhook; envios manuais
              via wa.me não são importados.
            </Surface>
            {history.data.map((message) => (
              <Surface
                key={message.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {message.direction === "inbound" ? "Recebida" : "Enviada"} ·{" "}
                    {message.message_type}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {message.body ?? "Mídia"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(message.created_at).toLocaleString("pt-BR")}</p>
                  <p className="mt-1 font-medium">{message.delivery_status}</p>
                </div>
              </Surface>
            ))}
          </div>
        )
      ) : null}

      <Dialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          if (connecting) return;
          setConnectDialogOpen(open);
          if (!open) setPhonePin("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preparar conexão do WhatsApp</DialogTitle>
            <DialogDescription>
              Informe o PIN de verificação em duas etapas do número. Se a clínica ainda não definiu
              um PIN, escolha agora um código de 6 dígitos para o registro na Meta.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void connectWhatsApp(event)}>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-registration-pin">PIN de 6 dígitos</Label>
              <Input
                id="whatsapp-registration-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{6}"
                maxLength={6}
                value={phonePin}
                onChange={(event) => setPhonePin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                aria-describedby="whatsapp-pin-disclosure"
                required
              />
              <p id="whatsapp-pin-disclosure" className="text-xs text-muted-foreground">
                O Aura usa esse PIN apenas durante o cadastro server-side. Ele não é salvo no Aura,
                não aparece em logs e não é retornado pelo backend. Se o número já tiver PIN, use o
                PIN existente.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConnectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={connecting || phonePin.length !== 6}>
                {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
                Continuar para a Meta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar o WhatsApp da clínica?</AlertDialogTitle>
            <AlertDialogDescription>
              O Aura pedirá à Meta para remover a inscrição de webhooks e, somente após confirmação,
              apagará a credencial do Vault, desativará as automações e cancelará envios ainda na
              fila. O histórico local será preservado. O número não será desregistrado da Meta nem
              removido do WhatsApp Business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={disconnecting}
              onClick={(event) => {
                event.preventDefault();
                void disconnectWhatsApp();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? <Loader2 className="size-4 animate-spin" /> : null}
              {disconnecting ? "Desconectando…" : "Desconectar e limpar credencial"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
