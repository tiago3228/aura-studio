-- Hardening da integridade de aceite e assinatura.
--
-- As tabelas abaixo devem ser gravadas somente pelas Edge Functions usando
-- service_role. Usuários autenticados mantêm apenas leitura via RLS.
-- A migration é idempotente e não remove dados existentes.

-- Remover policies de escrita direta do cliente autenticado.
drop policy if exists contract_term_acceptances_create
  on public.contract_term_acceptances;

drop policy if exists contract_term_acceptances_update
  on public.contract_term_acceptances;

drop policy if exists contract_term_acceptances_delete
  on public.contract_term_acceptances;

drop policy if exists signature_verifications_create
  on public.signature_verifications;

drop policy if exists signature_verifications_update
  on public.signature_verifications;

drop policy if exists signature_verifications_delete
  on public.signature_verifications;

-- Reforçar os privilégios SQL, além do RLS.
-- service_role não é afetado por estes REVOKE e continua sendo usado pelas
-- Edge Functions para gravar os resultados do fluxo público.
revoke insert, update, delete
  on table public.contract_term_acceptances
  from anon, authenticated;

revoke insert, update, delete
  on table public.signature_verifications
  from anon, authenticated;

-- Garantir que as policies de leitura permaneçam explícitas e idempotentes.
drop policy if exists contract_term_acceptances_read
  on public.contract_term_acceptances;

create policy contract_term_acceptances_read
  on public.contract_term_acceptances
  for select
  to authenticated
  using (
    public.has_org_permission(
      organization_id,
      'contratos.ver'
    )
  );

drop policy if exists signature_verifications_read
  on public.signature_verifications;

create policy signature_verifications_read
  on public.signature_verifications
  for select
  to authenticated
  using (
    public.has_org_permission(
      organization_id,
      'contratos.ver'
    )
  );

comment on table public.contract_term_acceptances is
  'Aceites de termos gravados exclusivamente pelo fluxo seguro de assinatura.';

comment on table public.signature_verifications is
  'Validações de assinatura gravadas exclusivamente pelo fluxo seguro de assinatura.';
