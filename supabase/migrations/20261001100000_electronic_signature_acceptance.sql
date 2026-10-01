-- Fase 3: assinatura eletrônica, validação biométrica e termos de aceite.
--
-- Privacidade: esta migration não armazena imagem facial, impressão digital,
-- template biométrico ou qualquer dado biométrico bruto. O banco guarda apenas
-- o resultado da validação, hashes, referências externas e metadados mínimos.
-- A validação pública deve ser executada por uma Edge Function/backend seguro;
-- não devem ser expostos tokens de provedor no cliente.

create table if not exists public.acceptance_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 200),
  summary text,
  content text not null check (char_length(trim(content)) >= 1),
  version integer not null default 1 check (version > 0),
  content_hash text not null check (char_length(trim(content_hash)) between 32 and 256),
  active boolean not null default true,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug, version)
);

create unique index if not exists acceptance_terms_active_slug_uidx
  on public.acceptance_terms (organization_id, slug)
  where active;

create index if not exists acceptance_terms_org_active_idx
  on public.acceptance_terms (organization_id, active, published_at desc);

create table if not exists public.contract_term_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.client_contracts(id) on delete cascade,
  term_id uuid not null references public.acceptance_terms(id) on delete restrict,
  term_version integer not null,
  term_content_hash text not null check (char_length(trim(term_content_hash)) between 32 and 256),
  accepted boolean not null default false,
  accepted_at timestamptz,
  revoked_at timestamptz,
  signer_name text,
  signer_document text,
  signer_email text,
  signer_phone text,
  acceptance_token_hash text,
  ip_hash text,
  user_agent text,
  evidence_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, term_id, term_version),
  check (accepted = false or accepted_at is not null),
  check (revoked_at is null or accepted = true)
);

create index if not exists contract_term_acceptances_contract_idx
  on public.contract_term_acceptances (contract_id, accepted_at desc);

create index if not exists contract_term_acceptances_org_idx
  on public.contract_term_acceptances (organization_id, accepted, accepted_at desc);

create table if not exists public.signature_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.client_contracts(id) on delete cascade,
  acceptance_id uuid references public.contract_term_acceptances(id) on delete set null,
  verification_type text not null
    check (verification_type in ('assinatura', 'biometria', 'liveness', 'otp', 'documento')),
  method text not null
    check (method in ('desenhada', 'digitada', 'biometria_facial', 'impressao_digital', 'liveness', 'otp', 'documento', 'provedor_externo')),
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'aprovada', 'reprovada', 'expirada', 'cancelada', 'erro')),
  provider text,
  provider_reference text,
  request_id text,
  document_hash text,
  signature_hash text,
  biometric_template_hash text,
  evidence_storage_path text,
  match_score numeric(5,2) check (match_score is null or match_score between 0 and 100),
  liveness_score numeric(5,2) check (liveness_score is null or liveness_score between 0 and 100),
  signer_name text,
  signer_document text,
  signer_email text,
  ip_hash text,
  user_agent text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  failure_code text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('aprovada') or verified_at is not null),
  check (status not in ('reprovada', 'erro') or failure_reason is not null)
);

create index if not exists signature_verifications_contract_idx
  on public.signature_verifications (contract_id, created_at desc);

create index if not exists signature_verifications_org_status_idx
  on public.signature_verifications (organization_id, status, created_at desc);

create unique index if not exists signature_verifications_provider_ref_uidx
  on public.signature_verifications (provider, provider_reference)
  where provider is not null and provider_reference is not null;

-- Impede que contrato, termo e aceite sejam misturados entre organizações.
create or replace function public.validate_acceptance_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contract_organization_id uuid;
  term_organization_id uuid;
begin
  select c.organization_id
    into contract_organization_id
    from public.client_contracts c
   where c.id = new.contract_id;

  if contract_organization_id is null or contract_organization_id <> new.organization_id then
    raise exception 'O contrato não pertence à organização do aceite.';
  end if;

  select t.organization_id
    into term_organization_id
    from public.acceptance_terms t
   where t.id = new.term_id;

  if term_organization_id is null or term_organization_id <> new.organization_id then
    raise exception 'O termo não pertence à organização do aceite.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_signature_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contract_organization_id uuid;
  acceptance_organization_id uuid;
