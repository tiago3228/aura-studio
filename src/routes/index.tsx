import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Wallet, FileHeart, Boxes, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura — Gestão completa para clínicas de estética" },
      {
        name: "description",
        content:
          "Agenda inteligente, financeiro, prontuário digital, estoque e comissões em um só lugar. Feito para clínicas de estética.",
      },
      { property: "og:title", content: "Aura — Gestão completa para clínicas de estética" },
      {
        property: "og:description",
        content: "Agenda, financeiro, prontuário, estoque e comissões para clínicas de estética.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: CalendarDays, title: "Agenda sem conflitos", text: "Visão de dia e semana, bloqueios de sala e status de atendimento em tempo real." },
  { icon: Wallet, title: "Financeiro completo", text: "Vendas, contas a pagar e receber, fluxo de caixa e margem por procedimento." },
  { icon: FileHeart, title: "Prontuário e anamnese", text: "Fichas digitais assinadas, histórico clínico e evolução de cada cliente." },
  { icon: Boxes, title: "Estoque conectado", text: "Consumo por procedimento, custo real e alerta de estoque mínimo." },
  { icon: Users, title: "Equipe e comissões", text: "Comissão por profissional calculada automaticamente a cada venda." },
  { icon: Sparkles, title: "Assistente de IA", text: "Pergunte em português e receba análises do seu faturamento e da sua agenda." },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="font-display text-lg font-semibold tracking-tight">Aura</span>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-10 pb-16 text-center sm:pt-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Para clínicas de estética</p>
        <h1 className="mt-4 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Toda a operação da sua clínica em uma única tela
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Agenda, prontuário, financeiro, estoque e comissões conectados — com um assistente de IA que entende
          os números do seu negócio.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/auth"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Começar agora
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface p-5">
              <div className="grid size-9 place-items-center rounded-xl bg-primary-soft">
                <f.icon className="size-4.5 text-primary" />
              </div>
              <h2 className="mt-4 font-display text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Aura · gestão para clínicas de estética
      </footer>
    </main>
  );
}
