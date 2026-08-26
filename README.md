# Aura Studio

# PRD COMPLETO — SAAS DE GESTÃO PARA CLÍNICAS DE ESTÉTICA

## 1. VISÃO DO PRODUTO

Crie um SaaS completo, moderno, responsivo e mobile-first para gestão de clínicas de estética, esteticistas, profissionais de beleza e pequenos espaços de atendimento.

O sistema deve centralizar:

* Agenda

* Clientes

* Anamnese digital

* Prontuário/histórico

* Procedimentos

* Pacotes e sessões

* Profissionais

* Agendamento online

* Financeiro

* Caixa

* Pix

* Contas a pagar e receber

* Estoque

* Insumos

* Comissões

* Relatórios

* CRM

* WhatsApp e automações

* Personalização da clínica

* Assistente de Inteligência Artificial

O produto deve ser construído como um verdadeiro SaaS multi-tenant.

NÃO criar somente telas estáticas.

NÃO usar dados mockados como solução definitiva.

A aplicação deve ser preparada para funcionamento real através do Lovable Cloud/Backend.

---

# 2. OBJETIVO

Criar uma plataforma que substitua:

* agenda de papel

* planilhas

* fichas de anamnese impressas

* controles manuais de pacotes

* controles financeiros separados

* sistemas de estoque

* ferramentas de CRM

* comunicação manual com clientes

A proposta do produto é:

## "Tudo o que sua clínica precisa para atender, organizar e crescer em um só lugar."

O sistema deve ser extremamente simples para uma profissional autônoma, mas suficientemente robusto para uma clínica com vários profissionais.

---

# 3. PÚBLICO-ALVO

Prioridade inicial:

* esteticistas

* clínicas de estética

* profissionais autônomas

* biomédicas

* espaços de estética

* clínicas pequenas e médias

A arquitetura deve permitir futuramente expansão para:

* salão de beleza

* barbearia

* massoterapia

* fisioterapia

* podologia

* manicure

* depilação

* tatuagem

* outros negócios de atendimento por horário.

---

# 4. POSICIONAMENTO

Não criar aparência de software antigo ou sistema empresarial complexo.

O produto deve transmitir:

* moderno

* elegante

* premium

* confiável

* simples

* organizado

* profissional

* tecnológico

A experiência deve ser parecida com produtos SaaS modernos.

Mobile-first, mas excelente também em desktop.

---

# 5. ARQUITETURA MULTI-TENANT

Esta é uma exigência FUNDAMENTAL.

Cada clínica/profissional deve possuir uma organização independente.

Estrutura:

PLATAFORMA

→ Organização/Clínica

→ Usuários

→ Profissionais

→ Clientes

→ Procedimentos

→ Pacotes

→ Agenda

→ Financeiro

→ Estoque

→ Documentos

→ Configurações

Cada registro pertencente a uma clínica deve possuir:

organization_id

NUNCA permitir que uma organização visualize dados de outra.

Utilizar PostgreSQL com Row Level Security (RLS).

Toda consulta ao banco deve respeitar a organização autenticada.

---

# 6. AUTENTICAÇÃO

Implementar autenticação real.

Possibilidades:

* e-mail e senha

* recuperação de senha

* sessão persistente

* logout

* proteção de rotas

* controle de acesso

Estrutura de usuários vinculada à organização.

Um usuário pode ter uma função/perfil dentro da clínica.

---

# 7. ONBOARDING

Ao criar uma conta, conduzir a profissional por um onboarding simples.

Etapas:

1. Nome da clínica

2. Nome da profissional

3. Logo

4. WhatsApp

5. Instagram

6. Telefone

7. Endereço

8. Cor principal

9. Primeiro procedimento

10. Primeiro horário de atendimento

Ao terminar, abrir o Dashboard.

Criar alguns dados iniciais somente se a usuária optar por utilizar exemplos.

---

# 8. PERSONALIZAÇÃO DA CLÍNICA

A profissional deve conseguir personalizar sua conta.

Configurações:

* nome da clínica

* razão social

* logo

* favicon

* imagem de capa

* descrição

* telefone

* WhatsApp

* Instagram

* endereço

* cidade

* estado

* CEP

* cor principal

* cor secundária

* horário de funcionamento

* link público de agendamento

O sistema deve utilizar automaticamente a identidade visual cadastrada.

---

# 9. PROCEDIMENTOS

NÃO criar uma lista fixa de procedimentos.

Cada clínica deve poder criar seus próprios procedimentos livremente.

Campos:

* nome

* categoria

* descrição

* duração em minutos

* preço

* preço promocional

* comissão

* tipo de comissão

* foto

* ativo/inativo

* disponível para agendamento online

* intervalo/buffer após atendimento

Exemplos:

* Limpeza de Pele

* Drenagem Linfática

* Criolipólise

* Eletrolipólise

* Massagem Modeladora

* Microagulhamento

* Laser

* Botox

* Preenchimento

Mas a profissional deve poder criar qualquer outro procedimento.

---

# 10. PROFISSIONAIS

Cadastro:

* nome

* foto

* telefone

* e-mail

* especialidade

* procedimentos realizados

* comissão padrão

* horários de atendimento

* dias de trabalho

* ativo/inativo

Cada profissional pode possuir login individual.

---

# 11. CLIENTES

Criar módulo completo de clientes.

Campos:

* nome

* CPF

* data de nascimento

* telefone

* WhatsApp

* e-mail

* endereço

* observações

* tags

* origem

* data do cadastro

Histórico:

* agendamentos

* atendimentos

* procedimentos

* pacotes

* pagamentos

* documentos

* anamneses

* fotos

* evolução

* observações

Permitir:

* editar

* excluir

* anexar arquivos

* visualizar

* imprimir

* pesquisar

* filtrar

---

# 12. ANAMNESE DIGITAL

Criar sistema de anamnese configurável.

A clínica deve poder criar seus próprios formulários.

Tipos de campos:

* texto

* texto longo

* sim/não

* múltipla escolha

* seleção

* checkbox

* data

* número

* assinatura

* upload de imagem

