import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Crown,
  FileCheck2,
  Flower2,
  HeartPulse,
  MapPinned,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura — Gestão para clínicas de estética" },
      {
        name: "description",
        content:
          "Organize agenda, clientes, financeiro e evolução clínica em uma plataforma feita para clínicas de estética.",
      },
      { property: "og:title", content: "Aura — Gestão para clínicas de estética" },
      {
        property: "og:description",
        content: "Agenda, CRM, financeiro e evolução clínica em uma plataforma para sua clínica.",
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
    eyebrow: "Agenda",
    title: "Pedidos de horário em um só lugar",
    text: "Receba solicitações pela página pública da clínica e organize procedimentos, profissionais e horários.",
  },
  {
    icon: UsersRound,
    eyebrow: "Relacionamento",
    title: "CRM para acompanhar cada cliente",
    text: "Consulte histórico, acompanhe oportunidades e registre contatos e próximos passos da equipe.",
  },
  {
    icon: CircleDollarSign,
    eyebrow: "Gestão",
    title: "Financeiro com contexto",
    text: "Acompanhe vendas, caixa, comissões e estoque junto à rotina da clínica.",
  },
  {
    icon: HeartPulse,
    eyebrow: "Atendimento",
    title: "Anamnese e evolução organizadas",
    text: "Mantenha registros clínicos e evolução do tratamento associados ao histórico da cliente.",
  },
  {
    icon: Camera,
    eyebrow: "IA informativa",
    title: "Compare fotos de evolução",
    text: "Alinhe imagens e peça uma comparação visual assistida por IA, sem diagnóstico ou prescrição.",
  },
  {
    icon: MapPinned,
    eyebrow: "Crescimento",
    title: "Equipe e unidades conectadas",
    text: "Organize profissionais, agenda e informações da clínica em uma plataforma preparada para crescer.",
  },
];

const WORKFLOW = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Receba pedidos online",
    text: "Compartilhe a página pública da clínica para a cliente consultar procedimentos e solicitar um horário.",
    tag: "Agenda pública",
  },
  {
    number: "02",
    icon: UsersRound,
    title: "Acompanhe o relacionamento",
    text: "Use o CRM para visualizar histórico, registrar contatos e organizar follow-ups da equipe.",
    tag: "CRM e histórico",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Entenda a operação",
    text: "Consulte vendas, comissões, estoque e indicadores para decidir os próximos passos da clínica.",
    tag: "Gestão integrada",
  },
];

