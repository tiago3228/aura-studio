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
  Pagamentos: { "pt-BR": "Pagamentos", "pt-PT": "Pagamentos", "en-US": "Payments" },
  "Relatórios avançados": {
    "pt-BR": "Relatórios avançados",
    "pt-PT": "Relatórios avançados",
    "en-US": "Advanced reports",
  },
  "Aura IA · Marketing": {
    "pt-BR": "Aura IA · Marketing",
    "pt-PT": "Aura IA · Marketing",
    "en-US": "Aura AI · Marketing",
  },
  "Idioma e moeda": {
    "pt-BR": "Idioma e moeda",
    "pt-PT": "Idioma e moeda",
    "en-US": "Language & currency",
  },
  "Integrações de pagamento": {
    "pt-BR": "Integrações de pagamento",
    "pt-PT": "Integrações de pagamento",
    "en-US": "Payment integrations",
  },
  "Segurança e auditoria": {
    "pt-BR": "Segurança e auditoria",
    "pt-PT": "Segurança e auditoria",
    "en-US": "Security & audit",
  },
  "Central de Ajuda": {
    "pt-BR": "Central de Ajuda",
    "pt-PT": "Central de Ajuda",
    "en-US": "Help Center",
  },
};

const UI_LABELS: Record<string, Record<LanguageCode, string>> = {
  Olá: { "pt-BR": "Olá", "pt-PT": "Olá", "en-US": "Hello" },
  "Novo agendamento": {
    "pt-BR": "Novo agendamento",
    "pt-PT": "Novo agendamento",
    "en-US": "New appointment",
  },
  "Atendimentos hoje": {
    "pt-BR": "Atendimentos hoje",
    "pt-PT": "Atendimentos hoje",
    "en-US": "Appointments today",
  },
  concluídos: { "pt-BR": "concluídos", "pt-PT": "concluídos", "en-US": "completed" },
  "Faturamento hoje": {
    "pt-BR": "Faturamento hoje",
    "pt-PT": "Faturação hoje",
    "en-US": "Today's revenue",
  },
  "Receita 30 dias": {
    "pt-BR": "Receita 30 dias",
    "pt-PT": "Receita 30 dias",
    "en-US": "Revenue (30 days)",
  },
  "vendas registradas": {
    "pt-BR": "vendas registradas",
    "pt-PT": "vendas registadas",
    "en-US": "recorded sales",
  },
  "Margem 30 dias": {
    "pt-BR": "Margem 30 dias",
    "pt-PT": "Margem 30 dias",
    "en-US": "Margin (30 days)",
  },
  "receita menos custos": {
    "pt-BR": "receita menos custos",
    "pt-PT": "receita menos custos",
    "en-US": "revenue minus costs",
  },
  "Agenda de hoje": {
    "pt-BR": "Agenda de hoje",
    "pt-PT": "Agenda de hoje",
    "en-US": "Today's schedule",
  },
  "Ver agenda": { "pt-BR": "Ver agenda", "pt-PT": "Ver agenda", "en-US": "View calendar" },
  "Nenhum atendimento hoje": {
    "pt-BR": "Nenhum atendimento hoje",
    "pt-PT": "Nenhum atendimento hoje",
    "en-US": "No appointments today",
  },
  "Estoque crítico": {
    "pt-BR": "Estoque crítico",
    "pt-PT": "Stock crítico",
    "en-US": "Critical stock",
  },
  "Todos os produtos acima do mínimo.": {
    "pt-BR": "Todos os produtos acima do mínimo.",
    "pt-PT": "Todos os produtos acima do mínimo.",
    "en-US": "All products are above the minimum.",
  },
  Aniversariantes: { "pt-BR": "Aniversariantes", "pt-PT": "Aniversariantes", "en-US": "Birthdays" },
  "Nenhum aniversário nos próximos dias.": {
    "pt-BR": "Nenhum aniversário nos próximos dias.",
    "pt-PT": "Nenhum aniversário nos próximos dias.",
    "en-US": "No birthdays in the next few days.",
  },
  "Dica do dia": { "pt-BR": "Dica do dia", "pt-PT": "Dica do dia", "en-US": "Tip of the day" },
  "Abrir assistente": {
    "pt-BR": "Abrir assistente",
    "pt-PT": "Abrir assistente",
    "en-US": "Open assistant",
  },
  "Cliente avulso": {
    "pt-BR": "Cliente avulso",
    "pt-PT": "Cliente ocasional",
    "en-US": "Walk-in client",
  },
  Serviço: { "pt-BR": "Serviço", "pt-PT": "Serviço", "en-US": "Service" },
  "Sem profissional": {
    "pt-BR": "Sem profissional",
    "pt-PT": "Sem profissional",
    "en-US": "No professional",
  },
  agendado: { "pt-BR": "agendado", "pt-PT": "agendado", "en-US": "scheduled" },
  confirmado: { "pt-BR": "confirmado", "pt-PT": "confirmado", "en-US": "confirmed" },
  aguardando: { "pt-BR": "aguardando", "pt-PT": "a aguardar", "en-US": "pending" },
  atendido: { "pt-BR": "atendido", "pt-PT": "atendido", "en-US": "completed" },
  cancelado: { "pt-BR": "cancelado", "pt-PT": "cancelado", "en-US": "cancelled" },
  faltou: { "pt-BR": "faltou", "pt-PT": "faltou", "en-US": "no-show" },
  reagendado: { "pt-BR": "reagendado", "pt-PT": "reagendado", "en-US": "rescheduled" },
  "Pergunte ao assistente de IA quais clientes não retornam há 60 dias e dispare uma campanha de reativação pelo WhatsApp.":
    {
      "pt-BR":
        "Pergunte ao assistente de IA quais clientes não retornam há 60 dias e dispare uma campanha de reativação pelo WhatsApp.",
      "pt-PT":
        "Pergunte ao assistente de IA quais clientes não regressam há 60 dias e envie uma campanha de reativação pelo WhatsApp.",
      "en-US":
        "Ask the AI assistant which clients have not returned in 60 days and launch a reactivation campaign on WhatsApp.",
    },
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
  t: (label: string) => string;
}>({
  language: "pt-BR",
  setLanguage: () => undefined,
  navLabel: (label) => label,
  t: (label) => label,
});

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
      t: (label: string) => UI_LABELS[label]?.[language] ?? label,
    }),
    [language],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
