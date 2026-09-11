import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LanguageCode = "pt-BR" | "pt-PT" | "en-US";
export const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "en-US", label: "English" },
];

const STORAGE_KEY = "aura-language";
const NAV_LABELS: Record<string, Record<LanguageCode, string>> = {
  "Visão geral": { "pt-BR": "Visão geral", "pt-PT": "Visão geral", "en-US": "Overview" },
  Agenda: { "pt-BR": "Agenda", "pt-PT": "Agenda", "en-US": "Calendar" },
  Clientes: { "pt-BR": "Clientes", "pt-PT": "Clientes", "en-US": "Clients" },
  Procedimentos: { "pt-BR": "Procedimentos", "pt-PT": "Procedimentos", "en-US": "Treatments" },
  Equipe: { "pt-BR": "Equipe", "pt-PT": "Equipa", "en-US": "Team" },
  Financeiro: { "pt-BR": "Financeiro", "pt-PT": "Finanças", "en-US": "Finance" },
  Estoque: { "pt-BR": "Estoque", "pt-PT": "Stock", "en-US": "Inventory" },
  Comissões: { "pt-BR": "Comissões", "pt-PT": "Comissões", "en-US": "Commissions" },
  "Assistente IA": { "pt-BR": "Assistente IA", "pt-PT": "Assistente IA", "en-US": "AI Assistant" },
  Assinatura: { "pt-BR": "Assinatura", "pt-PT": "Subscrição", "en-US": "Subscription" },
  Ajustes: { "pt-BR": "Ajustes", "pt-PT": "Definições", "en-US": "Settings" },
  Filiais: { "pt-BR": "Filiais", "pt-PT": "Filiais", "en-US": "Branches" },
};

function initialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "pt-BR";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "pt-PT" || value === "en-US" ? value : "pt-BR";
}

const LanguageContext = createContext<{
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  navLabel: (label: string) => string;
}>({ language: "pt-BR", setLanguage: () => undefined, navLabel: (label) => label });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(initialLanguage);
  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  };
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      navLabel: (label: string) => NAV_LABELS[label]?.[language] ?? label,
    }),
    [language],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
