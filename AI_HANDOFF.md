# Handoff para a próxima IA — 2026-10-02

Leia esta nota antes de continuar o deploy de assinatura ou modificar o branch compartilhado.

## Estado do repositório compartilhado

- Repositório: `tiago3228/aura-studio`; branch: `main`.
- No momento deste handoff, `main` estava em `22dbcea` e incluía `36e5f5e` (`Changes`) e `22dbcea` (`Corrigiu build do deploy`), ambos atribuídos ao bot `gpt-engineer-app`.
- O usuário informou que outra IA também trabalhava no repositório e poderia não ter terminado. Trate esses commits como trabalho concorrente: **não reverta, resete, faça force-push ou sobrescreva arquivos sem coordenação explícita**.
- Os commits próprios anteriores já estão na ancestralidade do branch, incluindo `54f2555` e `cbebdbb`. O checkout local foi avançado por fast-forward até o `main` remoto; nenhuma história publicada foi reescrita.

## Trabalho concluído anteriormente

- Os 14 modelos contratuais do Estetic foram importados para o Aura com updates guardados; validação anterior confirmou códigos 1–14 e nenhum placeholder pendente.
- Foi aplicada a migration de defaults/acesso de modelos de contrato; os defaults são semeados para organizações existentes e novas. A política solicitada foi criar/editar para membros e excluir apenas para proprietário/gerente.
- Foram importados nove modelos genéricos de mensagens e criadas a tela/rotas correspondentes. A alteração de acordeão na Administração da Plataforma também foi sincronizada anteriormente.
- A correção de revogação em `contract-signing-session` está no histórico do repositório; `contract-acceptance` já rejeitava aceitação revogada.
- No Lovable Cloud, os três nomes de secrets necessários foram confirmados como presentes e `verify_jwt=false` foi confirmado para ambas as funções. Seus valores nunca devem ser lidos ou registrados.

## Bloqueio atual do deploy

- A solicitação autorizada era publicar somente `contract-signing-session` e `contract-acceptance`, com o helper existente `supabase/functions/_shared/contracts.ts`, usando o commit `cbebdbb`.
- O agente do Lovable informou que seu checkout estava em `79cdfa4`, não em `cbebdbb`, e interrompeu o deploy. Depois disso, o branch GitHub avançou com commits de atividade concorrente; não assuma que o checkout do Cloud acompanha automaticamente o `main`.
- Nenhuma função nem o site foi publicado nesta tentativa. A página Cloud mostrava as funções como Active, uma implantação cada e última atualização há um dia — isso não confirma que a versão desejada esteja implantada.
- A tentativa também resultou em uma resposta do Lovable dizendo que corrigiu quatro erros de compilação. Os commits concorrentes apareceram no GitHub durante essa janela; confirme com a outra IA/usuário antes de alterar ou reverter esse trabalho.
- Os endpoints esperados no projeto `qpedjuvpnumyahcrojsm` são:
  - `https://qpedjuvpnumyahcrojsm.supabase.co/functions/v1/contract-signing-session`
  - `https://qpedjuvpnumyahcrojsm.supabase.co/functions/v1/contract-acceptance`
- Não foi feita a chamada com token inválido porque o deploy não ocorreu. Nenhum dado E2E foi criado, portanto não houve dados temporários a limpar.

## Próximos passos seguros

1. Coordenar com o usuário/a outra IA qual commit aprovado deve ser implantado e sincronizar o Cloud para esse commit; não escolher a revisão silenciosamente.
2. Publicar somente as duas Edge Functions e o helper existente. Não publicar o frontend, executar migrations nem fazer DDL/DML nesta etapa.
3. Usar apenas os secrets já existentes (`CONTRACT_SIGNING_SECRET`, `PORTAL_AUDIT_SECRET`, `PUBLIC_APP_ORIGIN`) sem ler/exibir valores; usar as variáveis automáticas Supabase apenas no backend; manter `verify_jwt=false`.
4. Só após o deploy confirmado, fazer uma única chamada de teste com token inválido fictício, sem gravar o token em logs.
5. A validação E2E restante ainda inclui sessão válida, expiração/cancelamento, aceite, idempotência/replay, hashes, eventos, RLS, CORS/OPTIONS e limpeza. Use exclusivamente dados com prefixo `[E2E TESTE AURA]`; nunca altere dados reais.

## Atualização de validação E2E — 2026-10-02 15:44 -03

- No momento desta verificação, o checkout local estava limpo em `9acac71`, igual a `origin/main`. Não foram alterados arquivos de aplicação nesta sessão.
- No Lovable Cloud, `contract-acceptance` e `contract-signing-session` aparecem como **Active**, última atualização há um dia. Isso não comprova qual commit está implantado. A tentativa anterior parou porque o checkout Cloud era `79cdfa4`, diferente do commit autorizado `cbebdbb`; nesta sessão não houve deploy nem chamada HTTP.
- O teste da RPC `public.get_patient_portal(text)` com tokens aleatórios sintéticos falhou antes de testar invalidez/expiração/revogação: SQLSTATE `42883`, `function digest(text, unknown) does not exist`. Diagnóstico read-only: `pgcrypto` e os overloads de `digest` estão em `extensions`, mas a RPC define `search_path=public, storage`; a chamada não qualificada `digest(_token, 'sha256')` não resolve. `anon` tem permissão EXECUTE, mas a função não está operacional com essa configuração.
- O bloco de teste era uma única instrução transacional; após a falha, a contagem do cliente e dos tokens sintéticos restantes foi zero. Nenhum dado real foi consultado, nenhum segredo foi lido e não houve alteração persistente nem registro de auditoria de fixture.
- Não declarar os testes da RPC como aprovados. A correção ainda precisa ser revisada/coordenada e feita como alteração de código/migration separada (por exemplo, qualificar `extensions.digest`), depois validada no Cloud. Não aplicar essa correção dentro do deploy isolado das Edge Functions.