* upload de documento

Exemplos:

"Queixa principal"

"Histórico de saúde"

"Está em tratamento médico?"

"Utiliza medicamentos?"

"Possui alergias?"

A profissional poderá criar perguntas específicas para cada procedimento.

A anamnese deve ficar vinculada ao cliente e ao atendimento.

---

# 13. ASSINATURA ELETRÔNICA

Permitir assinatura digital em:

* anamnese

* termos

* contratos

* documentos

Registrar:

* assinatura

* data

* horário

* usuário

* documento relacionado

---

# 14. FOTOS ANTES E DEPOIS

Permitir upload de fotos.

Organizar por:

* cliente

* procedimento

* atendimento

* data

Mostrar comparação antes/depois.

Controlar acesso às imagens.

---

# 15. AGENDA

Criar agenda profissional moderna.

Views:

* Dia

* Semana

* Mês

Filtros:

* profissional

* sala

* equipamento

* procedimento

Cada agendamento deve mostrar:

* cliente

* procedimento

* profissional

* horário

* duração

* status

* pagamento

* pacote

Status:

* agendado

* confirmado

* aguardando

* atendido

* cancelado

* faltou

* reagendado

---

# 16. BLOQUEIOS

Permitir bloqueios:

* ausência

* férias

* almoço

* reunião

* manutenção

* sala indisponível

* equipamento indisponível

* horário particular

O sistema nunca deve permitir conflito de horários.

---

# 17. AGENDAMENTO ONLINE

Criar página pública exclusiva para cada clínica.

URL:

/agendar/{booking_slug}

A página deve mostrar:

* logo

* nome

* descrição

* telefone

* WhatsApp

* Instagram

* endereço

* procedimentos

* profissionais

* horários disponíveis

A cliente seleciona:

1. procedimento

2. profissional

3. data

4. horário

5. nome

6. telefone

7. WhatsApp

8. e-mail

Depois confirma.

---

# 18. PAGAMENTO NO AGENDAMENTO

Preparar arquitetura para Pix.

Possibilidades:

* pagamento integral

* sinal

* pagamento opcional

Exibir:

* valor

* QR Code

* Pix copia e cola

* status do pagamento

Estados:

* aguardando pagamento

* pago

* expirado

* cancelado

O agendamento poderá ficar reservado por determinado período enquanto aguarda pagamento.

---

# 19. PACOTES

Permitir criar pacotes.

Exemplo:

"Pacote Laser 10 Sessões"

* 10 sessões

* validade

* preço

O sistema deve controlar:

* sessões contratadas

* sessões utilizadas

* sessões restantes

* validade

* pagamentos

* profissionais

* procedimentos associados

Ao concluir atendimento utilizando pacote:

10 → 9 → 8...

Nunca permitir saldo negativo.

Alertar quando:

* restarem poucas sessões

* pacote estiver próximo de vencer

* pacote estiver vencido

---

# 20. ATENDIMENTO

Ao abrir um agendamento:

mostrar:

* dados da cliente

* anamnese

* histórico

* pacote

* procedimento

* observações

* fotos

* evolução

Botão:

"Concluir atendimento"

Ao concluir:

* registrar atendimento

* consumir sessão do pacote quando aplicável

* registrar pagamento quando aplicável

* gerar comissão

* baixar estoque

* atualizar histórico

* atualizar indicadores

---

# 21. FINANCEIRO

Criar módulo financeiro completo.

### Vendas

* cliente

* procedimento

* pacote

* profissional

* valor

* desconto

* acréscimo

* comissão

* custo

* lucro estimado

### Formas de pagamento

* Pix

* cartão de crédito

* cartão de débito

* dinheiro

* transferência

* outros

---

# 22. CAIXA

Operações:

* abertura

* resumo

* suprimento

* sangria

* venda

* despesa

* fechamento

Mostrar:

* saldo inicial

* entradas

* saídas

* saldo esperado

* saldo informado

* diferença

---

# 23. CONTAS A RECEBER

Campos:

* cliente

* descrição

* valor

* vencimento

* parcela

* status

Status:

* pendente

* vencido

* pago

* cancelado

Permitir registrar baixa.

---

# 24. CONTAS A PAGAR

Campos:

* fornecedor

* descrição

* categoria

* valor

* vencimento

* recorrência

* status

---

# 25. ESTOQUE

Criar:

* produtos

* insumos

* categorias

* unidade de medida

* estoque mínimo

* custo

* preço de venda

Movimentações:

* entrada

* saída

* ajuste

* perda

* consumo por procedimento

---

# 26. CONSUMO AUTOMÁTICO DE INSUMOS

Permitir associar produtos aos procedimentos.

Exemplo:

Limpeza de Pele:

* 1 luva

* 2 gazes

* 5 ml produto X

Ao concluir atendimento:

baixar automaticamente os itens.

Registrar custo do atendimento.

---

# 27. COMISSÕES

Permitir comissão:

* percentual

* valor fixo

Por:

* procedimento

* pacote

* produto

Calcular:

* comissão bruta

* descontos

* comissão líquida

* comissão pendente

* comissão paga

Cada profissional pode visualizar apenas suas próprias informações, conforme permissões.

---

# 28. DASHBOARD

Criar dashboard elegante.

Cards:

* faturamento hoje

* faturamento do mês

* agendamentos hoje

* clientes atendidas

* contas a receber

* contas vencidas

* sessões realizadas

* ticket médio

Gráficos:

### Fluxo de caixa

Recebimentos × Pagamentos

### Faturamento

Evolução diária/mensal

### Procedimentos

Distribuição de receita

### Profissionais

Faturamento por profissional

### Clientes

Novas × recorrentes

---

# 29. CRM

Criar módulo de relacionamento.

Segmentos:

* clientes novas

* clientes recorrentes

* clientes VIP

* clientes inativas

* clientes aniversariantes

* clientes com pacote acabando

* clientes com pagamento pendente

Mostrar:

* última visita

* próxima visita

* frequência

* ticket médio

* total gasto

---

# 30. AUTOMAÇÕES