begin
  select c.organization_id
    into contract_organization_id
    from public.client_contracts c
   where c.id = new.contract_id;

  if contract_organization_id is null or contract_organization_id <> new.organization_id then
    raise exception 'O contrato não pertence à organização da validação.';
  end if;

  if new.acceptance_id is not null then
    select a.organization_id
      into acceptance_organization_id
      from public.contract_term_acceptances a
     where a.id = new.acceptance_id;

    if acceptance_organization_id is null or acceptance_organization_id <> new.organization_id then
      raise exception 'O aceite não pertence à organização da validação.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_contract_term_acceptance_organization on public.contract_term_acceptances;
create trigger validate_contract_term_acceptance_organization
before insert or update on public.contract_term_acceptances
for each row
execute function public.validate_acceptance_organization();

drop trigger if exists validate_signature_verification_organization on public.signature_verifications;
create trigger validate_signature_verification_organization
before insert or update on public.signature_verifications
for each row
execute function public.validate_signature_organization();

-- A Fase 2 criou o histórico com eventos de contrato. A Fase 3 acrescenta
-- eventos específicos de aceite e validação sem criar uma segunda auditoria.
alter table public.contract_events
  drop constraint if exists contract_events_event_type_check;

alter table public.contract_events
  add constraint contract_events_event_type_check
  check (event_type in (
    'criado',
    'enviado',
    'visualizado',
    'assinado',
    'recusado',
    'cancelado',
    'expirado',
    'status_alterado',
    'atualizado',
    'termo_registrado',
    'termo_aceito',
    'termo_revogado',
    'termo_atualizado',
    'assinatura_validada',
    'assinatura_reprovada',
    'assinatura_expirada',
    'assinatura_cancelada',
    'assinatura_com_erro',
    'assinatura_processada'
  ));

-- Mantém timestamps consistentes com as demais entidades do Aura.
drop trigger if exists acceptance_terms_updated_at on public.acceptance_terms;
create trigger acceptance_terms_updated_at
before update on public.acceptance_terms
for each row
execute function public.set_updated_at();

drop trigger if exists contract_term_acceptances_updated_at on public.contract_term_acceptances;
create trigger contract_term_acceptances_updated_at
before update on public.contract_term_acceptances
for each row
execute function public.set_updated_at();

drop trigger if exists signature_verifications_updated_at on public.signature_verifications;
create trigger signature_verifications_updated_at
before update on public.signature_verifications
for each row
execute function public.set_updated_at();

-- Registra aceite e validação no histórico central do contrato.
create or replace function public.record_signature_acceptance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
  event_metadata jsonb;
begin
  if tg_table_name = 'contract_term_acceptances' then
    event_name := case
      when tg_op = 'INSERT' and new.accepted then 'termo_aceito'
      when tg_op = 'INSERT' then 'termo_registrado'
      when tg_op <> 'INSERT' and old.accepted is distinct from new.accepted and new.accepted then 'termo_aceito'
      when tg_op <> 'INSERT' and old.revoked_at is distinct from new.revoked_at and new.revoked_at is not null then 'termo_revogado'
      else 'termo_atualizado'
    end;
    event_metadata := jsonb_build_object(
      'term_id', new.term_id,
      'term_version', new.term_version,
      'term_content_hash', new.term_content_hash,
      'accepted', new.accepted
    );
  else
    event_name := case new.status
      when 'aprovada' then 'assinatura_validada'
      when 'reprovada' then 'assinatura_reprovada'
      when 'expirada' then 'assinatura_expirada'
      when 'cancelada' then 'assinatura_cancelada'
      when 'erro' then 'assinatura_com_erro'
      else 'assinatura_processada'
    end;
    event_metadata := jsonb_build_object(
      'verification_id', new.id,
      'verification_type', new.verification_type,
      'method', new.method,
      'status', new.status,
      'provider', new.provider,
      'document_hash', new.document_hash,
      'signature_hash', new.signature_hash,
      'match_score', new.match_score,
      'liveness_score', new.liveness_score,
      'failure_code', new.failure_code
    );
  end if;

  insert into public.contract_events (
    organization_id,
    contract_id,
    event_type,
    actor_user_id,
    metadata
  ) values (
    new.organization_id,
    new.contract_id,
    event_name,
    coalesce(auth.uid(), new.created_by),
    event_metadata
  );

  return new;
end;
$$;

