import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ChevronDown, ClipboardCheck, Lightbulb, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => ({ meta: [{ title: "Como fazer? — Aura Clínicas" }] }),
  component: AjudaPage,
});

type Guide = {
  title: string;
  area: string;
  summary: string;
  steps: string[];
  tips: string[];
};

const GUIDES: Guide[] = [
  {
    title: "Primeiros passos: configure sua clínica",
    area: "Comece aqui",
    summary: "A sequência recomendada para deixar o Aura pronto para a operação.",
    steps: [
      "Em Ajustes, confira o nome da clínica, os dados de contato, a identidade visual e o link público.",
      "Em Filiais, cadastre cada unidade que terá agenda, equipe ou resultados próprios.",
      "Em Equipe, cadastre os profissionais e defina especialidades, horários e disponibilidade online.",
      "Em Procedimentos, cadastre serviços, preços, duração, comissão e disponibilidade para agendamento.",
      "Em Agenda, confira os horários e faça um agendamento de teste.",
      "Copie o link público de agendamento e compartilhe com os clientes.",
    ],
    tips: [
      "Configure primeiro os cadastros básicos. Isso evita que agenda, financeiro e relatórios fiquem incompletos.",
    ],
  },
  {
    title: "Visão geral",
    area: "Início",
    summary: "Acompanhe rapidamente a operação, o faturamento e os alertas do dia.",
    steps: [
      "Acesse Visão geral pelo menu lateral.",
      "Confira os atendimentos de hoje e os status de cada agendamento.",
      "Consulte faturamento do dia, receita dos últimos 30 dias e margem estimada.",
      "Revise os alertas de estoque baixo e os aniversariantes próximos.",
      "Use os atalhos para abrir a Agenda ou o Assistente IA e investigar um indicador.",
    ],
    tips: ["Revise o painel no início e no fim do dia para identificar pendências."],
  },
  {
    title: "Agenda e agendamento online",
    area: "Operação",
    summary: "Organize horários, profissionais, salas e pedidos feitos pelos clientes.",
    steps: [
      "Use os filtros para alternar entre dia, semana, profissional, filial e status.",
      "Clique em Novo agendamento, selecione cliente, procedimento, profissional, data e horário.",
      "Confira o preço e confirme o agendamento. O sistema bloqueia conflitos de profissional e sala.",
      "Altere o status conforme o atendimento evoluir: agendado, confirmado, aguardando, atendido, cancelado, faltou ou reagendado.",
      "Abra o menu de ações do atendimento para editar, cancelar, reagendar ou enviar uma mensagem ao cliente.",
      "Use o link público no topo da Agenda para receber solicitações de agendamento online.",
      "Pedidos online aguardando confirmação aparecem no alerta da Agenda. Analise e confirme ou recuse cada solicitação.",
    ],
    tips: [
      "Mantenha os horários da equipe atualizados. O link público só oferece horários compatíveis com profissional, procedimento e disponibilidade.",
    ],
  },
  {
    title: "Clientes e ficha 360°",
    area: "Relacionamento",
    summary: "Centralize cadastro, histórico, pacotes, anamnese, evolução e comunicação.",
    steps: [
      "Abra Clientes e clique em Novo cliente para cadastrar nome, telefone, e-mail e data de nascimento.",
      "Use a busca para localizar rapidamente um cadastro e abra a ficha completa.",
      "Na ficha, consulte próximos agendamentos, histórico de atendimentos, vendas, pacotes e pagamentos.",
      "Registre observações e informações importantes para a equipe.",
      "Use a área de Anamnese para registrar queixas, alergias, contraindicações e histórico de saúde antes do atendimento.",
      "Use Evolução para registrar o que foi realizado, produtos utilizados, observações e fotos de antes e depois.",
      "Envie mensagens pelo histórico do cliente quando precisar confirmar horário, fazer um lembrete ou solicitar avaliação.",
    ],
    tips: ["Evite duplicar cadastros. Pesquise pelo telefone antes de criar um novo cliente."],
  },
  {
    title: "Horários da clínica",
    area: "Configurações",
    summary: "Defina a janela geral em que sua clínica aceita agendamentos online.",
    steps: [
      "Abra Ajustes no menu lateral e selecione Horários da clínica.",
      "Na Grade semanal, use o controle de cada dia para marcar a clínica como Aberto ou Fechado.",
      "Quando o dia estiver aberto, informe o horário de abertura e fechamento.",
      "Ative Intervalo para configurar o início e o fim do almoço ou de uma pausa da clínica.",
      "Use Copiar segunda para dias úteis quando segunda-feira tiver o mesmo horário de terça a sexta. Depois, ajuste individualmente o que for diferente.",
      "Clique em Salvar horários. A configuração passa a limitar os horários exibidos no agendamento público.",
      "Lembre-se de que a disponibilidade final também depende dos dias, horários, intervalo e serviços oferecidos pelo profissional.",
    ],
    tips: [
      "Configure primeiro o horário geral da clínica e depois ajuste a jornada individual em Equipe. O Aura só oferece um horário quando as duas agendas estão livres.",
      "Se um dia ou horário não aparece no link público, confira se a clínica e o profissional estão marcados como abertos e disponíveis online.",
    ],
  },
  {
    title: "Procedimentos e Biblioteca",
    area: "Catálogo",
    summary: "Configure serviços, valores, duração, comissão e disponibilidade online.",
    steps: [
      "Em Procedimentos, clique em Novo procedimento para cadastrar um serviço manualmente.",
      "Informe nome, descrição, duração, preço, tipo de comissão e valor da comissão.",
      "Ative Disponível para agendamento online quando o cliente puder escolher esse serviço no link público.",
      "Use Biblioteca pronta para selecionar procedimentos pré-cadastrados, como Avaliação, limpeza de pele, massagens e depilação.",
      "Os itens importados pela Biblioteca entram com preço zerado. Edite cada procedimento antes de divulgá-lo.",
      "Use os controles Ativo e Agendamento online para controlar o catálogo sem apagar o histórico.",
      "Exclua um procedimento apenas quando ele não for mais utilizado. O histórico de agendamentos e vendas é preservado.",
    ],
    tips: [
      "Cadastre Avaliação como primeiro contato quando a clínica precisa avaliar o cliente antes de indicar um tratamento.",
    ],
  },
  {
    title: "Pacotes de sessões",
    area: "Catálogo",
    summary: "Venda conjuntos de sessões com procedimentos vinculados e controle de uso.",
    steps: [
      "Na tela de Procedimentos, abra a aba Pacotes e clique em Novo pacote.",
      "Informe nome, descrição, preço e validade do pacote.",
      "Selecione os procedimentos incluídos e indique quantas sessões de cada um fazem parte do pacote.",
      "Ative o pacote quando ele estiver pronto para venda.",
      "Ao utilizar uma sessão, registre o atendimento normalmente para manter o saldo atualizado na ficha do cliente.",
      "Confira na ficha do cliente quantas sessões foram contratadas, utilizadas e ainda estão disponíveis.",
    ],
    tips: ["Defina uma validade clara para evitar dúvidas sobre sessões vencidas."],
  },
  {
    title: "Equipe, profissionais e horários",
    area: "Pessoas",
    summary: "Cadastre a equipe, suas especialidades, ofertas e horários de atendimento.",
    steps: [
      "Abra Equipe e clique em Novo profissional.",
      "Preencha nome, especialidade, descrição, cursos, foto e dados de contato necessários.",
      "Configure os dias e horários de trabalho e os intervalos de cada profissional.",
      "Na área de ofertas, marque quais procedimentos e pacotes o profissional realiza.",
      "Ative a disponibilidade online para que o profissional apareça no agendamento público.",
      "Atualize o cadastro quando houver mudança de horário, função ou especialidade.",
    ],
    tips: ["Uma foto e uma descrição clara ajudam o cliente a escolher o profissional."],
  },
  {
    title: "CRM, leads e retenção",
    area: "Relacionamento",
    summary: "Organize oportunidades, acompanhe contatos e recupere clientes inativos.",
    steps: [
      "Abra CRM e cadastre um lead com nome, origem, responsável e etapa do funil.",
      "Mova o lead conforme ele avança de novo contato para negociação, agendamento e conversão.",
      "Registre cada ligação, mensagem ou atendimento para manter o histórico do relacionamento.",
      "Crie follow-ups com data de vencimento para não perder oportunidades.",
      "Use Retenção para identificar clientes que não retornam há mais tempo.",
      "Entre em contato com uma mensagem adequada e registre o resultado da ação no CRM.",
    ],
    tips: [
      "Registre também contatos sem conversão. Eles ajudam a entender onde o funil está parando.",
    ],
  },
  {
    title: "Financeiro: vendas, caixa e despesas",
    area: "Gestão",
    summary: "Registre entradas e saídas e acompanhe o resultado financeiro da clínica.",
    steps: [
      "Cadastre procedimentos, pacotes e produtos antes de registrar uma venda.",
      "Em Financeiro, registre uma venda e associe cliente, itens, profissional e forma de pagamento.",
      "Registre despesas manuais com categoria, valor, data e observação.",
      "Consulte o fluxo de caixa por período para comparar receitas, despesas e saldo.",
      "Use os filtros de filial e período para analisar uma unidade específica.",
      "Confira lançamentos e corrija informações enquanto o período ainda estiver em conferência.",
    ],
    tips: [
      "Registre vendas e despesas no mesmo dia para que o dashboard e os relatórios reflitam a operação.",
    ],
  },
  {
    title: "Pagamentos e integrações",
    area: "Financeiro",
    summary: "Acompanhe cobranças e configure provedores de pagamento quando disponíveis.",
    steps: [
      "Em Integrações de pagamento, confira os provedores disponíveis para a clínica.",
      "Configure o provedor no ambiente seguro indicado pelo sistema, sem expor tokens no frontend.",
      "Em Pagamentos, acompanhe cobranças pendentes, pagas, recusadas, canceladas ou estornadas.",
      "Use o identificador da cobrança para localizar um pagamento específico.",
      "Confira o histórico antes de marcar qualquer recebimento manualmente.",
    ],
    tips: ["O gateway não é obrigatório para registrar pagamentos manuais no Financeiro."],
  },
  {
    title: "Relatórios avançados",
    area: "Gestão",
    summary: "Analise faturamento, margem, procedimentos, profissionais, clientes e filiais.",
    steps: [
      "Abra Relatórios avançados e selecione o período de análise.",
      "Use o filtro de filial para comparar unidades ou consultar apenas uma operação.",
      "Leia os cartões de receita, custos, margem e quantidade de atendimentos.",
      "Compare procedimentos e profissionais para entender quais geram mais resultado.",
      "Use os dados de clientes e retenção para definir ações comerciais.",
      "Combine o relatório com o CRM e o Aura IA Marketing para transformar os números em ações.",
    ],
    tips: [
      "Confira se vendas, despesas e status dos atendimentos estão atualizados antes de tomar decisões.",
    ],
  },
  {
    title: "Estoque e movimentações",
    area: "Operação",
    summary: "Controle produtos, consumo, entradas, saídas e alertas de estoque mínimo.",
    steps: [
      "Em Estoque, cadastre produto, unidade de medida, quantidade atual e estoque mínimo.",
      "Registre entradas quando receber mercadorias e saídas quando houver consumo ou ajuste.",
      "Associe o consumo aos procedimentos quando essa informação estiver disponível.",
      "Acompanhe o alerta de estoque crítico no dashboard.",
      "Faça a reposição antes de o saldo chegar a zero para evitar interrupções nos atendimentos.",
    ],
    tips: ["Use nomes padronizados para facilitar buscas e relatórios de consumo."],
  },
  {
    title: "Comissões",
    area: "Gestão",
    summary: "Consulte comissões por profissional e confira os valores gerados pelos atendimentos.",
    steps: [
      "Defina o tipo e o valor da comissão em cada procedimento.",
      "Associe o profissional ao atendimento ou à venda para atribuir o resultado corretamente.",
      "Abra Comissões e selecione o período e a filial desejados.",
      "Revise o total por profissional, procedimento e status do atendimento.",
      "Concilie os valores antes de realizar o pagamento à equipe.",
    ],
    tips: [
      "Altere regras de comissão antes dos novos atendimentos; isso evita ajustes manuais posteriores.",
    ],
  },
  {
    title: "Anamnese e evolução do atendimento",
    area: "Prontuário",
    summary: "Registre informações clínicas, consentimentos e a evolução de cada tratamento.",
    steps: [
      "Abra a ficha do cliente e acesse Anamnese antes do primeiro procedimento.",
      "Registre queixas, alergias, medicamentos, histórico e contraindicações informadas pelo cliente.",
      "Confirme os dados com o cliente e atualize a ficha quando houver mudança.",
      "Após o atendimento, registre procedimento realizado, produtos, observações e orientações.",
      "Adicione fotos de antes e depois somente com autorização e seguindo as regras da clínica.",
      "Consulte a evolução nas próximas sessões para acompanhar o tratamento.",
    ],
    tips: [
      "Trate dados de saúde e imagens como informações sensíveis e limite o acesso à equipe autorizada.",
    ],
  },
  {
    title: "Assistente IA",
    area: "Inteligência",
    summary: "Faça perguntas sobre os dados da clínica e receba respostas para apoiar decisões.",
    steps: [
      "Abra Assistente IA pelo menu lateral.",
      "Faça uma pergunta objetiva, como quais procedimentos geraram mais receita ou quais clientes estão inativos.",
      "Informe o período quando a pergunta depender de datas.",
      "Use a resposta como apoio e confira os números em Financeiro ou Relatórios antes de agir.",
      "Evite inserir informações pessoais que não sejam necessárias para a pergunta.",
    ],
    tips: ["Perguntas com período, filial e indicador definidos produzem respostas mais úteis."],
  },
  {
    title: "Aura IA Marketing",
    area: "Inteligência",
    summary: "Crie campanhas e conteúdos para divulgar procedimentos e reativar clientes.",
    steps: [
      "Abra Aura IA Marketing e escolha o objetivo da campanha.",
      "Informe público, procedimento, período, tom de comunicação e chamada para ação.",
      "Gere a campanha e revise o texto antes de usar.",
      "Confira se preço, horários, link e condições estão corretos.",
      "Salve os conteúdos aprovados e acompanhe o resultado pelo CRM.",
    ],
    tips: [
      "A IA cria uma sugestão; a clínica deve revisar a mensagem antes de enviá-la aos clientes.",
    ],
  },
  {
    title: "Assinatura e plano",
    area: "Administração",
    summary: "Consulte o plano da clínica, limites e informações de assinatura.",
    steps: [
      "Abra Assinatura para consultar o plano atual e os recursos disponíveis.",
      "Confira limites de profissionais, agendamentos e funcionalidades do plano.",
      "Use os dados da tela para acompanhar a situação da assinatura.",
      "Em caso de cobrança ou alteração contratual, siga o fluxo indicado na própria tela.",
    ],
    tips: ["Mantenha os dados administrativos atualizados para evitar problemas de comunicação."],
  },
  {
    title: "Ajustes da clínica e link público",
    area: "Administração",
    summary: "Personalize dados, identidade visual, contato e página pública de agendamento.",
    steps: [
      "Em Ajustes, atualize nome, endereço, telefone, descrição e demais dados da clínica.",
      "Configure cores e informações que serão exibidas na experiência pública.",
      "Revise o slug do link de agendamento e use Usar slug curto quando quiser um endereço mais simples.",
      "Ative ou desative o agendamento online conforme a operação da clínica.",
      "Abra o link público em uma janela anônima para testar como o cliente verá a página.",
    ],
    tips: [
      "Sempre teste o link público depois de alterar procedimentos, profissionais ou horários.",
    ],
  },
  {
    title: "Idioma e moeda",
    area: "Administração",
    summary: "Escolha o idioma da interface e a moeda usada nos valores da clínica.",
    steps: [
      "Abra Idioma e moeda pelo menu lateral.",
      "Escolha Português do Brasil, Português de Portugal ou Inglês.",
      "Selecione a moeda usada para exibir preços e valores financeiros.",
      "Salve a alteração e confira as telas principais para validar a apresentação.",
    ],
    tips: [
      "A configuração é individual da clínica e ajuda equipes multilíngues a trabalhar na mesma conta.",
    ],
  },
  {
    title: "Filiais",
    area: "Administração",
    summary: "Cadastre unidades e organize equipe, agenda, estoque e resultados por local.",
    steps: [
      "Abra Filiais e clique em Nova filial.",
      "Informe nome, endereço, telefone e dados de operação da unidade.",
      "Use a filial correta ao cadastrar profissionais, agenda, vendas e despesas.",
      "Aplique o filtro de filial em Agenda, Financeiro e Relatórios para analisar cada unidade.",
      "Mantenha uma filial principal ativa para os links e cadastros que não dependem de local.",
    ],
    tips: [
      "Cadastre filiais antes de distribuir a operação para manter os relatórios organizados.",
    ],
  },
  {
    title: "Segurança e auditoria",
    area: "Administração",
    summary: "Acompanhe acessos, alterações sensíveis e permissões da clínica.",
    steps: [
      "Abra Segurança e auditoria para consultar eventos registrados pelo sistema.",
      "Use filtros de data, usuário, ação ou entidade para localizar um evento.",
      "Revise alterações em assinaturas, pagamentos, permissões e cadastros sensíveis.",
      "Use os registros para investigar divergências e orientar a equipe.",
      "Conceda acesso somente a pessoas que precisam daquela função para trabalhar.",
    ],
    tips: [
      "Nunca compartilhe senha. Cada pessoa deve usar sua própria conta para que a auditoria seja confiável.",
    ],
  },
  {
    title: "Mensagens e comunicação com clientes",
    area: "Relacionamento",
    summary: "Use modelos para confirmar horários, lembrar atendimentos e pedir avaliações.",
    steps: [
      "Abra a ação de mensagem em um agendamento ou na ficha do cliente.",
      "Escolha um modelo de confirmação, lembrete, reativação ou avaliação.",
      "Confira o nome, procedimento, data, horário e link antes de enviar.",
      "Personalize o texto quando necessário e registre o contato no histórico.",
      "Para solicitar uma avaliação, configure primeiro o link do Google em Ajustes.",
    ],
    tips: [
      "Revise mensagens automáticas para manter o tom da clínica e evitar informações desatualizadas.",
    ],
  },
  {
    title: "Cupons e descontos",
    area: "Relacionamento",
    summary:
      "Crie campanhas de desconto e permita que o cliente aplique o cupom no agendamento online.",
    steps: [
      "Abra Ajustes e expanda a seção Configurar descontos.",
      "Clique em Novo cupom e informe um código simples, como RETORNO10, e o percentual de desconto.",
      "Defina, se desejar, data de início, validade, limite de utilizações e a opção de uma utilização por cliente.",
      "Escolha se o cupom vale para todos os procedimentos ou apenas para serviços selecionados.",
      "Clique em Criar cupom e confira se ele aparece como ativo na lista.",
      "Compartilhe o código com o cliente. No link público, ele deve selecionar o procedimento ou pacote, informar os dados e clicar em Aplicar no campo Cupom de desconto.",
      "Acompanhe utilizações e o total concedido na própria seção de descontos. O Aura valida o cupom no servidor antes de registrar o agendamento.",
    ],
    tips: [
      "Use códigos diferentes para campanhas diferentes. Para interromper uma campanha sem perder o histórico, edite o cupom e desative a opção Ativo.",
    ],
  },
  {
    title: "Clientes em recuperação",
    area: "Relacionamento",
    summary:
      "Identifique clientes que não retornaram e envie uma oferta personalizada para reativá-los.",
    steps: [
      "Abra Ajustes e expanda Clientes em recuperação.",
      "Ative os alertas e informe depois de quantos dias sem atendimento o cliente deve ser considerado inativo.",
      "Clique em Salvar configuração. O mesmo prazo será usado na área Retenção do CRM.",
      "Abra CRM e entre na aba Retenção para visualizar clientes inativos e retornos recomendados.",
      "Use WhatsApp para enviar uma mensagem simples de reativação ou clique em Oferecer desconto para escolher um cupom ativo.",
      "Revise o código, o percentual e a validade da oferta antes de enviá-la pelo WhatsApp.",
      "Depois do contato, use Criar follow-up para registrar a próxima ação e não perder o acompanhamento.",
    ],
    tips: [
      "Crie um cupom específico para recuperação, com validade curta e uma utilização por cliente, para medir melhor o resultado da campanha.",
    ],
  },
  {
    title: "Notificações de recuperação",
    area: "Relacionamento",
    summary: "Acompanhe alertas de clientes inativos diretamente pela campainha do Aura.",
    steps: [
      "Quando o Aura identificar um cliente sem atendimento pelo prazo configurado, ele poderá gerar um alerta de recuperação.",
      "Na área autenticada, observe a campainha de notificações no cabeçalho, no computador ou no celular.",
      "O número exibido indica notificações não lidas. Clique na campainha para abrir a lista.",
      "Clique no alerta do cliente para marcá-lo como lido e abrir diretamente a ficha 360° correspondente.",
      "Na ficha do cliente, consulte o histórico, registre uma interação ou volte ao CRM para enviar uma oferta.",
    ],
    tips: [
      "Use a campainha como triagem rápida e a aba Retenção do CRM para visualizar a lista completa de clientes e executar ações em sequência.",
    ],
  },
  {
    title: "Vários procedimentos e pacotes no agendamento público",
    area: "Operação",
    summary:
      "Permita que o cliente combine procedimentos ou selecione mais de um pacote no mesmo pedido.",
    steps: [
      "Confirme em Procedimentos que os serviços e pacotes estão ativos e disponíveis para agendamento online.",
      "Abra o link público da clínica e escolha o profissional.",
      "Na aba Procedimentos, marque todos os serviços desejados. O resumo mostra a duração e o preço combinados.",
      "Na aba Pacotes, marque um ou mais pacotes disponíveis. O resumo mostra o total dos pacotes selecionados.",
      "Escolha a data e o horário. O Aura considera a duração total para oferecer somente horários que comportem a combinação.",
      "Preencha nome, WhatsApp, e-mail e observações e confirme o agendamento.",
      "Se houver um cupom, informe o código no campo Cupom de desconto antes de confirmar.",
    ],
    tips: [
      "Se um serviço não aparecer, confira se está ativo, se foi oferecido pelo profissional escolhido e se o pacote contém procedimentos ativos.",
    ],
  },
  {
    title: "Instalar o Aura como aplicativo",
    area: "Comece aqui",
    summary:
      "Instale o Aura no celular ou computador para abrir a agenda rapidamente, inclusive com suporte à experiência offline.",
    steps: [
      "Abra o Aura pelo navegador e faça login normalmente.",
      "Quando aparecer o convite Instale o Aura, clique em Instalar. No iPhone, use Compartilhar e depois Adicionar à Tela de Início.",
      "Se fechar o convite, use o menu de instalação do próprio navegador para instalar quando quiser.",
      "Abra o ícone do Aura pela tela inicial e confirme que a agenda e o menu estão funcionando.",
      "Quando houver uma atualização, o Aura exibirá uma opção para atualizar a versão instalada.",
    ],
    tips: [
      "A instalação não cria uma conta nova: ela apenas adiciona um atalho com experiência de aplicativo para a mesma clínica.",
    ],
  },
];

function AjudaPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(GUIDES[0].title);
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      GUIDES.filter((guide) =>
        [guide.title, guide.area, guide.summary, ...guide.steps, ...guide.tips]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [normalizedSearch],
  );

  function toggleAll() {
    setOpen(open === "__all__" ? null : "__all__");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Como fazer?"
        subtitle="Manual completo do Aura para consultar qualquer função da sua clínica."
      />
      <div className="surface mb-5 flex flex-wrap items-center gap-3 p-4">
        <Search className="size-4 text-muted-foreground" />
        <Input
          className="min-w-48 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          placeholder="Buscar por agenda, cliente, comissão, estoque..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={toggleAll}
        >
          {open === "__all__" ? "Recolher tudo" : "Expandir tudo"}
        </button>
      </div>
      <div className="mb-5 rounded-xl border border-primary/20 bg-primary-soft/40 p-5">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-display font-semibold">Bem-vinda ao manual do Aura</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Use a busca para encontrar uma função ou abra os capítulos abaixo. Cada capítulo
              explica para que serve a área, o passo a passo e os cuidados mais importantes. Se
              estiver começando agora, siga a ordem do capítulo “Primeiros passos”.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-background/70 p-3">
            <ClipboardCheck className="mb-2 size-4 text-primary" />
            <p className="text-xs font-semibold">Configure</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastros, equipe, catálogo e horários.
            </p>
          </div>
          <div className="rounded-lg bg-background/70 p-3">
            <BookOpen className="mb-2 size-4 text-primary" />
            <p className="text-xs font-semibold">Aprenda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Passos detalhados para cada módulo.
            </p>
          </div>
          <div className="rounded-lg bg-background/70 p-3">
            <Lightbulb className="mb-2 size-4 text-primary" />
            <p className="text-xs font-semibold">Aplique</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dicas para evitar erros e ganhar tempo.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map((guide) => {
          const expanded = open === "__all__" || open === guide.title;
          return (
            <article className="surface overflow-hidden" key={guide.title}>
              <button
                type="button"
                className="flex w-full items-center gap-4 p-5 text-left"
                onClick={() => setOpen(expanded && open !== "__all__" ? null : guide.title)}
                aria-expanded={expanded}
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
                  className={`size-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
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
                    <strong className="text-foreground">Dica:</strong> {guide.tips.join(" ")}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {!filtered.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma orientação encontrada. Tente buscar por outra palavra ou consulte a equipe.
        </p>
      ) : null}
    </div>
  );
}