Criar arquitetura preparada para automações.

Eventos:

* novo agendamento

* confirmação

* cancelamento

* atendimento concluído

* pacote próximo do fim

* cliente sem retorno

* aniversário

* pagamento pendente

* pagamento vencido

Exemplos:

24 horas antes:

"Olá, Maria! Seu atendimento está confirmado para amanhã às 15h."

30 dias após procedimento:

"Olá, Maria! Já está na hora de programar seu próximo atendimento."

---

# 31. WHATSAPP

Criar arquitetura preparada para integração com WhatsApp.

NÃO simular uma integração como se fosse real.

Quando a integração ainda não estiver configurada, mostrar estado:

"WhatsApp não conectado."

Preparar:

* templates

* variáveis

* mensagens automáticas

* confirmação

* lembretes

* retorno

* cobrança

---

# 32. ASSISTENTE DE IA

Criar módulo:

## Assistente IA

A IA deve conseguir responder perguntas sobre os dados da própria clínica.

Exemplos:

"Quanto faturei este mês?"

"Qual procedimento vendeu mais?"

"Qual profissional faturou mais?"

"Quais clientes estão há mais de 60 dias sem retornar?"

"Quais pacotes estão acabando?"

"Quanto tenho para receber?"

"Qual foi meu ticket médio?"

A IA deve consultar apenas os dados da organização autenticada.

Nunca permitir vazamento de dados entre organizações.

Preparar arquitetura para usar Edge Functions como camada segura entre o frontend e o provedor de IA.

---

# 33. PERMISSÕES

Criar sistema de RBAC.

Perfis padrão:

### Proprietária/Admin

Acesso total.

### Gerente

Acesso administrativo conforme permissões.

### Recepção

Agenda + clientes + agendamento.

### Profissional

Própria agenda + clientes autorizadas + atendimento + anamnese.

Permissões granulares:

* dashboard

* agenda

* clientes

* profissionais

* procedimentos

* pacotes

* anamnese

* financeiro

* caixa

* contas a pagar

* contas a receber

* estoque

* comissões

* relatórios

* configurações

* usuários

* IA

---

# 34. BANCO DE DADOS

Utilizar PostgreSQL.

Criar migrations reais.

Principais tabelas:

organizations

profiles

roles

permissions

role_permissions

user_roles

professionals

clients

client_files

anamnesis_templates

anamnesis_questions

anamnesis_responses

anamnesis_signatures

services

service_categories

packages

package_items

client_packages

appointments

appointment_status_history

calendar_blocks

rooms

equipment

sales

sale_items

payments

cash_registers

cash_transactions

accounts_receivable

accounts_payable

financial_accounts

products

inventory_movements

service_products

commission_rules

commission_entries

automations

message_templates

notification_logs

ai_conversations

ai_messages

subscriptions

subscription_events

audit_logs

Todas as tabelas que pertencem a uma clínica devem possuir organization_id.

---

# 35. SEGURANÇA

Implementar:

* RLS

* autenticação

* autorização

* proteção de rotas

* validação de dados

* políticas de Storage

* isolamento multi-tenant

* logs de auditoria

Dados de clientes e documentos devem ser protegidos.

Nunca expor chaves secretas no frontend.

Credenciais de APIs devem ficar em Secrets/Edge Functions.

---

# 36. LGPD

Preparar sistema para LGPD.

Implementar:

* controle de acesso

* registro de consentimento quando necessário

* histórico de alterações

* exclusão de dados conforme regras aplicáveis

* exportação de dados

* controle de documentos

* privacidade de anamneses

* auditoria

---

# 37. AUDITORIA

Criar `audit_logs`.

Registrar ações importantes:

* login

* criação

* edição

* exclusão

* alteração de cliente

* alteração de prontuário

* alteração financeira

* alteração de permissões

* fechamento de caixa

Registrar:

* usuário

* organização

* ação

* entidade

* registro

* data/hora

---

# 38. ASSINATURAS DO SAAS

Preparar estrutura para planos.

Exemplo inicial:

### Essencial

R$ 29,90/mês

### Profissional

R$ 49,90/mês

### Clínica

R$ 79,90/mês

### Premium

R$ 119,90/mês

Os limites devem ser configuráveis.

Criar tabelas:

plans

subscriptions

subscription_events

Não implementar cobrança real até a etapa específica de integração.

---

# 39. ADMINISTRADOR DA PLATAFORMA

Preparar área Master/Admin separada.

O administrador da plataforma poderá visualizar:

* clínicas cadastradas

* usuários

* planos

* assinaturas

* faturamento

* status

* trial

* métricas

Também poderá:

* suspender

* reativar

* visualizar organização

* alterar plano

Nunca permitir que o usuário comum acesse essa área.

---

# 40. DESIGN

Criar uma interface premium.

Diretrizes:

* clean

* elegante

* moderna

* bastante espaço em branco

* cards discretos

* tipografia profissional

* ícones consistentes

* ótima experiência mobile

* navegação simples

Não exagerar em gradientes.

Evitar aparência de template genérico.

A aplicação deve parecer um SaaS comercial pronto para ser vendido.

---

# 41. NAVEGAÇÃO

Sidebar desktop:

Dashboard

Agenda

Clientes

Atendimentos

Procedimentos

Pacotes

Profissionais

Financeiro

Estoque

Comissões

CRM

Relatórios

Assistente IA

Configurações

No mobile utilizar navegação inferior ou menu adaptado.

---

# 42. ESTADOS DA INTERFACE

Todas as telas devem possuir:

* loading

* empty state

* erro

* sucesso

* confirmação

* skeleton loading

Não deixar telas quebradas quando não houver dados.

Exemplo:

"Você ainda não possui procedimentos cadastrados."

Botão:

"+ Criar procedimento"

---

# 43. DADOS MOCKADOS

Durante o desenvolvimento visual, dados mockados podem ser utilizados temporariamente.

PORÉM:

Todo dado funcional deve posteriormente ser conectado ao PostgreSQL.

Não criar lógica que dependa permanentemente de arrays locais ou localStorage.

