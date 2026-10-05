# Relatório de implementação — WhatsApp Business no Aura Studio

**Data:** 2 de outubro de 2026
**Decisão de arquitetura:** Meta direta via WhatsApp Business Platform/Cloud API e Embedded Signup v4, escolhida pelo usuário.
**Estado:** preparação local em branch isolada; **não implantado e não conectado**.

## Resumo executivo

A integração é tecnicamente viável. A tela do Estetic mostrou somente o estado **“Não conectado”** e o botão “Conectar WhatsApp”; como o número não estava conectado, suas áreas de Automações, Modelos de Mensagem Meta e Histórico não estavam acessíveis. Não iniciei o onboarding do número.

No Aura já existem nove modelos de mensagem importados do Estetic para uso manual, mas eles são textos comuns — **não são templates aprovados pela Meta**. O fluxo atual ainda abre o WhatsApp via `wa.me` para revisão/envio manual.

Foi preparado localmente um painel Aura com abas de visão geral, automações, modelos Meta e histórico; CTA de conexão; proteção de rota/permissão; funções de conexão/sincronização/webhook; e migration de preparação. Isso é um **protótipo de integração**, não uma conexão operacional: a configuração/aprovação Meta ainda é necessária, não há envio de mensagens pelo Aura e nenhum worker dispara automações.

## Preflight read-only do Lovable Cloud

A inspeção foi feita pelo Brave autenticado e limitada a `SELECT` nos catálogos de schema. Nenhuma linha de cliente, paciente ou mensagem foi consultada; não houve DDL, DML, migration, deploy, conexão Meta ou envio.

O preflight confirmou:

- Schema-base existente no Cloud: `whatsapp_contacts`, `whatsapp_conversations`, `whatsapp_integrations`, `whatsapp_messages` e `whatsapp_webhook_events`.
- Extensão Supabase Vault instalada.
- Helpers existentes: `public.has_org_permission`, `public.is_org_admin` e `public.is_org_member`.
- Ainda não existem no Cloud as tabelas `whatsapp_message_templates`, `whatsapp_automation_rules`, `whatsapp_automation_jobs` e `whatsapp_integration_secret_refs` previstas na migration local.

A presença das tabelas-base no Cloud **não** corrige a ausência da migration-base correspondente na cadeia versionada local. Um rebuild de banco limpo não fica reproduzível enquanto essa dependência e as políticas das tabelas operacionais não forem reconciliadas.

## Trabalho local preparado

Branch: `feat/whatsapp-meta-20261002`, baseada localmente em `e99bbc5`. Não foi feito commit nem push; `main`/Cloud não foram alterados.

- UI WhatsApp no Aura com um CTA para iniciar Embedded Signup v4, estados de conexão claros e abas para automações, catálogo Meta e histórico.
- A rota e o menu verificam `whatsapp.ver`; conexão e sincronização ficam restritas a proprietário/gerente. A rota autenticada atual mapeia `/whatsapp` para a área `whatsapp`.
- `whatsapp-connect` troca o código curto da Meta no backend, valida ativos e guarda token/PIN no Vault por RPC; os valores não são retornados ao navegador.
- `whatsapp-sync-templates` consulta o cache persistido no reload e sincroniza status/modelos aprovados; reporta `TEMPLATE_SYNC_LIMIT_REACHED` em vez de anunciar sincronização completa se ultrapassar o limite de 5.000 itens.
- `whatsapp-webhook` verifica HMAC-SHA256, limita payload, deduplica eventos e não registra tokens ou payload bruto. A migration local acrescenta índice único para `provider_message_id`.
- Regras de automação iniciam desativadas, exigem opt-in e template aprovado; trigger SQL valida que o template pertence à mesma organização.
- Configuração local: `verify_jwt=true` para `whatsapp-connect` e `whatsapp-sync-templates`; `verify_jwt=false` para `whatsapp-webhook`.

## Validação local executada

Todos os comandos abaixo concluíram com sucesso:

- `pnpm build`
- `pnpm exec tsc --noEmit`
- ESLint focado nos arquivos de rota, navegação e permissões alterados
- `prettier --check` nos arquivos TypeScript/TSX do recurso
- Typecheck auxiliar das Edge Functions com declarações temporárias mínimas de Deno
- `git diff --check`

**Limites dos testes:** Deno e `psql` não estão instalados neste ambiente. O typecheck auxiliar não substitui `deno check`; a migration não foi executada nem testada num banco. Também não houve teste de API Meta, Embedded Signup, webhook ao vivo, envio de mensagens, automação, RLS real ou fluxo E2E com clínica.

## Revisão dos achados de auditoria

Uma auditoria read-only encontrou achados sobre uma versão anterior dos arquivos. Na revisão do estado atual da branch:

