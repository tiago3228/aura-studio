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
  Calculadora: { "pt-BR": "Calculadora", "pt-PT": "Calculadora", "en-US": "Calculator" },
  "Faça simulações rápidas para a operação da sua clínica.": {
    "pt-BR": "Faça simulações rápidas para a operação da sua clínica.",
    "pt-PT": "Faça simulações rápidas para a operação da sua clínica.",
    "en-US": "Run quick simulations for your clinic operations.",
  },
  "Calculadora comum": {
    "pt-BR": "Calculadora comum",
    "pt-PT": "Calculadora comum",
    "en-US": "Basic calculator",
  },
  "Operações básicas para o dia a dia.": {
    "pt-BR": "Operações básicas para o dia a dia.",
    "pt-PT": "Operações básicas para o dia a dia.",
    "en-US": "Basic operations for everyday use.",
  },
  "Calculadora de preço e margem": {
    "pt-BR": "Calculadora de preço e margem",
    "pt-PT": "Calculadora de preço e margem",
    "en-US": "Price and margin calculator",
  },
  "Simule preços, lucro, markup e descontos.": {
    "pt-BR": "Simule preços, lucro, markup e descontos.",
    "pt-PT": "Simule preços, lucro, markup e descontos.",
    "en-US": "Simulate prices, profit, markup and discounts.",
  },
  Limpar: { "pt-BR": "Limpar", "pt-PT": "Limpar", "en-US": "Clear" },
  "Dados do produto": {
    "pt-BR": "Dados do produto",
    "pt-PT": "Dados do produto",
    "en-US": "Product data",
  },
  "Custo total do produto": {
    "pt-BR": "Custo total do produto",
    "pt-PT": "Custo total do produto",
    "en-US": "Total product cost",
  },
  "Informe matéria-prima, embalagem e outros custos diretos do produto.": {
    "pt-BR": "Informe matéria-prima, embalagem e outros custos diretos do produto.",
    "pt-PT": "Indique matéria-prima, embalagem e outros custos diretos do produto.",
    "en-US": "Enter raw materials, packaging and other direct product costs.",
  },
  "Margem de lucro desejada": {
    "pt-BR": "Margem de lucro desejada",
    "pt-PT": "Margem de lucro pretendida",
    "en-US": "Desired profit margin",
  },
  "A margem representa o lucro como percentual do preço final.": {
    "pt-BR": "A margem representa o lucro como percentual do preço final.",
    "pt-PT": "A margem representa o lucro como percentagem do preço final.",
    "en-US": "Margin represents profit as a percentage of the final price.",
  },
  "Desconto simulado": {
    "pt-BR": "Desconto simulado",
    "pt-PT": "Desconto simulado",
    "en-US": "Simulated discount",
  },
  "Use este campo para verificar quanto sobrará caso você ofereça um desconto.": {
    "pt-BR": "Use este campo para verificar quanto sobrará caso você ofereça um desconto.",
    "pt-PT": "Use este campo para verificar quanto restará se oferecer um desconto.",
    "en-US": "Use this field to see what remains if you offer a discount.",
  },
  "Resultado da simulação": {
    "pt-BR": "Resultado da simulação",
    "pt-PT": "Resultado da simulação",
    "en-US": "Simulation result",
  },
  "Preço de venda sugerido": {
    "pt-BR": "Preço de venda sugerido",
    "pt-PT": "Preço de venda sugerido",
    "en-US": "Suggested sale price",
  },
  "Lucro por unidade": {
    "pt-BR": "Lucro por unidade",
    "pt-PT": "Lucro por unidade",
    "en-US": "Profit per unit",
  },
  "Markup sobre o custo": {
    "pt-BR": "Markup sobre o custo",
    "pt-PT": "Markup sobre o custo",
    "en-US": "Markup over cost",
  },
  "Preço com desconto": {
    "pt-BR": "Preço com desconto",
    "pt-PT": "Preço com desconto",
    "en-US": "Discounted price",
  },
  "Lucro após desconto": {
    "pt-BR": "Lucro após desconto",
    "pt-PT": "Lucro após desconto",
    "en-US": "Profit after discount",
  },
  "Margem depois do desconto": {
    "pt-BR": "Margem depois do desconto",
    "pt-PT": "Margem depois do desconto",
    "en-US": "Margin after discount",
  },
  "Informe o custo do produto para visualizar os resultados.": {
    "pt-BR": "Informe o custo do produto para visualizar os resultados.",
    "pt-PT": "Indique o custo do produto para visualizar os resultados.",
    "en-US": "Enter the product cost to view the results.",
  },
  "Esta é uma simulação. Considere taxas, impostos, frete, comissões e despesas fixas antes de definir o preço final.":
    {
      "pt-BR":
        "Esta é uma simulação. Considere taxas, impostos, frete, comissões e despesas fixas antes de definir o preço final.",
      "pt-PT":
        "Esta é uma simulação. Considere taxas, impostos, portes, comissões e despesas fixas antes de definir o preço final.",
      "en-US":
        "This is a simulation. Consider fees, taxes, shipping, commissions and fixed expenses before setting the final price.",
    },
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
  Pacotes: { "pt-BR": "Pacotes", "pt-PT": "Pacotes", "en-US": "Packages" },
  "Preço, duração, comissão e disponibilidade para agendamento online.": {
    "pt-BR": "Preço, duração, comissão e disponibilidade para agendamento online.",
    "pt-PT": "Preço, duração, comissão e disponibilidade para agendamento online.",
    "en-US": "Price, duration, commission and online booking availability.",
  },
  "Novo procedimento": {
    "pt-BR": "Novo procedimento",
    "pt-PT": "Novo procedimento",
    "en-US": "New treatment",
  },
  "Biblioteca pronta": {
    "pt-BR": "Biblioteca pronta",
    "pt-PT": "Biblioteca pronta",
    "en-US": "Ready-made library",
  },
  "Nenhum procedimento cadastrado": {
    "pt-BR": "Nenhum procedimento cadastrado",
    "pt-PT": "Nenhum procedimento registado",
    "en-US": "No treatments added",
  },
  "Cadastre limpeza de pele, botox, drenagem... ou use a biblioteca pronta.": {
    "pt-BR": "Cadastre limpeza de pele, botox, drenagem... ou use a biblioteca pronta.",
    "pt-PT": "Registe limpeza de pele, botox, drenagem... ou use a biblioteca pronta.",
    "en-US": "Add facials, Botox, lymphatic drainage... or use the ready-made library.",
  },
  Ativo: { "pt-BR": "Ativo", "pt-PT": "Ativo", "en-US": "Active" },
  "Editar procedimento": {
    "pt-BR": "Editar procedimento",
    "pt-PT": "Editar procedimento",
    "en-US": "Edit treatment",
  },
  "Excluir procedimento": {
    "pt-BR": "Excluir procedimento",
    "pt-PT": "Excluir procedimento",
    "en-US": "Delete treatment",
  },
  "Novo pacote": { "pt-BR": "Novo pacote", "pt-PT": "Novo pacote", "en-US": "New package" },
  "Nenhum pacote": { "pt-BR": "Nenhum pacote", "pt-PT": "Nenhum pacote", "en-US": "No packages" },
  "Pacotes de sessões aumentam a recorrência e o ticket médio.": {
    "pt-BR": "Pacotes de sessões aumentam a recorrência e o ticket médio.",
    "pt-PT": "Os pacotes de sessões aumentam a recorrência e o valor médio.",
    "en-US": "Session packages increase repeat visits and average spend.",
  },
  validade: { "pt-BR": "validade", "pt-PT": "validade", "en-US": "valid for" },
  dias: { "pt-BR": "dias", "pt-PT": "dias", "en-US": "days" },
  "Editar pacote": { "pt-BR": "Editar pacote", "pt-PT": "Editar pacote", "en-US": "Edit package" },
  "Excluir pacote": {
    "pt-BR": "Excluir pacote",
    "pt-PT": "Excluir pacote",
    "en-US": "Delete package",
  },
  "Procedimento excluído.": {
    "pt-BR": "Procedimento excluído.",
    "pt-PT": "Procedimento eliminado.",
    "en-US": "Treatment deleted.",
  },
  "Pacote excluído.": {
    "pt-BR": "Pacote excluído.",
    "pt-PT": "Pacote eliminado.",
    "en-US": "Package deleted.",
  },
  Nome: { "pt-BR": "Nome", "pt-PT": "Nome", "en-US": "Name" },
  "Limpeza de pele profunda": {
    "pt-BR": "Limpeza de pele profunda",
    "pt-PT": "Limpeza de pele profunda",
    "en-US": "Deep facial cleansing",
  },
  "Duração (min)": {
    "pt-BR": "Duração (min)",
    "pt-PT": "Duração (min)",
    "en-US": "Duration (min)",
  },
  "Preço (R$)": { "pt-BR": "Preço (R$)", "pt-PT": "Preço (€)", "en-US": "Price" },
  Comissão: { "pt-BR": "Comissão", "pt-PT": "Comissão", "en-US": "Commission" },
  Tipo: { "pt-BR": "Tipo", "pt-PT": "Tipo", "en-US": "Type" },
  "Percentual (%)": {
    "pt-BR": "Percentual (%)",
    "pt-PT": "Percentagem (%)",
    "en-US": "Percentage (%)",
  },
  "Valor fixo (R$)": {
    "pt-BR": "Valor fixo (R$)",
    "pt-PT": "Valor fixo (€)",
    "en-US": "Fixed amount",
  },
  Descrição: { "pt-BR": "Descrição", "pt-PT": "Descrição", "en-US": "Description" },
  "Disponível para agendamento online": {
    "pt-BR": "Disponível para agendamento online",
    "pt-PT": "Disponível para agendamento online",
    "en-US": "Available for online booking",
  },
  "Procedimento atualizado.": {
    "pt-BR": "Procedimento atualizado.",
    "pt-PT": "Procedimento atualizado.",
    "en-US": "Treatment updated.",
  },
  "Procedimento cadastrado.": {
    "pt-BR": "Procedimento cadastrado.",
    "pt-PT": "Procedimento registado.",
    "en-US": "Treatment added.",
  },
  "Procedimentos adicionados. Defina os preços em seguida.": {
    "pt-BR": "Procedimentos adicionados. Defina os preços em seguida.",
    "pt-PT": "Procedimentos adicionados. Defina os preços em seguida.",
    "en-US": "Treatments added. Set their prices next.",
  },
  "Biblioteca de procedimentos": {
    "pt-BR": "Biblioteca de procedimentos",
    "pt-PT": "Biblioteca de procedimentos",
    "en-US": "Treatment library",
  },
  "Selecione os procedimentos que sua clínica realiza. Eles entram com preço zerado — ajuste depois.":
    {
      "pt-BR":
        "Selecione os procedimentos que sua clínica realiza. Eles entram com preço zerado — ajuste depois.",
      "pt-PT":
        "Selecione os procedimentos que a sua clínica realiza. Serão adicionados com preço zero — ajuste depois.",
      "en-US":
        "Select the treatments your clinic offers. They will be added with a zero price — adjust it later.",
    },
  "já cadastrado": { "pt-BR": "já cadastrado", "pt-PT": "já registado", "en-US": "already added" },
  Adicionar: { "pt-BR": "Adicionar", "pt-PT": "Adicionar", "en-US": "Add" },
  "Selecione ao menos um procedimento para o pacote.": {
    "pt-BR": "Selecione ao menos um procedimento para o pacote.",
    "pt-PT": "Selecione pelo menos um procedimento para o pacote.",
    "en-US": "Select at least one treatment for the package.",
  },
  "Pacote atualizado.": {
    "pt-BR": "Pacote atualizado.",
    "pt-PT": "Pacote atualizado.",
    "en-US": "Package updated.",
  },
  "Pacote criado.": {
    "pt-BR": "Pacote criado.",
    "pt-PT": "Pacote criado.",
    "en-US": "Package created.",
  },
  "Nome do pacote": {
    "pt-BR": "Nome do pacote",
    "pt-PT": "Nome do pacote",
    "en-US": "Package name",
  },
  "Pacote Corporal Completo": {
    "pt-BR": "Pacote Corporal Completo",
    "pt-PT": "Pacote Corporal Completo",
    "en-US": "Full body package",
  },
  "O que está incluído no pacote": {
    "pt-BR": "O que está incluído no pacote",
    "pt-PT": "O que está incluído no pacote",
    "en-US": "What is included in the package",
  },
  "Procedimentos incluídos": {
    "pt-BR": "Procedimentos incluídos",
    "pt-PT": "Procedimentos incluídos",
    "en-US": "Included treatments",
  },
  sessões: { "pt-BR": "sessões", "pt-PT": "sessões", "en-US": "sessions" },
  "Cadastre procedimentos antes de criar pacotes.": {
    "pt-BR": "Cadastre procedimentos antes de criar pacotes.",
    "pt-PT": "Registe procedimentos antes de criar pacotes.",
    "en-US": "Add treatments before creating packages.",
  },
  Preço: { "pt-BR": "Preço", "pt-PT": "Preço", "en-US": "Price" },
  "Validade (dias)": {
    "pt-BR": "Validade (dias)",
    "pt-PT": "Validade (dias)",
    "en-US": "Validity (days)",
  },
  "Salvar alterações": {
    "pt-BR": "Salvar alterações",
    "pt-PT": "Guardar alterações",
    "en-US": "Save changes",
  },
  "Criar pacote": { "pt-BR": "Criar pacote", "pt-PT": "Criar pacote", "en-US": "Create package" },
  "Últimos 30 dias": {
    "pt-BR": "Últimos 30 dias",
    "pt-PT": "Últimos 30 dias",
    "en-US": "Last 30 days",
  },
  "Registrar venda": {
    "pt-BR": "Registrar venda",
    "pt-PT": "Registar venda",
    "en-US": "Record sale",
  },
  "Conta a pagar": { "pt-BR": "Conta a pagar", "pt-PT": "Conta a pagar", "en-US": "Payable" },
  Receita: { "pt-BR": "Receita", "pt-PT": "Receita", "en-US": "Revenue" },
  "Custos de venda": {
    "pt-BR": "Custos de venda",
    "pt-PT": "Custos de venda",
    "en-US": "Sales costs",
  },
  "A receber": { "pt-BR": "A receber", "pt-PT": "A receber", "en-US": "Receivable" },
  "A pagar": { "pt-BR": "A pagar", "pt-PT": "A pagar", "en-US": "Payable" },
  "Receita por dia": {
    "pt-BR": "Receita por dia",
    "pt-PT": "Receita por dia",
    "en-US": "Revenue by day",
  },
  Vendas: { "pt-BR": "Vendas", "pt-PT": "Vendas", "en-US": "Sales" },
  "Nenhuma venda": { "pt-BR": "Nenhuma venda", "pt-PT": "Nenhuma venda", "en-US": "No sales" },
  "Registre vendas para acompanhar o caixa.": {
    "pt-BR": "Registre vendas para acompanhar o caixa.",
    "pt-PT": "Registe vendas para acompanhar o fluxo de caixa.",
    "en-US": "Record sales to track cash flow.",
  },
  "Venda avulsa": { "pt-BR": "Venda avulsa", "pt-PT": "Venda ocasional", "en-US": "Walk-in sale" },
  "Relatórios e inteligência financeira": {
    "pt-BR": "Relatórios e inteligência financeira",
    "pt-PT": "Relatórios e inteligência financeira",
    "en-US": "Reports and financial intelligence",
  },
  "Transforme os dados da clínica em decisões práticas.": {
    "pt-BR": "Transforme os dados da clínica em decisões práticas.",
    "pt-PT": "Transforme os dados da clínica em decisões práticas.",
    "en-US": "Turn clinic data into practical decisions.",
  },
  "Atualizar relatório": {
    "pt-BR": "Atualizar relatório",
    "pt-PT": "Atualizar relatório",
    "en-US": "Refresh report",
  },
  Início: { "pt-BR": "Início", "pt-PT": "Início", "en-US": "Start" },
  Fim: { "pt-BR": "Fim", "pt-PT": "Fim", "en-US": "End" },
  Filial: { "pt-BR": "Filial", "pt-PT": "Filial", "en-US": "Branch" },
  "Este ano": { "pt-BR": "Este ano", "pt-PT": "Este ano", "en-US": "This year" },
  "Não foi possível gerar o relatório.": {
    "pt-BR": "Não foi possível gerar o relatório.",
    "pt-PT": "Não foi possível gerar o relatório.",
    "en-US": "Could not generate the report.",
  },
  "Margem bruta": { "pt-BR": "Margem bruta", "pt-PT": "Margem bruta", "en-US": "Gross margin" },
  "Ticket médio": { "pt-BR": "Ticket médio", "pt-PT": "Valor médio", "en-US": "Average ticket" },
  Recebido: { "pt-BR": "Recebido", "pt-PT": "Recebido", "en-US": "Collected" },
  "Operação e agenda": {
    "pt-BR": "Operação e agenda",
    "pt-PT": "Operação e agenda",
    "en-US": "Operations and calendar",
  },
  "Indicadores do período selecionado": {
    "pt-BR": "Indicadores do período selecionado",
    "pt-PT": "Indicadores do período selecionado",
    "en-US": "Metrics for the selected period",
  },
  Atendimentos: { "pt-BR": "Atendimentos", "pt-PT": "Atendimentos", "en-US": "Appointments" },
  Comparecimento: { "pt-BR": "Comparecimento", "pt-PT": "Comparência", "en-US": "Attendance" },
  Faltas: { "pt-BR": "Faltas", "pt-PT": "Faltas", "en-US": "No-shows" },
  Cancelamentos: { "pt-BR": "Cancelamentos", "pt-PT": "Cancelamentos", "en-US": "Cancellations" },
  Margem: { "pt-BR": "Margem", "pt-PT": "Margem", "en-US": "Margin" },
  Agendamentos: { "pt-BR": "Agendamentos", "pt-PT": "Agendamentos", "en-US": "Appointments" },
  "Receita por mês": {
    "pt-BR": "Receita por mês",
    "pt-PT": "Receita por mês",
    "en-US": "Revenue by month",
  },
  "Ainda não há vendas no período.": {
    "pt-BR": "Ainda não há vendas no período.",
    "pt-PT": "Ainda não existem vendas no período.",
    "en-US": "There are no sales in this period yet.",
  },
  "Procedimentos e serviços que mais geram receita": {
    "pt-BR": "Procedimentos e serviços que mais geram receita",
    "pt-PT": "Procedimentos e serviços que geram mais receita",
    "en-US": "Top revenue-generating treatments and services",
  },
  "venda(s)": { "pt-BR": "venda(s)", "pt-PT": "venda(s)", "en-US": "sale(s)" },
  "Ainda não há itens detalhados de venda no período.": {
    "pt-BR": "Ainda não há itens detalhados de venda no período.",
    "pt-PT": "Ainda não existem itens detalhados de venda no período.",
    "en-US": "There are no detailed sale items in this period yet.",
  },
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