O banco deve ser a fonte de verdade.

---

# 44. PARTE 2 — INTELIGÊNCIA E BACKEND

Agora transforme o protótipo em aplicação funcional.

## OBJETIVO

Conectar todas as telas ao Lovable Cloud e PostgreSQL.

Criar:

* banco

* migrations

* tabelas

* relacionamentos

* RLS

* autenticação

* Storage

* Edge Functions

* APIs internas

* validações

* logs

* permissões

---

# 45. BACKEND REAL

Criar o schema PostgreSQL.

Implementar foreign keys.

Implementar índices.

Implementar constraints.

Implementar timestamps.

Implementar soft delete onde apropriado.

Implementar RLS para todas as entidades multi-tenant.

---

# 46. STORAGE

Criar buckets para:

* logos

* fotos de clientes

* antes/depois

* documentos

* assinaturas

* anexos

As políticas devem impedir acesso indevido entre organizações.

---

# 47. REALTIME

Preparar Realtime para:

* alterações da agenda

* novos agendamentos

* alterações de status

* pagamentos

* notificações

---

# 48. EDGE FUNCTIONS

Criar estrutura para funções backend seguras.

Exemplos:

create-payment

process-payment-webhook

send-whatsapp

send-reminder

ai-assistant

generate-report

process-automation

Não colocar secrets no frontend.

---

# 49. IA COM SEGURANÇA

A IA nunca deve receber acesso irrestrito ao banco.

Criar camada intermediária.

Exemplo:

Usuário:

"Quanto faturei este mês?"

↓

Edge Function

↓

Validação do usuário

↓

Identificação da organization_id

↓

Consulta segura ao banco

↓

Dados agregados

↓

Modelo de IA

↓

Resposta

Nunca permitir que a IA escolha livremente uma organization_id.

---

# 50. CÁLCULOS IMPORTANTES

O backend deve calcular corretamente:

* faturamento

* ticket médio

* comissões

* saldo de pacotes

* estoque

* custo de atendimento

* contas a receber

* contas a pagar

* fluxo de caixa

Evitar cálculos críticos apenas no frontend.

---

# 51. AGENDAMENTO SEM CONFLITOS

Implementar validação real para impedir:

* profissional em dois atendimentos simultâneos

* sala duplicada

* equipamento duplicado

* horário bloqueado

* profissional indisponível

O backend deve validar o conflito mesmo que o frontend tente burlar.

---

# 52. CONSISTÊNCIA TRANSACIONAL

Ao concluir atendimento com pacote + pagamento + comissão + estoque:

usar transação quando aplicável.

Exemplo:

Atendimento concluído

↓

Registrar atendimento

↓

Consumir sessão

↓

Registrar venda

↓

Registrar pagamento

↓

Gerar comissão

↓

Baixar estoque

↓

Atualizar indicadores

Se uma operação crítica falhar, evitar estado parcialmente gravado.

---

# 53. NOTIFICAÇÕES

Criar sistema de notificações interno.

Exemplos:

* pacote acabando

* estoque baixo

* pagamento vencido

* novo agendamento

* cancelamento

* nova cliente

* fechamento de caixa

---

# 54. PERFORMANCE

Criar:

* índices adequados

* paginação

* filtros no banco

* busca eficiente

* queries agregadas

* lazy loading quando necessário

Não carregar milhares de clientes de uma vez.

---

# 55. RESPONSIVIDADE

A aplicação precisa funcionar muito bem em:

* celular

* tablet

* notebook

* desktop

A agenda deve ser especialmente bem adaptada para celular.

---

# 56. CRITÉRIOS DE ACEITE

O projeto somente deve ser considerado funcional quando:

1. Usuário consegue criar conta.

2. Usuário consegue criar sua clínica.

3. Dados ficam isolados por organização.

4. Usuário consegue cadastrar profissionais.

5. Usuário consegue cadastrar clientes.

6. Usuário consegue criar procedimentos personalizados.

7. Usuário consegue criar pacotes.

8. Usuário consegue criar agendamentos.

9. Agenda impede conflitos.

10. Cliente possui histórico.

11. Anamnese funciona.

12. Arquivos podem ser anexados.

13. Atendimento pode ser concluído.

14. Pacote desconta sessão corretamente.

15. Estoque pode ser baixado.

16. Comissão é calculada.

17. Venda é registrada.

18. Pagamento é registrado.

19. Caixa funciona.

20. Dashboard utiliza dados reais.

21. Permissões funcionam.

22. RLS funciona.

23. Página pública de agendamento funciona.

24. Personalização da clínica funciona.

25. Aplicação funciona em mobile.

---

# 57. REGRA FUNDAMENTAL DE IMPLEMENTAÇÃO

Não simplesmente criar todas as telas e considerar o projeto concluído.

Construir em camadas:

1. Banco

2. Segurança

3. Autenticação

4. Multi-tenancy

5. Backend

6. Serviços

7. Frontend

8. Integrações

9. IA

10. Testes

Sempre que uma tela possuir dados, conectá-la ao backend real.

---

# 58. RESULTADO ESPERADO

Ao final, quero uma plataforma SaaS real para clínicas de estética.

A profissional deve conseguir:

Criar sua conta

↓

Personalizar sua clínica

↓

Cadastrar profissionais

↓

Criar seus próprios procedimentos

↓

Cadastrar clientes

↓

Criar anamneses

↓

Organizar agenda

↓

Receber agendamentos online

↓

Atender

↓

Controlar pacotes

↓

Receber pagamentos

↓

Controlar estoque

↓

Calcular comissões

↓

Acompanhar financeiro

↓

Fazer relacionamento com clientes

↓

Consultar relatórios

↓

Usar IA para entender o negócio.

O sistema deve ser construído pensando em produto comercial real, escalável e seguro, e não como demonstração ou protótipo descartável.

Antes de implementar alterações estruturais importantes, analise as dependências entre banco, backend, segurança e frontend para evitar retrabalho.

Priorize arquitetura correta, isolamento multi-tenant, segurança, consistência dos dados e experiência do usuário.