## Atualização WhatsApp Business — 2026-10-02 17:19 -03

- O usuário escolheu **Meta direta/Tech Provider** (Embedded Signup v4). Trabalho preparado apenas na branch local `feat/whatsapp-meta-20261002`, base `e99bbc5`; sem commit/push. Não alterar/reverter `main` nem conflitar com outra IA sem coordenação.
- O usuário confirmou que a continuação deve limitar-se a validação local e documentação. Não fazer novas ações no Cloud, conexão Meta, envio de mensagens, commit/push ou deploy.
- Preflight Cloud via Brave foi somente leitura de catálogos (`SELECT`): confirmou as tabelas-base `whatsapp_contacts`, `whatsapp_conversations`, `whatsapp_integrations`, `whatsapp_messages`, `whatsapp_webhook_events`, helpers de organização e Vault instalado. Não leu linhas de pacientes/mensagens. Tabelas novas de catálogo Meta, regras/jobs de automação e referências ao Vault não existem ainda no Cloud.
- Nenhuma migration foi aplicada. A migration-base WhatsApp não está versionada na cadeia local, embora as tabelas-base existam no Cloud; revisar/reconciliar cadeia e policies RLS antes de qualquer aplicação.
- Código local inclui painel/CTA, route gate `whatsapp.ver`, `whatsapp-connect`, `whatsapp-sync-templates`, `whatsapp-webhook` e migration preparatória. O envio Cloud API pelo Aura e o worker de automações **não existem**; automações permanecem desativadas e a UI informa que o envio ainda não está habilitado.
- `verify_jwt`: `true` em connect/sync, `false` no webhook. Nenhum valor de segredo foi lido. O webhook verifica HMAC; ainda deve ser revisada a concorrência quando um evento `received` é reclaimado após 120 s; migration propõe índice único por `provider_message_id`.
- A auditoria independente trouxe alguns achados já superados no snapshot atual: rota agora tem gate; catálogo lê cache após reload; UI não promete envio; sync retorna erro explícito se exceder 5.000; trigger verifica organização do template. Permanecem bloqueios: migration-base/RLS não reproduzíveis/revisados, risco de lease concorrente e ausência de sender/worker.
- Validação local atual: `pnpm build`, `tsc --noEmit`, ESLint focado, Prettier check, typecheck auxiliar com stubs Deno e `git diff --check` passaram. Deno e `psql` não estão instalados; nenhuma migration, API Meta ou E2E ao vivo foi executado.
- Relatório completo está em `WHATSAPP_IMPLEMENTATION_REPORT.md`. Não declarar integração pronta para produção nem concluir onboarding até cumprir aprovações, reconciliação do schema/RLS e testes autorizados.


## Retomada WhatsApp — 2026-10-05

- Checkout de implementação: `/home/ubuntu/aura-studio`, branch `feat/whatsapp-meta-20261002`, HEAD `0107dcb`; existem alterações locais não commitadas. Checkout `/home/ubuntu/work/aura-studio` está na `main` em `6d479a2`, atrás de `origin/main` em 9 commits. Não confundir os dois nem usar o checkout `main` para deploy.
- Via Brave autenticado, executei somente SELECTs em `information_schema`/`pg_catalog` no Cloud. As cinco tabelas-base (`whatsapp_integrations`, `whatsapp_contacts`, `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_webhook_events`) têm colunas, constraints, índices, triggers e policies RLS compatíveis com a migration-base local recuperada. RLS está habilitado em todas; eventos não têm policy authenticated.
- Divergências de hardening identificadas: Cloud concede privilégios padrão a `anon` (e grants amplos a `authenticated`) em quatro tabelas base, embora as policies RLS impeçam acesso anônimo efetivo; e `whatsapp_integrations_manage` usava `has_org_permission(...,'whatsapp.editar')`, permitindo delegação customizada de conectar/alterar números além de owner/manager. A migration-base local foi ajustada, ainda não aplicada, para revogar grants de `anon`/`authenticated` e conceder só os verbos pretendidos, e para exigir `is_org_admin` (owner/manager) na policy de integrações.
- O `whatsapp_inbox` foi recuperado como migration-base na árvore local, porém ainda precisa de commit/push antes de ser considerado versionado/publicável. Nenhuma migration foi aplicada ao Cloud nesta retomada. A migration Meta, funções e config estão locais.
- A revisão confirma que o PIN é transitório no request e não é persistido; a desconexão tenta remover a assinatura WABA antes do cleanup Vault. As quatro Edge Functions ainda não foram implantadas. No Sandbox, `supabase` CLI e `SUPABASE_ACCESS_TOKEN` não estão disponíveis; nomes/valores de credenciais Meta não foram configurados aqui. Não ler ou registrar segredos.
- Próximo passo: terminar validação estática/tests; verificar apenas nomes dos secrets públicos/privados no painel sem revelar valores; sincronizar com GitHub na branch `feat/whatsapp-meta-20261002` sem reescrever `main`; aplicar as duas migrations somente depois de commit/revisão; então deploy isolado das quatro funções. Conexão E2E e desconexão dependem de IDs/configuração Meta e organização+número de teste não produtivos prefixados `[E2E TESTE AURA]`.
