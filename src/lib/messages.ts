/** Modelos de mensagem para envio manual pelo WhatsApp. */
export type MessageEvent =
  | "confirmacao"
  | "cancelamento"
  | "reagendamento"
  | "lembrete"
  | "agradecimento";

export const MESSAGE_EVENTS: { value: MessageEvent; label: string }[] = [
  { value: "confirmacao", label: "Confirmação de agendamento" },
  { value: "cancelamento", label: "Cancelamento" },
  { value: "reagendamento", label: "Reagendamento" },
  { value: "lembrete", label: "Lembrete de horário" },
  { value: "agradecimento", label: "Agradecimento pós-atendimento" },
];

export const DEFAULT_TEMPLATES: Record<MessageEvent, string> = {
  confirmacao:
    "Olá {cliente}! Seu horário para {procedimento} com {profissional} está confirmado para {data} às {hora}. Qualquer dúvida é só chamar. — {clinica}",
  cancelamento:
    "Olá {cliente}, infelizmente precisamos cancelar seu horário de {procedimento} em {data} às {hora}. Podemos remarcar? — {clinica}",
  reagendamento:
    "Olá {cliente}! Seu atendimento de {procedimento} foi reagendado para {data} às {hora} com {profissional}. Pode confirmar, por favor? — {clinica}",
  lembrete:
    "Oi {cliente}! Passando para lembrar do seu horário de {procedimento} amanhã, {data}, às {hora}. Até lá! — {clinica}",
  agradecimento:
    "Obrigada pela visita, {cliente}! Foi um prazer cuidar de você. Qualquer dúvida sobre os cuidados pós-{procedimento}, é só chamar. — {clinica}",
};

export const MESSAGE_VARIABLES = [
  "{cliente}",
  "{data}",
  "{hora}",
  "{procedimento}",
  "{profissional}",
  "{clinica}",
];

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}