# PRD COMPLETO — SAAS DE GESTÃO PARA CLÍNICAS DE ESTÉTICA

## 1. VISÃO DO PRODUTO

Crie um SaaS completo, moderno, responsivo e mobile-first para gestão de clínicas de estética, esteticistas, profissionais de beleza e pequenos espaços de atendimento.

O sistema deve centralizar:

* Agenda

* Clientes

* Anamnese digital

* Prontuário/histórico

* Procedimentos

* Pacotes e sessões

* Profissionais

* Agendamento online

* Financeiro

* Caixa

* Pix

* Contas a pagar e receber

* Estoque

* Insumos

* Comissões

* Relatórios

* CRM

* WhatsApp e automações

* Personalização da clínica

* Assistente de Inteligência Artificial

O produto deve ser construído como um verdadeiro SaaS multi-tenant.

NÃO criar somente telas estáticas.

NÃO usar dados mockados como solução definitiva.

A aplicação deve ser preparada para funcionamento real através do Lovable Cloud/Backend.

---

# 2. OBJETIVO

Criar uma plataforma que substitua:

* agenda de papel

* planilhas

* fichas de anamnese impressas

* controles manuais de pacotes

* controles financeiros separados

* sistemas de estoque

* ferramentas de CRM

* comunicação manual com clientes

A proposta do produto é:

## "Tudo o que sua clínica precisa para atender, organizar e crescer em um só lugar."

O sistema deve ser extremamente simples para uma profissional autônoma, mas suficientemente robusto para uma clínica com vários profissionais.

---

# 3. PÚBLICO-ALVO

Prioridade inicial:

* esteticistas

* clínicas de estética

* profissionais autônomas

* biomédicas

* espaços de estética

* clínicas pequenas e médias

A arquitetura deve permitir futuramente expansão para:

* salão de beleza

* barbearia

* massoterapia

* fisioterapia

* podologia

* manicure

* depilação

* tatuagem

* outros negócios de atendimento por horário.

---

# 4. POSICIONAMENTO

Não criar aparência de software antigo ou sistema empresarial complexo.

O produto deve transmitir:

* moderno

* elegante

* premium

* confiável

* simples

* organizado

* profissional

* tecnológico

A experiência deve ser parecida com produtos SaaS modernos.

Mobile-first, mas excelente também em desktop.

---

# 5. ARQUITETURA MULTI-TENANT

Esta é uma exigência FUNDAMENTAL.

Cada clínica/profissional deve possuir uma organização independente.

Estrutura:

PLATAFORMA

→ Organização/Clínica

→ Usuários

→ Profissionais

→ Clientes

→ Procedimentos

→ Pacotes

→ Agenda

→ Financeiro

→ Estoque

→ Documentos

→ Configurações

Cada registro pertencente a uma clínica deve possuir:

organization_id

NUNCA permitir que uma organização visualize dados de outra.

Utilizar PostgreSQL com Row Level Security (RLS).

Toda consulta ao banco deve respeitar a organização autenticada.

---

# 6. AUTENTICAÇÃO

Implementar autenticação real.

Possibilidades:

* e-mail e senha

* recuperação de senha

* sessão persistente

* logout

* proteção de rotas

* controle de acesso

Estrutura de usuários vinculada à organização.

Um usuário pode ter uma função/perfil dentro da clínica.

---

# 7. ONBOARDING

Ao criar uma conta, conduzir a profissional por um onboarding simples.

Etapas:

1. Nome da clínica

2. Nome da profissional

3. Logo

4. WhatsApp

5. Instagram

6. Telefone

7. Endereço

8. Cor principal

9. Primeiro procedimento

10. Primeiro horário de atendimento

Ao terminar, abrir o Dashboard.

Criar alguns dados iniciais somente se a usuária optar por utilizar exemplos.

---

# 8. PERSONALIZAÇÃO DA CLÍNICA

A profissional deve conseguir personalizar sua conta.

Configurações:

* nome da clínica

* razão social

* logo

* favicon

* imagem de capa

* descrição

* telefone

* WhatsApp

* Instagram

* endereço

* cidade

* estado

* CEP

* cor principal

* cor secundária

* horário de funcionamento

* link público de agendamento

O sistema deve utilizar automaticamente a identidade visual cadastrada.

---

# 9. PROCEDIMENTOS

NÃO criar uma lista fixa de procedimentos.

Cada clínica deve poder criar seus próprios procedimentos livremente.

Campos:

* nome

* categoria

* descrição

* duração em minutos

* preço

* preço promocional

* comissão

* tipo de comissão

* foto

* ativo/inativo

* disponível para agendamento online

* intervalo/buffer após atendimento

Exemplos:

* Limpeza de Pele

* Drenagem Linfática

* Criolipólise

* Eletrolipólise

* Massagem Modeladora

* Microagulhamento

* Laser

* Botox

* Preenchimento

Mas a profissional deve poder criar qualquer outro procedimento.

---

# 10. PROFISSIONAIS

Cadastro:

* nome

* foto

* telefone

* e-mail

* especialidade

* procedimentos realizados

* comissão padrão

* horários de atendimento

* dias de trabalho

* ativo/inativo

Cada profissional pode possuir login individual.

---

# 11. CLIENTES

Criar módulo completo de clientes.

Campos:

* nome

* CPF

* data de nascimento

* telefone

* WhatsApp

* e-mail

* endereço

* observações

* tags

* origem

* data do cadastro

Histórico:

* agendamentos

* atendimentos

* procedimentos

* pacotes

* pagamentos

* documentos

* anamneses

* fotos

* evolução

* observações

Permitir:

* editar

* excluir

* anexar arquivos

* visualizar

* imprimir

* pesquisar

* filtrar

---

# 12. ANAMNESE DIGITAL

Criar sistema de anamnese configurável.

A clínica deve poder criar seus próprios formulários.

Tipos de campos:

* texto

* texto longo

* sim/não

* múltipla escolha

* seleção

* checkbox

* data

* número

* assinatura

* upload de imagem

* upload de documento

Exemplos:

"Queixa principal"

