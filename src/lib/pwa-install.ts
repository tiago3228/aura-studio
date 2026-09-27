export const OPEN_AURA_INSTALL_EVENT = "aura:pwa-open-install";

export function isAuraInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function requestAuraInstall() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_AURA_INSTALL_EVENT));
  }
}