- **Não reproduzidos após mudanças já presentes:** falta de gate da rota (agora `/whatsapp` e `whatsapp.ver` estão no guard/menu e na tela); modelos não carregados após reload (a UI chama a função de cache com `refresh:false`); promessa de envio pela UI (a tela informa que envio pelo Aura não está habilitado); truncamento silencioso em 500 (limite atual é 5.000 e retorna erro explícito); associação de template cross-tenant (trigger valida a organização).
- **Risco restante:** o webhook pode reclamar novamente um evento `received` após 120 segundos. O fechamento do evento usa timestamp de claim como fencing e a migration propõe unicidade por ID da mensagem, mas o processamento não é uma única transação com heartbeat/lease renovável. Antes de produção, revisar a corrida em execução lenta e validar as constraints/RLS da migration-base no banco alvo.
- **Bloqueio de reprodutibilidade:** a migration-base do schema operacional WhatsApp não está versionada no conjunto local de migrations. O Cloud tem as tabelas-base, mas as políticas RLS/constraints atuais dessas tabelas não foram auditadas.

## Pendências antes de operação real

1. Concluir verificação empresarial, App Review, permissões avançadas e configuração do app Meta como Tech Provider. A decisão Meta direta não equivale a aprovação da Meta.
2. Configurar IDs públicos `VITE_META_APP_ID` e `VITE_META_CONFIG_ID` e os segredos server-side exigidos pela implementação (por exemplo, `META_APP_ID`, `META_APP_SECRET` e `WHATSAPP_WEBHOOK_VERIFY_TOKEN`) somente no ambiente seguro do Cloud. **Nenhum valor foi lido ou incluído neste relatório.**
3. Recuperar/versionar a migration-base e revisar políticas RLS, índices e triggers no schema-alvo antes de aplicar a migration nova.
4. Endurecer e testar o processamento concorrente/idempotente do webhook com eventos sintéticos.
5. Implementar envio Cloud API, persistência de mensagens de saída e estados completos; hoje a interface de histórico depende de mensagens/eventos recebidos e não constitui histórico de envio pelo Aura.
6. Implementar worker/agenda para automações com horário local, janela de silêncio, consentimento e idempotência. As automações atuais são apenas configuradas como desativadas; nenhum envio automático ocorre.
7. Só após revisões e autorização própria: aplicar migration, fazer deploy das funções, testar onboarding controlado e realizar E2E apenas com dados sintéticos prefixados `[E2E TESTE AURA]`.

## Privacidade e efeitos externos

Nenhuma credencial Meta foi solicitada por chat ou inspecionada. Nenhum token, PIN, código OAuth ou payload sensível foi registrado. Nenhuma clínica foi conectada; nenhum cliente/mensagem de teste foi criado; nenhum envio foi feito. Não houve commit, push, deploy ou alteração no Cloud.

## Fontes oficiais consultadas

- [Embedded Signup v4](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4)
- [Requisitos para Tech Providers](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)
- [Templates WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
- [Webhooks WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- [Vault do Supabase](https://supabase.com/docs/guides/database/vault)


## Retomada e comparação do Cloud — 2026-10-05

No projeto Aura aberto no Brave autenticado, uma consulta somente de catálogo comparou o schema `public` do Cloud com a migration-base recuperada. As cinco relações-base existem; colunas, defaults, constraints, índices, triggers e policies RLS coincidem com a base. RLS está habilitado nas cinco; `whatsapp_webhook_events` não expõe policy a usuários autenticados. Não foram consultados registros de pacientes, contatos ou mensagens.

A inspeção de grants encontrou privilégios padrão para `anon` e privilégios amplos para `authenticated` em quatro tabelas base; as policies bloqueiam acesso sem permissão, mas esses grants eram desnecessários. Também foi constatado que a policy original de `whatsapp_integrations` permitia conexão/edição a qualquer membro com permissão delegada `whatsapp.editar`, enquanto as Edge Functions já exigem explicitamente owner/manager. A migration-base local foi atualizada para revogar grants a `anon`, limitar verbos autenticados e usar `public.is_org_admin(organization_id)` na policy de integrações. Essa mudança ainda não foi aplicada ao Cloud.

A migration Meta e as quatro Edge Functions seguem locais. Nenhuma migration, deploy de função, publicação do site, onboarding Meta ou teste E2E foi realizado nesta retomada. O Sandbox não tem Supabase CLI nem `SUPABASE_ACCESS_TOKEN`; configuração Meta não está disponível nas variáveis locais. A próxima etapa depende de versionar/sincronizar o branch da feature, executar migrations em backend-only e provisionar as credenciais Meta no ambiente seguro antes do E2E.