"Histórico de saúde"

"Está em tratamento médico?"

"Utiliza medicamentos?"

"Possui alergias?"

A profissional poderá criar perguntas específicas para cada procedimento.

A anamnese deve ficar vinculada ao cliente e ao atendimento.

---

# 13. ASSINATURA ELETRÔNICA

Permitir assinatura digital em:

* anamnese

* termos

* contratos

* documentos

Registrar:

* assinatura

* data

* horário

* usuário

* documento relacionado

---

# 14. FOTOS ANTES E DEPOIS

Permitir upload de fotos.

Organizar por:

* cliente

* procedimento

* atendimento

* data

Mostrar comparação antes/depois.

Controlar acesso às imagens.

---

# 15. AGENDA

Criar agenda profissional moderna.

Views:

* Dia

* Semana

* Mês

Filtros:

* profissional

* sala

* equipamento

* procedimento

Cada agendamento deve mostrar:

* cliente

* procedimento

* profissional

* horário

* duração

* status

* pagamento

* pacote

Status:

* agendado

* confirmado

* aguardando

* atendido

* cancelado

* faltou

* reagendado

---

# 16. BLOQUEIOS

Permitir bloqueios:

* ausência

* férias

* almoço

* reunião

* manutenção

* sala indisponível

* equipamento indisponível

* horário particular

O sistema nunca deve permitir conflito de horários.

---

# 17. AGENDAMENTO ONLINE

Criar página pública exclusiva para cada clínica.

URL:

/agendar/{booking_slug}

A página deve mostrar:

* logo

* nome

* descrição

* telefone

* WhatsApp

* Instagram

* endereço

* procedimentos

* profissionais

* horários disponíveis

A cliente seleciona:

1. procedimento

2. profissional

3. data

4. horário

5. nome

6. telefone

7. WhatsApp

8. e-mail

Depois confirma.

---

# 18. PAGAMENTO NO AGENDAMENTO

Preparar arquitetura para Pix.

Possibilidades:

* pagamento integral

* sinal

* pagamento opcional

Exibir:

* valor

* QR Code

* Pix copia e cola

* status do pagamento

Estados:

* aguardando pagamento

* pago

* expirado

* cancelado

O agendamento poderá ficar reservado por determinado período enquanto aguarda pagamento.

---

# 19. PACOTES

Permitir criar pacotes.

Exemplo:

"Pacote Laser 10 Sessões"

* 10 sessões

* validade

* preço

O sistema deve controlar:

* sessões contratadas

* sessões utilizadas

* sessões restantes

* validade

* pagamentos

* profissionais

* procedimentos associados

Ao concluir atendimento utilizando pacote:

10 → 9 → 8...

Nunca permitir saldo negativo.

Alertar quando:

* restarem poucas sessões

* pacote estiver próximo de vencer

* pacote estiver vencido

---

# 20. ATENDIMENTO

Ao abrir um agendamento:

mostrar:

* dados da cliente

* anamnese

* histórico

* pacote

* procedimento

* observações

* fotos

* evolução

Botão:

"Concluir atendimento"

Ao concluir:

* registrar atendimento

* consumir sessão do pacote quando aplicável

* registrar pagamento quando aplicável

* gerar comissão

* baixar estoque

* atualizar histórico

* atualizar indicadores

---

# 21. FINANCEIRO

Criar módulo financeiro completo.

### Vendas

* cliente

* procedimento

* pacote

* profissional

* valor

* desconto

* acréscimo

* comissão

* custo

* lucro estimado

### Formas de pagamento

* Pix

* cartão de crédito

* cartão de débito

* dinheiro

* transferência

* outros

---

# 22. CAIXA

Operações:

* abertura

* resumo

* suprimento

* sangria

* venda

* despesa

* fechamento

Mostrar:

* saldo inicial

* entradas

* saídas

* saldo esperado

* saldo informado

* diferença

---

# 23. CONTAS A RECEBER

Campos:

* cliente

* descrição

* valor

* vencimento

* parcela

* status

Status:

* pendente

* vencido

* pago

* cancelado

Permitir registrar baixa.

---

# 24. CONTAS A PAGAR

Campos:

* fornecedor

* descrição

* categoria

* valor

* vencimento

* recorrência

* status

---

# 25. ESTOQUE

Criar:

* produtos

* insumos

* categorias

* unidade de medida

* estoque mínimo

* custo

* preço de venda

Movimentações:

* entrada

* saída

* ajuste

* perda

* consumo por procedimento

---

# 26. CONSUMO AUTOMÁTICO DE INSUMOS

Permitir associar produtos aos procedimentos.

Exemplo:

Limpeza de Pele:

* 1 luva

* 2 gazes

* 5 ml produto X

Ao concluir atendimento:

baixar automaticamente os itens.

Registrar custo do atendimento.

---

# 27. COMISSÕES

Permitir comissão:

* percentual

* valor fixo

Por:

* procedimento

* pacote

* produto

Calcular:

* comissão bruta

* descontos

* comissão líquida

* comissão pendente

* comissão paga

Cada profissional pode visualizar apenas suas próprias informações, conforme permissões.

---

# 28. DASHBOARD

Criar dashboard elegante.

Cards:

* faturamento hoje

* faturamento do mês

* agendamentos hoje

* clientes atendidas

* contas a receber

* contas vencidas

* sessões realizadas

* ticket médio

Gráficos:

### Fluxo de caixa

Recebimentos × Pagamentos

### Faturamento

Evolução diária/mensal

### Procedimentos

Distribuição de receita

### Profissionais

Faturamento por profissional

### Clientes

Novas × recorrentes

---

# 29. CRM

Criar módulo de relacionamento.

Segmentos:

* clientes novas

* clientes recorrentes

* clientes VIP

* clientes inativas

* clientes aniversariantes

* clientes com pacote acabando

* clientes com pagamento pendente

Mostrar:

* última visita

* próxima visita

* frequência

* ticket médio

* total gasto

---

# 30. AUTOMAÇÕES

Criar arquitetura preparada para automações.

Eventos:

* novo agendamento

