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
  Cliente: { "pt-BR": "Cliente", "pt-PT": "Cliente", "en-US": "Client" },
  atendimento: { "pt-BR": "atendimento", "pt-PT": "atendimento", "en-US": "appointment" },
  "nossa equipe": { "pt-BR": "nossa equipe", "pt-PT": "a nossa equipa", "en-US": "our team" },
  "Enviar mensagem ao cliente": {
    "pt-BR": "Enviar mensagem ao cliente",
    "pt-PT": "Enviar mensagem ao cliente",
    "en-US": "Send a message to the client",
  },
  "Cliente sem WhatsApp cadastrado": {
    "pt-BR": "Cliente sem WhatsApp cadastrado",
    "pt-PT": "Cliente sem WhatsApp registado",
    "en-US": "Client has no WhatsApp number",
  },
  Mensagem: { "pt-BR": "Mensagem", "pt-PT": "Mensagem", "en-US": "Message" },
  "Alterar status": {
    "pt-BR": "Alterar status",
    "pt-PT": "Alterar estado",
    "en-US": "Change status",
  },
  "cadastros ativos": {
    "pt-BR": "cadastros ativos",
    "pt-PT": "registos ativos",
    "en-US": "active records",
  },
  "Novo cliente": { "pt-BR": "Novo cliente", "pt-PT": "Novo cliente", "en-US": "New client" },
  "Buscar por nome, telefone ou e-mail": {
    "pt-BR": "Buscar por nome, telefone ou e-mail",
    "pt-PT": "Pesquisar por nome, telefone ou e-mail",
    "en-US": "Search by name, phone or email",
  },
  "Nenhum cliente encontrado": {
    "pt-BR": "Nenhum cliente encontrado",
    "pt-PT": "Nenhum cliente encontrado",
    "en-US": "No clients found",
  },
  "Cadastre sua base de clientes para acompanhar histórico, pacotes e prontuários.": {
    "pt-BR": "Cadastre sua base de clientes para acompanhar histórico, pacotes e prontuários.",
    "pt-PT": "Registe a sua base de clientes para acompanhar o histórico, pacotes e processos.",
    "en-US": "Add clients to track history, packages and records.",
  },
  "Sem contato": { "pt-BR": "Sem contato", "pt-PT": "Sem contacto", "en-US": "No contact" },
  "Cliente cadastrado.": {
    "pt-BR": "Cliente cadastrado.",
    "pt-PT": "Cliente registado.",
    "en-US": "Client added.",
  },
  "Erro ao salvar.": {
    "pt-BR": "Erro ao salvar.",
    "pt-PT": "Erro ao guardar.",
    "en-US": "Error saving.",
  },
  "Nome completo": { "pt-BR": "Nome completo", "pt-PT": "Nome completo", "en-US": "Full name" },
  Nascimento: { "pt-BR": "Nascimento", "pt-PT": "Data de nascimento", "en-US": "Date of birth" },
  "Como conheceu": {
    "pt-BR": "Como conheceu",
    "pt-PT": "Como nos conheceu",
    "en-US": "How did you hear about us?",
  },
  "Instagram, indicação...": {
    "pt-BR": "Instagram, indicação...",
    "pt-PT": "Instagram, recomendação...",
    "en-US": "Instagram, referral...",
  },
  Observações: { "pt-BR": "Observações", "pt-PT": "Observações", "en-US": "Notes" },
  Cadastrar: { "pt-BR": "Cadastrar", "pt-PT": "Registar", "en-US": "Add client" },
  "Informe o nome do cliente.": {
    "pt-BR": "Informe o nome do cliente.",
    "pt-PT": "Indique o nome do cliente.",
    "en-US": "Enter the client's name.",
  },
  "Cliente já cadastrado": {
    "pt-BR": "Cliente já cadastrado",
    "pt-PT": "Cliente já registado",
    "en-US": "Client already exists",
  },
  "O agendamento será vinculado a ele.": {
    "pt-BR": "O agendamento será vinculado a ele.",
    "pt-PT": "O agendamento ficará associado a esse cliente.",
    "en-US": "The appointment will be linked to this client.",
  },
  "Agendamento criado.": {
    "pt-BR": "Agendamento criado.",
    "pt-PT": "Agendamento criado.",
    "en-US": "Appointment created.",
  },
  "Erro ao agendar.": {
    "pt-BR": "Erro ao agendar.",
    "pt-PT": "Erro ao agendar.",
    "en-US": "Error creating appointment.",
  },
  "Novo cliente neste agendamento": {
    "pt-BR": "Novo cliente neste agendamento",
    "pt-PT": "Novo cliente neste agendamento",
    "en-US": "New client for this appointment",
  },
  "Cadastro rápido do cliente": {
    "pt-BR": "Cadastro rápido do cliente",
    "pt-PT": "Registo rápido do cliente",
    "en-US": "Quick client registration",
  },
  Procedimento: { "pt-BR": "Procedimento", "pt-PT": "Procedimento", "en-US": "Treatment" },
  Profissional: { "pt-BR": "Profissional", "pt-PT": "Profissional", "en-US": "Professional" },
  Selecione: { "pt-BR": "Selecione", "pt-PT": "Selecione", "en-US": "Select" },
  Data: { "pt-BR": "Data", "pt-PT": "Data", "en-US": "Date" },
  Horário: { "pt-BR": "Horário", "pt-PT": "Horário", "en-US": "Time" },
  Salvar: { "pt-BR": "Salvar", "pt-PT": "Guardar", "en-US": "Save" },
  Serviço: { "pt-BR": "Serviço", "pt-PT": "Serviço", "en-US": "Service" },
  "Sem profissional": {
    "pt-BR": "Sem profissional",
    "pt-PT": "Sem profissional",
    "en-US": "No professional",
  },
  "Legenda:": { "pt-BR": "Legenda:", "pt-PT": "Legenda:", "en-US": "Legend:" },
  "Status atualizado.": {
    "pt-BR": "Status atualizado.",
    "pt-PT": "Estado atualizado.",
    "en-US": "Status updated.",
  },
  Agendar: { "pt-BR": "Agendar", "pt-PT": "Agendar", "en-US": "Book" },
  "Conflitos de profissional e sala são bloqueados automaticamente.": {
    "pt-BR": "Conflitos de profissional e sala são bloqueados automaticamente.",
    "pt-PT": "Os conflitos de profissional e sala são bloqueados automaticamente.",
    "en-US": "Professional and room conflicts are blocked automatically.",
  },
  "agendamento(s) online aguardando confirmação": {
    "pt-BR": "agendamento(s) online aguardando confirmação",
    "pt-PT": "agendamento(s) online a aguardar confirmação",
    "en-US": "online appointment(s) awaiting confirmation",
  },
  "A Agenda verifica novos pedidos automaticamente a cada 30 segundos.": {
    "pt-BR": "A Agenda verifica novos pedidos automaticamente a cada 30 segundos.",
    "pt-PT": "A Agenda verifica novos pedidos automaticamente a cada 30 segundos.",
    "en-US": "The calendar checks for new requests every 30 seconds.",
  },
  "Ver primeiro": { "pt-BR": "Ver primeiro", "pt-PT": "Ver primeiro", "en-US": "View first" },
  "Alertas limpos. Novos agendamentos continuarão aparecendo.": {
    "pt-BR": "Alertas limpos. Novos agendamentos continuarão aparecendo.",
    "pt-PT": "Alertas limpos. Os novos agendamentos continuarão a aparecer.",
    "en-US": "Alerts cleared. New appointments will continue to appear.",
  },
  "Limpar alerta": { "pt-BR": "Limpar alerta", "pt-PT": "Limpar alerta", "en-US": "Clear alert" },
  Paciente: { "pt-BR": "Paciente", "pt-PT": "Paciente", "en-US": "Patient" },
  "Agendamento online": {
    "pt-BR": "Agendamento online",
    "pt-PT": "Agendamento online",
    "en-US": "Online booking",
  },
  "Envie este link para seus clientes agendarem sozinhos": {
    "pt-BR": "Envie este link para seus clientes agendarem sozinhos",
    "pt-PT": "Envie este link para os seus clientes marcarem sozinhos",
    "en-US": "Share this link so clients can book on their own",
  },
  "Configure o link público em Configurações.": {
    "pt-BR": "Configure o link público em Configurações.",
    "pt-PT": "Configure o link público em Definições.",
    "en-US": "Configure the public link in Settings.",
  },
  "Link copiado.": {
    "pt-BR": "Link copiado.",
    "pt-PT": "Ligação copiada.",
    "en-US": "Link copied.",
  },
  "Copiar link": { "pt-BR": "Copiar link", "pt-PT": "Copiar ligação", "en-US": "Copy link" },
  Abrir: { "pt-BR": "Abrir", "pt-PT": "Abrir", "en-US": "Open" },
  "Todas as filiais": {
    "pt-BR": "Todas as filiais",
    "pt-PT": "Todas as filiais",
    "en-US": "All branches",
  },
  Anterior: { "pt-BR": "Anterior", "pt-PT": "Anterior", "en-US": "Previous" },
  Próximo: { "pt-BR": "Próximo", "pt-PT": "Seguinte", "en-US": "Next" },
  Hoje: { "pt-BR": "Hoje", "pt-PT": "Hoje", "en-US": "Today" },
  dia: { "pt-BR": "dia", "pt-PT": "dia", "en-US": "day" },
  semana: { "pt-BR": "semana", "pt-PT": "semana", "en-US": "week" },
  Livre: { "pt-BR": "Livre", "pt-PT": "Livre", "en-US": "Available" },
  "Nenhum agendamento neste período": {
    "pt-BR": "Nenhum agendamento neste período",
    "pt-PT": "Nenhum agendamento neste período",
    "en-US": "No appointments in this period",
  },
  "Clique em Agendar para criar o primeiro atendimento — o sistema valida horários automaticamente.":
    {
      "pt-BR":
        "Clique em Agendar para criar o primeiro atendimento — o sistema valida horários automaticamente.",
      "pt-PT":
        "Clique em Agendar para criar o primeiro atendimento — o sistema valida os horários automaticamente.",
      "en-US":
        "Click Book to create the first appointment — the system checks availability automatically.",
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
