import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Flower2,
  Globe2,
  HeartPulse,
  Layers3,
  MapPinned,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura — Gestão inteligente para clínicas de estética" },
      {
        name: "description",
        content:
          "CRM, agenda, financeiro, marketing com IA e gestão de filiais em uma plataforma feita para clínicas de estética.",
      },
      { property: "og:title", content: "Aura — Gestão inteligente para clínicas de estética" },
      {
        property: "og:description",
        content: "A operação da sua clínica conectada em uma única plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarDays,
    eyebrow: "Operação",
    title: "Agenda inteligente",
    text: "Agendamentos online, seleção de múltiplos procedimentos, pacotes, bloqueios e alertas em tempo real.",
  },
  {
    icon: UsersRound,
    eyebrow: "Relacionamento",
    title: "CRM 360°",
    text: "Acompanhe leads, funil de vendas, histórico do cliente, follow-ups e oportunidades de retenção.",
  },
  {
    icon: CircleDollarSign,
    eyebrow: "Gestão",
    title: "Inteligência financeira",
    text: "Vendas, fluxo de caixa, relatórios avançados, margem por serviço e visão por filial.",
  },
  {
    icon: Megaphone,
    eyebrow: "Crescimento",
    title: "Marketing com IA",
    text: "Crie campanhas, conteúdos e estratégias para manter sua clínica ativa e próxima dos clientes.",
  },
  {
    icon: WalletCards,
    eyebrow: "Recebimentos",
    title: "Pagamentos conectados",
    text: "Arquitetura preparada para múltiplos gateways, transações e acompanhamento dos recebimentos.",
  },
  {
    icon: MapPinned,
    eyebrow: "Escala",
    title: "Múltiplas filiais",
    text: "Organize equipe, serviços, estoque, agenda e resultados de todos os seus locais em um só lugar.",
  },
];

const HIGHLIGHTS = [
  { icon: HeartPulse, text: "Prontuário e anamnese digital" },
  { icon: Layers3, text: "Pacotes e procedimentos" },
  { icon: Globe2, text: "Português e inglês" },
  { icon: ShieldCheck, text: "Dados isolados por clínica" },
];

function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Aura início">
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary shadow-sm">
            <Flower2 className="size-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Aura</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#recursos" className="transition-colors hover:text-foreground">
            Recursos
          </a>
          <a href="#para-quem" className="transition-colors hover:text-foreground">
            Para sua clínica
          </a>
        </nav>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Entrar
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-20">
        <div className="pointer-events-none absolute -right-40 -top-32 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-48 bottom-0 size-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/50 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Feito para clínicas que querem crescer
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              Mais clareza para gerir. Mais tempo para cuidar.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              O Aura conecta agenda, clientes, financeiro, equipe e marketing em uma experiência
              simples para a rotina da sua clínica de estética.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-90"
              >
                Começar agora <ArrowRight className="size-4" />
              </Link>
              <a
                href="#recursos"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Conhecer recursos <ChevronRight className="size-4" />
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-primary-soft text-primary">
                    <Check className="size-3" />
                  </span>
                  <item.icon className="size-4 text-primary" /> {item.text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:ml-auto">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
            <div className="surface relative overflow-hidden rounded-[1.5rem] border-primary/15 p-4 shadow-xl sm:p-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs font-semibold text-primary">Visão da clínica</p>
                  <p className="mt-1 font-display text-lg font-semibold">Tudo sob controle</p>
                </div>
                <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <BarChart3 className="size-5" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/70 p-4">
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="mt-2 font-display text-xl font-semibold">R$ 28,4k</p>
                  <p className="mt-1 text-xs font-medium text-primary">+18,6% no mês</p>
                </div>
                <div className="rounded-xl bg-primary p-4 text-primary-foreground">
                  <p className="text-xs text-primary-foreground/75">Agenda hoje</p>
                  <p className="mt-2 font-display text-xl font-semibold">24</p>
                  <p className="mt-1 text-xs text-primary-foreground/75">atendimentos</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Próximos atendimentos</p>
                  <CalendarDays className="size-4 text-primary" />
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    "09:00  ·  Camila Oliveira",
                    "10:30  ·  Fernanda Alves",
                    "14:00  ·  Juliana Costa",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-xs text-muted-foreground"
                    >
                      <span className="size-2 rounded-full bg-gold" /> {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary-soft/60 p-3 text-xs text-primary">
                <BrainCircuit className="size-4 shrink-0" /> Sua operação em uma visão clara e
                acionável.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="para-quem" className="border-y border-border bg-muted/35 px-5 py-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-3 sm:items-center">
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold">Da primeira cliente à próxima filial</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Uma base organizada para acompanhar cada etapa do crescimento da sua clínica.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <div className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
              <BrainCircuit className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Decisões melhores
              <br />
              com dados do seu negócio
            </p>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-primary px-6 py-7 text-primary-foreground shadow-lg sm:px-10 sm:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15">
                <Crown className="size-6 text-gold" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/75 uppercase">
                  Assinatura PRO
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                  Gestão completa para sua clínica
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/75">
                  Mais praticidade, controle e crescimento para a sua rotina — com 30 dias grátis e
                  cancelamento livre.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:pl-8">
              <div className="whitespace-nowrap border-t border-white/25 pt-4 sm:border-t-0 sm:border-l sm:pl-8 sm:pt-0">
                <span className="font-display text-4xl font-semibold">R$ 49,90</span>
                <span className="ml-1 text-sm text-primary-foreground/75">/mês</span>
              </div>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
              >
                Começar grátis <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-primary-foreground/80">
            <span>Agenda e autoagendamento online</span>
            <span>Procedimentos ilimitados</span>
            <span>Clientes, financeiro e estoque</span>
            <span>Assistente de IA</span>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
            Uma plataforma completa
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo o que sua clínica precisa para operar melhor
          </h2>
          <p className="mt-4 text-muted-foreground">
            Menos ferramentas desconectadas. Mais contexto para sua equipe e uma jornada melhor para
            cada cliente.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="surface group p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <feature.icon className="size-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-gold uppercase">
                  {feature.eyebrow}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-5 mb-20 overflow-hidden rounded-[1.5rem] bg-primary px-6 py-12 text-primary-foreground sm:mx-auto sm:max-w-6xl sm:px-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">
              Sua próxima fase começa aqui
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Organize a operação. Expanda com confiança.
            </h2>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
              Comece com o essencial e habilite novos recursos conforme sua clínica evolui.
            </p>
          </div>
          <Link
            to="/auth"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]"
          >
            Criar acesso <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        Aura · gestão inteligente para clínicas de estética
      </footer>
    </main>
  );
}