* confirmação

* cancelamento

* atendimento concluído

* pacote próximo do fim

* cliente sem retorno

* aniversário

* pagamento pendente

* pagamento vencido

Exemplos:

24 horas antes:

"Olá, Maria! Seu atendimento está confirmado para amanhã às 15h."

30 dias após procedimento:

"Olá, Maria! Já está na hora de programar seu próximo atendimento."

---

# 31. WHATSAPP

Criar arquitetura preparada para integração com WhatsApp.

NÃO simular uma integração como se fosse real.

Quando a integração ainda não estiver configurada, mostrar estado:

"WhatsApp não conectado."

Preparar:

* templates

* variáveis

* mensagens automáticas

* confirmação

* lembretes

* retorno

* cobrança

---

# 32. ASSISTENTE DE IA

Criar módulo:

## Assistente IA

A IA deve conseguir responder perguntas sobre os dados da própria clínica.

Exemplos:

"Quanto faturei este mês?"

"Qual procedimento vendeu mais?"

"Qual profissional faturou mais?"

"Quais clientes estão há mais de 60 dias sem retornar?"

"Quais pacotes estão acabando?"

"Quanto tenho para receber?"

"Qual foi meu ticket médio?"

A IA deve consultar apenas os dados da organização autenticada.

Nunca permitir vazamento de dados entre organizações.

Preparar arquitetura para usar Edge Functions como camada segura entre o frontend e o provedor de IA.

---

# 33. PERMISSÕES

Criar sistema de RBAC.

Perfis padrão:

### Proprietária/Admin

Acesso total.

### Gerente

Acesso administrativo conforme permissões.

### Recepção

Agenda + clientes + agendamento.

### Profissional

Própria agenda + clientes autorizadas + atendimento + anamnese.

Permissões granulares:

* dashboard

* agenda

* clientes

* profissionais

* procedimentos

* pacotes

* anamnese

* financeiro

* caixa

* contas a pagar

* contas a receber

* estoque

* comissões

* relatórios

* configurações

* usuários

* IA

---

# 34. BANCO DE DADOS

Utilizar PostgreSQL.

Criar migrations reais.

Principais tabelas:

organizations

profiles

roles

permissions

role_permissions

user_roles

professionals

clients

client_files

anamnesis_templates

anamnesis_questions

anamnesis_responses

anamnesis_signatures

services

service_categories

packages

package_items

client_packages

appointments

appointment_status_history

calendar_blocks

rooms

equipment

sales

sale_items

payments

cash_registers

cash_transactions

accounts_receivable

accounts_payable

financial_accounts

products

inventory_movements

service_products

commission_rules

commission_entries

automations

message_templates

notification_logs

ai_conversations

ai_messages

subscriptions

subscription_events

audit_logs

Todas as tabelas que pertencem a uma clínica devem possuir organization_id.

---

# 35. SEGURANÇA

Implementar:

* RLS

* autenticação

* autorização

* proteção de rotas

* validação de dados

* políticas de Storage

* isolamento multi-tenant

* logs de auditoria

Dados de clientes e documentos devem ser protegidos.

Nunca expor chaves secretas no frontend.

Credenciais de APIs devem ficar em Secrets/Edge Functions.

---

# 36. LGPD

Preparar sistema para LGPD.

Implementar:

* controle de acesso

* registro de consentimento quando necessário

* histórico de alterações

* exclusão de dados conforme regras aplicáveis

* exportação de dados

* controle de documentos

* privacidade de anamneses

* auditoria

---

# 37. AUDITORIA

Criar `audit_logs`.

Registrar ações importantes:

* login

* criação

* edição

* exclusão

* alteração de cliente

* alteração de prontuário

* alteração financeira

* alteração de permissões

* fechamento de caixa

Registrar:

* usuário

* organização

* ação

* entidade

* registro

* data/hora

---

# 38. ASSINATURAS DO SAAS

Preparar estrutura para planos.

Exemplo inicial:

### Essencial

R$ 29,90/mês

### Profissional

R$ 49,90/mês

### Clínica

R$ 79,90/mês

### Premium

R$ 119,90/mês

Os limites devem ser configuráveis.

Criar tabelas:

plans

subscriptions

subscription_events

Não implementar cobrança real até a etapa específica de integração.

---

# 39. ADMINISTRADOR DA PLATAFORMA

Preparar área Master/Admin separada.

O administrador da plataforma poderá visualizar:

* clínicas cadastradas

* usuários

* planos

* assinaturas

* faturamento

* status

* trial

* métricas

Também poderá:

* suspender

* reativar

* visualizar organização

* alterar plano

Nunca permitir que o usuário comum acesse essa área.

---

# 40. DESIGN

Criar uma interface premium.

Diretrizes:

* clean

* elegante

* moderna

* bastante espaço em branco

* cards discretos

* tipografia profissional

* ícones consistentes

* ótima experiência mobile

* navegação simples

Não exagerar em gradientes.

Evitar aparência de template genérico.

A aplicação deve parecer um SaaS comercial pronto para ser vendido.

---

# 41. NAVEGAÇÃO

Sidebar desktop:

Dashboard

Agenda

Clientes

Atendimentos

Procedimentos

Pacotes

Profissionais

Financeiro

Estoque

Comissões

CRM

Relatórios

Assistente IA

Configurações

No mobile utilizar navegação inferior ou menu adaptado.

---

# 42. ESTADOS DA INTERFACE

Todas as telas devem possuir:

* loading

* empty state

* erro

* sucesso

* confirmação

* skeleton loading

Não deixar telas quebradas quando não houver dados.

Exemplo:

"Você ainda não possui procedimentos cadastrados."

Botão:

"+ Criar procedimento"

---

# 43. DADOS MOCKADOS

Durante o desenvolvimento visual, dados mockados podem ser utilizados temporariamente.

PORÉM:

Todo dado funcional deve posteriormente ser conectado ao PostgreSQL.

Não criar lógica que dependa permanentemente de arrays locais ou localStorage.

O banco deve ser a fonte de verdade.

---

