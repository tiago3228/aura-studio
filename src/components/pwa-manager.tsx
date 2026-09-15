import { useEffect, useRef, useState } from "react";
import { RefreshCw, Smartphone, WifiOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_ACCEPTED_KEY = "aura-install-accepted";
const INSTALL_DISMISSED_KEY = "aura-install-dismissed";
const IOS_INSTALL_DISMISSED_KEY = "aura-ios-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [iosInstallDismissed, setIosInstallDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updatingRef = useRef(false);

  useEffect(() => {
    const installWasAccepted = window.localStorage.getItem(INSTALL_ACCEPTED_KEY) === "1";
    setInstalled(isStandalone() || installWasAccepted);
    setOffline(!navigator.onLine);
    setInstallDismissed(window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1");
    setIosInstallDismissed(window.localStorage.getItem(IOS_INSTALL_DISMISSED_KEY) === "1");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      window.localStorage.setItem(INSTALL_ACCEPTED_KEY, "1");
    };
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onControllerChange = () => {
      if (!updatingRef.current) return;
      updatingRef.current = false;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then((registered) => {
        registrationRef.current = registered;
        if (registered.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        registered.addEventListener("updatefound", () => {
          const worker = registered.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller)
              setUpdateReady(true);
          });
        });
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "accepted") {
      setInstalled(true);
      window.localStorage.setItem(INSTALL_ACCEPTED_KEY, "1");
    }
  }

  function update() {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      setUpdateReady(false);
      window.location.reload();
      return;
    }
    updatingRef.current = true;
    setUpdateReady(false);
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  const browserAvailable = typeof window !== "undefined";
  const isIos = browserAvailable && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const showIos = isIos && !installed && !iosInstallDismissed;

  return (
    <>
      {offline ? (
        <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950 [padding-top:max(0.5rem,env(safe-area-inset-top))]">
          <WifiOff className="size-3.5" /> Você está offline. Alterações só serão confirmadas após
          reconectar.
        </div>
      ) : null}

      {updateReady ? (
        <div className="fixed inset-x-3 bottom-20 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-primary/20 bg-card p-3 text-sm shadow-lg lg:bottom-4">
          <RefreshCw className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">Nova versão disponível.</span>
          <Button size="sm" onClick={update}>
            Atualizar agora
          </Button>
        </div>
      ) : null}

      {installEvent && !installed && browserAvailable && !installDismissed ? (
        <div className="fixed inset-x-3 bottom-20 z-[65] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-primary/20 bg-card p-3 text-sm shadow-lg lg:bottom-4">
          <Smartphone className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            Instale o Aura para acessar sua agenda mais rapidamente.
          </span>
          <Button size="sm" onClick={install}>
            Instalar
          </Button>
          <button
            type="button"
            aria-label="Fechar convite de instalação"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setInstallDismissed(true);
              window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {showIos && !iosHelp ? (
        <button
          type="button"
          className="fixed right-3 bottom-20 z-[64] rounded-full border border-primary/20 bg-card px-3 py-2 text-xs font-medium text-primary shadow-lg lg:bottom-4"
          onClick={() => setIosHelp(true)}
        >
          Instalar aplicativo
        </button>
      ) : null}

      {iosHelp ? (
        <div className="fixed inset-x-3 bottom-20 z-[70] mx-auto max-w-md rounded-xl border border-primary/20 bg-card p-4 text-sm shadow-lg lg:bottom-4">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Instale o Aura no iPhone</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.
              </p>
            </div>
            <button
              type="button"
              aria-label="Fechar instruções"
              onClick={() => {
                setIosHelp(false);
                setIosInstallDismissed(true);
                window.localStorage.setItem(IOS_INSTALL_DISMISSED_KEY, "1");
              }}
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