drop trigger if exists record_term_acceptance_event on public.contract_term_acceptances;
create trigger record_term_acceptance_event
after insert or update on public.contract_term_acceptances
for each row
execute function public.record_signature_acceptance_event();

drop trigger if exists record_signature_verification_event on public.signature_verifications;
create trigger record_signature_verification_event
after insert or update on public.signature_verifications
for each row
execute function public.record_signature_acceptance_event();

alter table public.acceptance_terms enable row level security;
alter table public.contract_term_acceptances enable row level security;
alter table public.signature_verifications enable row level security;

grant select, insert, update, delete on public.acceptance_terms to authenticated;
grant select, insert, update, delete on public.contract_term_acceptances to authenticated;
grant select, insert, update on public.signature_verifications to authenticated;
grant all on public.acceptance_terms, public.contract_term_acceptances, public.signature_verifications to service_role;

drop policy if exists acceptance_terms_read on public.acceptance_terms;
drop policy if exists acceptance_terms_create on public.acceptance_terms;
drop policy if exists acceptance_terms_update on public.acceptance_terms;
drop policy if exists acceptance_terms_delete on public.acceptance_terms;

create policy acceptance_terms_read
on public.acceptance_terms for select to authenticated
using (public.has_org_permission(organization_id, 'contratos.ver'));

create policy acceptance_terms_create
on public.acceptance_terms for insert to authenticated
with check (
  public.has_org_permission(organization_id, 'contratos.editar')
  and (created_by is null or created_by = auth.uid())
);

create policy acceptance_terms_update
on public.acceptance_terms for update to authenticated
using (public.has_org_permission(organization_id, 'contratos.editar'))
with check (public.has_org_permission(organization_id, 'contratos.editar'));

create policy acceptance_terms_delete
on public.acceptance_terms for delete to authenticated
using (public.has_org_permission(organization_id, 'contratos.excluir'));

drop policy if exists contract_term_acceptances_read on public.contract_term_acceptances;
drop policy if exists contract_term_acceptances_create on public.contract_term_acceptances;
drop policy if exists contract_term_acceptances_update on public.contract_term_acceptances;
drop policy if exists contract_term_acceptances_delete on public.contract_term_acceptances;

create policy contract_term_acceptances_read
on public.contract_term_acceptances for select to authenticated
using (public.has_org_permission(organization_id, 'contratos.ver'));

create policy contract_term_acceptances_create
on public.contract_term_acceptances for insert to authenticated
with check (public.has_org_permission(organization_id, 'contratos.editar'));

create policy contract_term_acceptances_update
on public.contract_term_acceptances for update to authenticated
using (public.has_org_permission(organization_id, 'contratos.editar'))
with check (public.has_org_permission(organization_id, 'contratos.editar'));

create policy contract_term_acceptances_delete
on public.contract_term_acceptances for delete to authenticated
using (public.has_org_permission(organization_id, 'contratos.excluir'));

drop policy if exists signature_verifications_read on public.signature_verifications;
drop policy if exists signature_verifications_create on public.signature_verifications;
drop policy if exists signature_verifications_update on public.signature_verifications;

create policy signature_verifications_read
on public.signature_verifications for select to authenticated
using (public.has_org_permission(organization_id, 'contratos.ver'));

create policy signature_verifications_create
on public.signature_verifications for insert to authenticated
with check (
  public.has_org_permission(organization_id, 'contratos.editar')
  and (created_by is null or created_by = auth.uid())
);

create policy signature_verifications_update
on public.signature_verifications for update to authenticated
using (public.has_org_permission(organization_id, 'contratos.editar'))
with check (public.has_org_permission(organization_id, 'contratos.editar'));

comment on table public.acceptance_terms is 'Termos de aceite versionados por organização.';
comment on table public.contract_term_acceptances is 'Registros de aceite de termos vinculados a contratos digitais.';
comment on table public.signature_verifications is 'Resultados de validações eletrônicas e biométricas sem armazenamento de biometria bruta.';
comment on column public.signature_verifications.biometric_template_hash is 'Hash de referência; não contém e não permite reconstruir o template biométrico.';
comment on column public.signature_verifications.evidence_storage_path is 'Caminho protegido para evidência, sem URL pública ou conteúdo biométrico na tabela.';
comment on column public.contract_term_acceptances.acceptance_token_hash is 'Hash do token de aceite; o token original não deve ser persistido.';
