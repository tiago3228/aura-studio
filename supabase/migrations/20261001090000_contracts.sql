-- Contratos digitais: modelos versionados, contratos emitidos e histórico imutável.
-- A migration é idempotente para facilitar a execução no SQL Editor do Lovable.

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  content text not null check (char_length(trim(content)) >= 1),
  version integer not null default 1 check (version > 0),
  active boolean not null default true,
  variables jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, version)
);

create index if not exists contract_templates_org_active_idx
  on public.contract_templates (organization_id, active, name);

create table if not exists public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid references public.contract_templates(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  content text not null check (char_length(trim(content)) >= 1),
  template_version integer,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviado', 'visualizado', 'assinado', 'recusado', 'cancelado', 'expirado')),
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  signed_by_name text,
  signed_by_document text,
  signature_method text
    check (signature_method is null or signature_method in ('desenhada', 'digitada', 'codigo', 'externa')),
  signature_data text,
  signature_hash text,
  document_hash text,
  document_url text,
  rejection_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_contracts_org_status_idx
  on public.client_contracts (organization_id, status, created_at desc);

create index if not exists client_contracts_client_idx
  on public.client_contracts (client_id, created_at desc);

create index if not exists client_contracts_expiration_idx
  on public.client_contracts (organization_id, expires_at)
  where status in ('enviado', 'visualizado');

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.client_contracts(id) on delete cascade,
  event_type text not null
    check (event_type in ('criado', 'enviado', 'visualizado', 'assinado', 'recusado', 'cancelado', 'expirado', 'status_alterado', 'atualizado')),
  from_status text,
  to_status text,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contract_events_contract_idx
  on public.contract_events (contract_id, created_at desc);

create index if not exists contract_events_org_idx
  on public.contract_events (organization_id, created_at desc);

-- Garante que referências de outras organizações não sejam aceitas mesmo que um
-- cliente ou modelo seja enviado manualmente pelo cliente da API.
create or replace function public.validate_contract_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_organization_id uuid;
  template_organization_id uuid;
begin
  select c.organization_id
    into client_organization_id
    from public.clients c
   where c.id = new.client_id;

  if client_organization_id is null or client_organization_id <> new.organization_id then
    raise exception 'O cliente não pertence à organização do contrato.';
  end if;

  if new.template_id is not null then
    select t.organization_id
      into template_organization_id
      from public.contract_templates t
     where t.id = new.template_id;

    if template_organization_id is null or template_organization_id <> new.organization_id then
      raise exception 'O modelo não pertence à organização do contrato.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_client_contract_organization on public.client_contracts;
create trigger validate_client_contract_organization
before insert or update on public.client_contracts
for each row
execute function public.validate_contract_organization();

create or replace function public.record_contract_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
  event_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    event_name := 'criado';
    event_metadata := jsonb_build_object('title', new.title);
  elsif old.status is distinct from new.status then
    event_name := case new.status
      when 'enviado' then 'enviado'
      when 'visualizado' then 'visualizado'
      when 'assinado' then 'assinado'
      when 'recusado' then 'recusado'
      when 'cancelado' then 'cancelado'
      when 'expirado' then 'expirado'
      else 'status_alterado'
    end;
    event_metadata := jsonb_build_object('title', new.title);
  else
    event_name := 'atualizado';
    event_metadata := jsonb_build_object('title', new.title);
  end if;

  insert into public.contract_events (
    organization_id,
    contract_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    metadata
  ) values (
    new.organization_id,
    new.id,
    event_name,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    auth.uid(),
    event_metadata
  );

  return new;
end;
$$;

drop trigger if exists record_client_contract_event on public.client_contracts;
create trigger record_client_contract_event
after insert or update on public.client_contracts
for each row
execute function public.record_contract_event();

-- O trigger compartilhado existe no schema inicial do Aura.
drop trigger if exists contract_templates_updated_at on public.contract_templates;
create trigger contract_templates_updated_at
before update on public.contract_templates
for each row
execute function public.set_updated_at();

drop trigger if exists client_contracts_updated_at on public.client_contracts;
create trigger client_contracts_updated_at
before update on public.client_contracts
for each row
execute function public.set_updated_at();

alter table public.contract_templates enable row level security;
alter table public.client_contracts enable row level security;
alter table public.contract_events enable row level security;

grant select, insert, update, delete on public.contract_templates to authenticated;
grant select, insert, update, delete on public.client_contracts to authenticated;
grant select on public.contract_events to authenticated;
grant all on public.contract_templates, public.client_contracts, public.contract_events to service_role;

drop policy if exists contract_templates_read on public.contract_templates;
drop policy if exists contract_templates_create on public.contract_templates;
drop policy if exists contract_templates_update on public.contract_templates;
drop policy if exists contract_templates_delete on public.contract_templates;

create policy contract_templates_read
on public.contract_templates for select to authenticated
using (public.has_org_permission(organization_id, 'contratos.ver'));

create policy contract_templates_create
on public.contract_templates for insert to authenticated
with check (
  public.has_org_permission(organization_id, 'contratos.criar')
  and (created_by is null or created_by = auth.uid())
);

create policy contract_templates_update
on public.contract_templates for update to authenticated
using (public.has_org_permission(organization_id, 'contratos.editar'))
with check (public.has_org_permission(organization_id, 'contratos.editar'));

create policy contract_templates_delete
on public.contract_templates for delete to authenticated
using (public.has_org_permission(organization_id, 'contratos.excluir'));

drop policy if exists client_contracts_read on public.client_contracts;
drop policy if exists client_contracts_create on public.client_contracts;
drop policy if exists client_contracts_update on public.client_contracts;
drop policy if exists client_contracts_delete on public.client_contracts;

create policy client_contracts_read
on public.client_contracts for select to authenticated
using (public.has_org_permission(organization_id, 'contratos.ver'));

create policy client_contracts_create
on public.client_contracts for insert to authenticated
with check (
  public.has_org_permission(organization_id, 'contratos.criar')
  and (created_by is null or created_by = auth.uid())
);

create policy client_contracts_update
on public.client_contracts for update to authenticated
using (public.has_org_permission(organization_id, 'contratos.editar'))
with check (public.has_org_permission(organization_id, 'contratos.editar'));

create policy client_contracts_delete
on public.client_contracts for delete to authenticated
using (public.has_org_permission(organization_id, 'contratos.excluir'));

-- Eventos são criados exclusivamente pelos triggers acima e não podem ser
-- alterados ou apagados por usuários autenticados.
drop policy if exists contract_events_read on public.contract_events;
create policy contract_events_read
on public.contract_events for select to authenticated
using (public.has_org_permission(organization_id, 'contratos.ver'));

revoke insert, update, delete on public.contract_events from authenticated;

comment on table public.contract_templates is 'Modelos versionados de contratos digitais por organização.';
comment on table public.client_contracts is 'Contratos emitidos para clientes, mantendo um snapshot do conteúdo aceito.';
comment on table public.contract_events is 'Histórico imutável das mudanças de contratos digitais.';
comment on column public.client_contracts.content is 'Snapshot do texto do modelo no momento da emissão; não depende de alterações futuras no modelo.';
comment on column public.client_contracts.document_hash is 'Hash do documento final para comprovar a versão apresentada ao cliente.';