const FAQS = [
  {
    question: "O que está incluído no Aura PRO?",
    answer:
      "O plano apresentado nesta página reúne agenda, agendamento online, clientes e CRM, prontuário e anamnese, financeiro, comissões, estoque e recursos de IA. Consulte as condições exibidas no cadastro antes de assinar.",
  },
  {
    question: "O Aura envia mensagens automaticamente pelo WhatsApp?",
    answer:
      "Ainda não. O envio nativo e as automações pelo WhatsApp estão em desenvolvimento e dependem da conexão aprovada com a Meta. Hoje, os modelos podem ser revisados e a conversa aberta no próprio WhatsApp para envio manual.",
  },
  {
    question: "A IA faz diagnóstico ou recomenda tratamentos?",
    answer:
      "Não. A comparação de fotos e os resumos do Aura são informativos e não substituem avaliação profissional, diagnóstico ou prescrição. A decisão clínica continua sendo da profissional responsável.",
  },
  {
    question: "Como devo usar fotos e informações clínicas?",
    answer:
      "Registre e compare imagens somente com a autorização adequada da cliente. Informações de saúde e fotos são sensíveis: limite o acesso à equipe autorizada e siga as regras de privacidade da clínica.",
  },
  {
    question: "Existe período de teste?",
    answer:
      "A oferta atual informa 30 dias grátis e cancelamento livre no plano PRO. Confira os termos e as condições que aparecem no fluxo de cadastro e assinatura.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Aura início">
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary shadow-sm">
            <Flower2 className="size-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Aura</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
          <a href="#demonstracao" className="transition-colors hover:text-foreground">
            Como funciona
          </a>
          <a href="#recursos" className="transition-colors hover:text-foreground">
            Recursos
          </a>
          <a href="#planos" className="transition-colors hover:text-foreground">
            Plano
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            Dúvidas
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-9 sm:px-8 sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute -right-40 -top-32 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-48 bottom-0 size-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/50 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Gestão feita para clínicas de estética
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              Mais organização para a clínica. Mais tempo para cuidar.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Una agenda, clientes, financeiro e evolução clínica em uma plataforma feita para a
              rotina da sua clínica de estética.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-90"
              >
                Começar grátis <ArrowRight className="size-4" />
              </Link>
              <a
                href="#demonstracao"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Ver como funciona <ChevronRight className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              30 dias grátis no plano PRO · cancelamento livre, conforme as condições da assinatura.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              {[
                "Agenda e pedidos online",
                "CRM e histórico da cliente",
                "Financeiro e comissões",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-primary-soft text-primary">
                    <Check className="size-3" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:ml-auto">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
            <div className="surface relative overflow-hidden rounded-[1.5rem] border-primary/15 p-4 shadow-xl sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-semibold text-primary">Prévia ilustrativa</p>
                  <p className="mt-1 font-display text-lg font-semibold">Visão da clínica</p>
                </div>
                <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <BarChart3 className="size-5" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/70 p-4">
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="mt-2 font-display text-xl font-semibold">R$ 28,4k</p>
                  <p className="mt-1 text-xs font-medium text-primary">Visão do período</p>
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
                    "09:00  ·  Cliente de demonstração",
                    "10:30  ·  Cliente de demonstração",
                    "14:00  ·  Cliente de demonstração",
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
                <BrainCircuit className="size-4 shrink-0" /> Informações da operação em uma visão
                organizada.
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Exemplo visual com dados fictícios; não representa resultados de clientes do Aura.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Recursos do Aura"
        className="border-y border-border bg-muted/35 px-5 py-5 sm:px-8"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" /> Agenda online
          </span>
          <span className="inline-flex items-center gap-2">
            <UsersRound className="size-4 text-primary" /> CRM da clínica
          </span>
          <span className="inline-flex items-center gap-2">
            <WalletCards className="size-4 text-primary" /> Financeiro e comissões
          </span>
          <span className="inline-flex items-center gap-2">
            <HeartPulse className="size-4 text-primary" /> Evolução clínica
          </span>
        </div>
      </section>

      <section id="demonstracao" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
            Como funciona
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Da solicitação de horário à gestão da clínica
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            O Aura reúne etapas que costumam ficar espalhadas entre agenda, planilhas e anotações.
            Veja como cada área se conecta à rotina.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WORKFLOW.map((step) => (
            <article key={step.number} className="surface relative overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <step.icon className="size-5" />
                </div>
                <span className="font-display text-3xl font-semibold text-primary/20">
                  {step.number}
                </span>
              </div>
              <span className="mt-5 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {step.tag}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="recursos" className="bg-muted/30 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              Uma plataforma completa
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Ferramentas para cuidar da operação e da experiência da cliente
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Comece pelo essencial e acompanhe agenda, relacionamento, atendimento e gestão em um
              só espaço.
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
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="surface overflow-hidden p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Sparkles className="size-5" />
              </span>
              <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase">
                Evolução clínica
              </p>
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
              Compare imagens com contexto, não com promessas
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Registre a evolução, alinhe fotos de momentos diferentes e use a IA para destacar
              observações visuais — sempre como apoio informativo à avaliação profissional.
            </p>
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold">Fluxo de comparação</span>
                <span className="rounded-full bg-background px-2.5 py-1 text-[10px] text-muted-foreground">
                  Ilustração
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-xl border border-dashed border-primary/30 bg-background p-3 text-center">
                  <Camera className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-xs font-medium">Registro inicial</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Imagem autorizada</p>
                </div>
                <ArrowRight className="size-4 text-primary" />
                <div className="rounded-xl border border-dashed border-primary/30 bg-background p-3 text-center">
                  <Sparkles className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-xs font-medium">Resumo visual</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Sem diagnóstico</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              A comparação não identifica pessoas, não diagnostica e não substitui avaliação
              clínica. Use imagens somente com autorização adequada.
            </p>
          </article>

          <article className="surface overflow-hidden p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <FileCheck2 className="size-5" />
              </span>
              <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase">
                Documentos
              </p>
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
              Termos e contratos com aceite eletrônico
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Apresente o documento por um link seguro, permita a leitura dos termos e registre o
              aceite eletrônico associado à cliente.
            </p>
            <div className="mt-6 space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
              {[
                "Documento apresentado para leitura",
                "Termos e versões identificados",
                "Aceite registrado eletronicamente",
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    {index === 2 ? (
                      <Check className="size-3.5" />
                    ) : (
                      <ClipboardCheck className="size-3.5" />
                    )}
                  </span>
                  <span className="text-xs font-medium">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Não substitui orientação jurídica sobre a validade de cada documento ou processo de
              assinatura.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-border bg-primary-soft/35 px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Dados organizados por clínica</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Acesso e informações separados para a operação de cada organização.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BrainCircuit className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">IA como apoio informativo</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Resumos e comparações apoiam a análise; decisões clínicas permanecem com a
                profissional.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Comunicação com transparência</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                O envio automático nativo pelo WhatsApp ainda não está liberado no Aura.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-primary px-6 py-8 text-primary-foreground shadow-lg sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-white/15">
                  <Crown className="size-5 text-gold" />
                </span>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/75 uppercase">
                  Aura PRO
                </p>
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
                Gestão completa para a rotina da sua clínica
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/80">
                Agenda, CRM, financeiro, prontuário, estoque e recursos de IA em um só plano.
              </p>
              <div className="mt-6 grid gap-2 text-xs text-primary-foreground/90 sm:grid-cols-2">
                {[
                  "Agenda e pedidos online",
                  "Clientes, prontuário e anamnese",
                  "Financeiro, comissões e estoque",
                  "Assistente e evolução com IA",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check className="size-3.5 text-gold" /> {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 sm:min-w-64">
              <div>
                <span className="font-display text-4xl font-semibold">R$ 49,90</span>
                <span className="ml-1 text-sm text-primary-foreground/75">/mês</span>
              </div>
              <p className="text-xs text-primary-foreground/75">
                30 dias grátis · cancelamento livre
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
              >
                Começar grátis <ArrowRight className="size-4" />
              </Link>
              <p className="text-center text-[11px] text-primary-foreground/70">
                Confira as condições no fluxo de assinatura.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
            Dúvidas frequentes
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Antes de começar
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Respostas claras sobre recursos, período de teste, WhatsApp e uso da IA.
          </p>
        </div>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQS.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold marker:content-none">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="text-xl font-normal text-primary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-3xl pt-3 text-sm leading-6 text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-5 mb-16 overflow-hidden rounded-[1.5rem] bg-muted/50 px-6 py-12 sm:mx-auto sm:max-w-6xl sm:px-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              Sua próxima fase começa aqui
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Organize a operação. Expanda com confiança.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Conheça o Aura e veja como agenda, clientes e gestão podem trabalhar em conjunto.
            </p>
          </div>
          <Link
            to="/auth"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Criar acesso <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-7 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Link to="/" className="inline-flex items-center gap-2 font-medium text-foreground">
            <Flower2 className="size-4 text-primary" /> Aura · gestão para clínicas de estética
          </Link>
          <nav
            aria-label="Links do rodapé"
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <a href="#recursos" className="transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              Dúvidas
            </a>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
