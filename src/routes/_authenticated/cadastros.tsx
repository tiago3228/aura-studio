import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  FileText,
  MessageSquareText,
  Package,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({
    meta: [
      { title: "Cadastros — Aura Clínicas" },
      {
        name: "description",
        content: "Central de cadastros da clínica: clientes, procedimentos, produtos e documentos.",
      },
    ],
  }),
  component: Cadastros,
});

const cards = [
  {
    title: "Clientes",
    description: "Cadastre clientes, contatos, aniversários e histórico clínico.",
    to: "/clientes",
    icon: UserRound,
    tone: "text-primary bg-primary-soft",
    available: true,
  },
  {
    title: "Procedimentos",
    description: "Gerencie serviços, preços, duração e disponibilidade online.",
    to: "/servicos",
    icon: Sparkles,
    tone: "text-gold bg-gold-soft",
    available: true,
  },
  {
    title: "Produtos",
    description: "Controle produtos, estoque, lotes e movimentações.",
    to: "/estoque",
    icon: Package,
    tone: "text-success bg-success-soft",
    available: true,
  },
  {
    title: "Modelos de contratos",
    description: "Configure documentos e termos de consentimento para assinatura.",
    to: "/contratos",
    icon: FileText,
    tone: "text-primary bg-primary-soft",
    available: true,
  },
  {
    title: "Modelos de anamnese",
    description: "Estrutura para organizar perguntas e respostas clínicas.",
    to: "/clientes",
    icon: ClipboardList,
    tone: "text-gold bg-gold-soft",
    available: false,
  },
  {
    title: "Modelos de mensagens",
    description: "Textos para confirmação, lembrete e comunicação com clientes.",
    to: "/configuracoes",
    icon: MessageSquareText,
    tone: "text-success bg-success-soft",
    available: false,
  },
  {
    title: "Fornecedores",
    description: "Organize fornecedores de produtos e insumos da clínica.",
    to: "/estoque",
    icon: Truck,
    tone: "text-primary bg-primary-soft",
    available: false,
  },
] as const;

function Cadastros() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Cadastros" subtitle="Acesse e organize os principais dados da clínica." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.to}
              className="surface surface-hover group flex min-h-44 flex-col p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`grid size-11 place-items-center rounded-xl ${card.tone}`}>
                  <Icon className="size-5" />
                </span>
                <span
                  className={
                    card.available
                      ? "rounded-full bg-success-soft px-2 py-1 text-[10px] font-semibold text-success"
                      : "rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"
                  }
                >
                  {card.available ? "Disponível" : "Em breve"}
                </span>
              </div>
              <h2 className="mt-5 font-display text-base font-semibold group-hover:text-primary">
                {card.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Os módulos marcados como “Em breve” já estão previstos na estrutura do Aura e serão ativados
        com suas telas próprias nas próximas etapas.
      </p>
    </div>
  );
}
