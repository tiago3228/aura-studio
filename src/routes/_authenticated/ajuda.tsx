import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ChevronDown, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => ({ meta: [{ title: "Central de Ajuda — Aura Clínicas" }] }),
  component: AjudaPage,
});

type Guide = { title: string; area: string; summary: string; steps: string[]; tips: string[] };
const GUIDES: Guide[] = [
  {
    title: "Visão geral",
    area: "Início",
    summary: "Acompanhe os principais números da clínica em um único lugar.",
    steps: [
      "Acesse Visão geral pelo menu lateral.",
      "Confira agenda do dia, clientes, faturamento e pendências.",
      "Use os atalhos dos cartões para abrir cada módulo.",
    ],
    tips: ["Revise o painel no início do dia para identificar pendências."],
  },
  {
    title: "Agenda e agendamento online",
    area: "Operação",
    summary: "Organize horários, profissionais, salas e pedidos feitos pelos clientes.",
    steps: [
      "Cadastre profissionais e seus horários em Equipe.",
      "Cadastre os procedimentos e marque quais podem ser agendados online.",
      "Copie o link destacado no topo da Agenda e envie aos clientes.",
      "Use o alerta amarelo pulsante para localizar pedidos online aguardando confirmação.",
    ],
    tips: ["O botão de alerta verifica novos pedidos automaticamente a cada 30 segundos."],
  },
  {
    title: "Clientes",
    area: "Relacionamento",
    summary: "Mantenha o cadastro e o histórico completo de cada cliente.",
    steps: [
      "Abra Clientes e selecione Novo cliente.",
      "Preencha nome e telefone; os demais dados podem ser completados depois.",
      "Na ficha do cliente, consulte agenda, histórico, CRM e pagamentos.",
      "Use a busca para localizar rapidamente um cadastro.",
    ],
    tips: ["No agendamento online, o cliente é criado automaticamente quando ainda não existe."],
  },
  {
    title: "Procedimentos e pacotes",
    area: "Catálogo",
    summary: "Configure serviços, valores, duração, disponibilidade online e pacotes.",
    steps: [
      "Entre em Procedimentos e crie um procedimento com nome, valor e duração.",
      "Ative Disponível online para mostrá-lo no link público.",
      "Na aba Pacotes, crie um pacote e vincule os procedimentos e sessões.",
      "Use Editar para corrigir nome, preço ou duração; use Excluir apenas quando necessário.",
    ],
    tips: ["Pacotes ativos e liberados online aparecem no link público da clínica."],
  },
  {
    title: "Equipe",
    area: "Pessoas",
    summary: "Cadastre profissionais, especialidades, cursos, foto e horários.",
    steps: [
      "Abra Equipe e clique em Novo profissional.",
      "Preencha especialidade, descrição, cursos e foto.",
      "Configure dias e horários de trabalho.",
      "Ative o agendamento online para permitir que clientes escolham esse profissional.",
    ],
    tips: ["Uma foto e uma descrição clara ajudam o cliente a escolher o profissional."],
  },
  {
    title: "Financeiro",
    area: "Gestão",
    summary: "Registre vendas, despesas, comissões e acompanhe o resultado da clínica.",
    steps: [
      "Cadastre produtos e serviços antes de registrar uma venda.",
      "Use Financeiro para registrar receitas e despesas manuais.",
      "Acesse Relatórios avançados para analisar períodos e filiais.",
      "Use Pagamentos para acompanhar cobranças online e seus status.",
    ],
    tips: ["O gateway de pagamento não é obrigatório para registrar pagamentos manuais."],
  },
  {
    title: "Pagamentos e integrações",
    area: "Financeiro",
    summary: "Prepare provedores, cobranças e acompanhamento de pagamentos.",
    steps: [
      "Execute a migração SQL da Central de Pagamentos no editor do Lovable.",
      "Abra Integrações de pagamento e configure o provedor no backend.",
      "Use Pagamentos para acompanhar cobranças pendentes, pagas ou estornadas.",
      "Nunca cole tokens ou chaves secretas em telas do frontend.",
    ],
    tips: ["Cada clínica possui seus próprios provedores e dados isolados por segurança."],
  },
  {
    title: "CRM e retenção",
    area: "Relacionamento",
    summary: "Organize leads, contatos, follow-ups e clientes que precisam ser reativados.",
    steps: [
      "Crie leads com origem, etapa e responsável.",
      "Mova o lead pelo funil conforme o relacionamento evolui.",
      "Registre contatos e crie follow-ups com data de vencimento.",
      "Revise a área de retenção para entrar em contato com clientes inativos.",
    ],
    tips: ["Registre cada contato para manter uma visão 360º do relacionamento."],
  },
  {
    title: "Configurações, idioma e filiais",
    area: "Administração",
    summary: "Personalize a clínica, o link público, idioma, moeda e locais.",
    steps: [
      "Em Configurações, atualize dados, cores e o link público.",
      "Use Usar slug curto para gerar um caminho mais simples no link de agendamento.",
      "Em Idioma e moeda, escolha Português do Brasil, Português de Portugal ou Inglês.",
      "Em Filiais, cadastre locais e depois use os filtros nos relatórios e na Agenda.",
    ],
    tips: ["O domínio do link depende da publicação do Lovable ou de um domínio próprio."],
  },
];

function AjudaPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(GUIDES[0].title);
  const filtered = useMemo(
    () =>
      GUIDES.filter((guide) =>
        `${guide.title} ${guide.area} ${guide.summary}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  );
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Central de Ajuda"
        subtitle="Entenda o que cada área faz e siga o passo a passo para configurar sua clínica."
      />
      <div className="surface mb-5 flex items-center gap-3 p-4">
        <Search className="size-4 text-muted-foreground" />
        <Input
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          placeholder="Buscar uma funcionalidade..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="mb-5 rounded-xl border border-primary/20 bg-primary-soft/40 p-5">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-display font-semibold">Como usar o Aura</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece cadastrando sua clínica, equipe, procedimentos e horários. Depois compartilhe o
              link de agendamento online com os clientes. Use esta central sempre que precisar
              entender uma função.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map((guide) => {
          const expanded = open === guide.title;
          return (
            <article className="surface overflow-hidden" key={guide.title}>
              <button
                type="button"
                className="flex w-full items-center gap-4 p-5 text-left"
                onClick={() => setOpen(expanded ? null : guide.title)}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <BookOpen className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {guide.area}
                  </span>
                  <span className="block font-display text-lg font-semibold">{guide.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{guide.summary}</span>
                </span>
                <ChevronDown
                  className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded ? (
                <div className="border-t border-border px-5 pt-4 pb-5">
                  <h3 className="text-sm font-semibold">Como fazer</h3>
                  <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {guide.steps.map((step, index) => (
                      <li className="flex gap-3" key={step}>
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                    <strong className="text-foreground">Dica:</strong> {guide.tips[0]}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {!filtered.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma orientação encontrada para sua busca.
        </p>
      ) : null}
    </div>
  );
}