# 44. PARTE 2 — INTELIGÊNCIA E BACKEND

Agora transforme o protótipo em aplicação funcional.

## OBJETIVO

Conectar todas as telas ao Lovable Cloud e PostgreSQL.

Criar:

* banco

* migrations

* tabelas

* relacionamentos

* RLS

* autenticação

* Storage

* Edge Functions

* APIs internas

* validações

* logs

* permissões

---

# 45. BACKEND REAL

Criar o schema PostgreSQL.

Implementar foreign keys.

Implementar índices.

Implementar constraints.

Implementar timestamps.

Implementar soft delete onde apropriado.

Implementar RLS para todas as entidades multi-tenant.

---

# 46. STORAGE

Criar buckets para:

* logos

* fotos de clientes

* antes/depois

* documentos

* assinaturas

* anexos

As políticas devem impedir acesso indevido entre organizações.

---

# 47. REALTIME

Preparar Realtime para:

* alterações da agenda

* novos agendamentos

* alterações de status

* pagamentos

* notificações

---

# 48. EDGE FUNCTIONS

Criar estrutura para funções backend seguras.

Exemplos:

create-payment

process-payment-webhook

send-whatsapp

send-reminder

ai-assistant

generate-report

process-automation

Não colocar secrets no frontend.

---

# 49. IA COM SEGURANÇA

A IA nunca deve receber acesso irrestrito ao banco.

Criar camada intermediária.

Exemplo:

Usuário:

"Quanto faturei este mês?"

↓

Edge Function

↓

Validação do usuário

↓

Identificação da organization_id

↓

Consulta segura ao banco

↓

Dados agregados

↓

Modelo de IA

↓

Resposta

Nunca permitir que a IA escolha livremente uma organization_id.

---

# 50. CÁLCULOS IMPORTANTES

O backend deve calcular corretamente:

* faturamento

* ticket médio

* comissões

* saldo de pacotes

* estoque

* custo de atendimento

* contas a receber

* contas a pagar

* fluxo de caixa

Evitar cálculos críticos apenas no frontend.

---

# 51. AGENDAMENTO SEM CONFLITOS

Implementar validação real para impedir:

* profissional em dois atendimentos simultâneos

* sala duplicada

* equipamento duplicado

* horário bloqueado

* profissional indisponível

O backend deve validar o conflito mesmo que o frontend tente burlar.

---

# 52. CONSISTÊNCIA TRANSACIONAL

Ao concluir atendimento com pacote + pagamento + comissão + estoque:

usar transação quando aplicável.

Exemplo:

Atendimento concluído

↓

Registrar atendimento

↓

Consumir sessão

↓

Registrar venda

↓

Registrar pagamento

↓

Gerar comissão

↓

Baixar estoque

↓

Atualizar indicadores

Se uma operação crítica falhar, evitar estado parcialmente gravado.

---

# 53. NOTIFICAÇÕES

Criar sistema de notificações interno.

Exemplos:

* pacote acabando

* estoque baixo

* pagamento vencido

* novo agendamento

* cancelamento

* nova cliente

* fechamento de caixa

---

# 54. PERFORMANCE

Criar:

* índices adequados

* paginação

* filtros no banco

* busca eficiente

* queries agregadas

* lazy loading quando necessário

Não carregar milhares de clientes de uma vez.

---

# 55. RESPONSIVIDADE

A aplicação precisa funcionar muito bem em:

* celular

* tablet

* notebook

* desktop

A agenda deve ser especialmente bem adaptada para celular.

---

# 56. CRITÉRIOS DE ACEITE

O projeto somente deve ser considerado funcional quando:

1. Usuário consegue criar conta.

2. Usuário consegue criar sua clínica.

3. Dados ficam isolados por organização.

4. Usuário consegue cadastrar profissionais.

5. Usuário consegue cadastrar clientes.

6. Usuário consegue criar procedimentos personalizados.

7. Usuário consegue criar pacotes.

8. Usuário consegue criar agendamentos.

9. Agenda impede conflitos.

10. Cliente possui histórico.

11. Anamnese funciona.

12. Arquivos podem ser anexados.

13. Atendimento pode ser concluído.

14. Pacote desconta sessão corretamente.

15. Estoque pode ser baixado.

16. Comissão é calculada.

17. Venda é registrada.

18. Pagamento é registrado.

19. Caixa funciona.

20. Dashboard utiliza dados reais.

21. Permissões funcionam.

22. RLS funciona.

23. Página pública de agendamento funciona.

24. Personalização da clínica funciona.

25. Aplicação funciona em mobile.

---

# 57. REGRA FUNDAMENTAL DE IMPLEMENTAÇÃO

Não simplesmente criar todas as telas e considerar o projeto concluído.

Construir em camadas:

1. Banco

2. Segurança

3. Autenticação

4. Multi-tenancy

5. Backend

6. Serviços

7. Frontend

8. Integrações

9. IA

10. Testes

Sempre que uma tela possuir dados, conectá-la ao backend real.

---

# 58. RESULTADO ESPERADO

Ao final, quero uma plataforma SaaS real para clínicas de estética.

A profissional deve conseguir:

Criar sua conta

↓

Personalizar sua clínica

↓

Cadastrar profissionais

↓

Criar seus próprios procedimentos

↓

Cadastrar clientes

↓

Criar anamneses

↓

Organizar agenda

↓

Receber agendamentos online

↓

Atender

↓

Controlar pacotes

↓

Receber pagamentos

↓

Controlar estoque

↓

Calcular comissões

↓

Acompanhar financeiro

↓

Fazer relacionamento com clientes

↓

Consultar relatórios

↓

Usar IA para entender o negócio.

O sistema deve ser construído pensando em produto comercial real, escalável e seguro, e não como demonstração ou protótipo descartável.

Antes de implementar alterações estruturais importantes, analise as dependências entre banco, backend, segurança e frontend para evitar retrabalho.

Priorize arquitetura correta, isolamento multi-tenant, segurança, consistência dos dados e experiência do usuário.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a890cddf-5dd7-46aa-aef8-8d5909f97987).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
