-- Catálogo privado dos 14 modelos padrão importados do Estetic.
-- O snapshot é copiado uma única vez da organização CARDOSO CARE. Cada loja
-- recebe sua própria cópia; alterações locais não afetam outras organizações.
-- Backfill altera somente linhas ainda marcadas como placeholder.

create table if not exists public.contract_template_defaults (
  code integer primary key check (code between 1 and 14),
  name text not null,
  description text,
  content text not null check (content not like '[PENDENTE DE IMPORTAÇÃO]%'),
  variables jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  active boolean not null default true
);

alter table public.contract_template_defaults enable row level security;
revoke all on table public.contract_template_defaults from public, anon, authenticated;

-- Fail closed if the source organization does not contain the complete catalog.
do $$
declare
  source_count integer;
begin
  select count(*) into source_count
  from public.contract_templates
  where organization_id = 'a4373535-25ff-4761-a148-f4483355a03a'::uuid
    and code between 1 and 14
    and nullif(trim(content), '') is not null
    and content not like '[PENDENTE DE IMPORTAÇÃO]%';

  if source_count <> 14 then
    raise exception 'contract_template_defaults_source_incomplete';
  end if;
end;
$$;

insert into public.contract_template_defaults (
  code, name, description, content, variables, version, active
)
select code, name, description, content, variables, version, active
from public.contract_templates
where organization_id = 'a4373535-25ff-4761-a148-f4483355a03a'::uuid
  and code between 1 and 14
  and nullif(trim(content), '') is not null
  and content not like '[PENDENTE DE IMPORTAÇÃO]%'
on conflict (code) do nothing;

do $$
begin
  if (select count(*) from public.contract_template_defaults) <> 14 then
    raise exception 'contract_template_defaults_catalog_incomplete';
  end if;
end;
$$;

comment on table public.contract_template_defaults is
  'Catálogo privado e imutável de modelos padrão. Organizações recebem cópias próprias em contract_templates.';

-- Modelo e conteúdo pertencem a cada loja. Qualquer membro ativo pode ler,
-- criar e editar; apenas proprietários e gerentes podem excluir.
create or replace function public.can_access_contract_templates(_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = _organization_id
      and m.user_id = auth.uid()
      and m.active
  );
$$;

create or replace function public.can_delete_contract_templates(_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = _organization_id
      and m.user_id = auth.uid()
      and m.active
      and m.role in ('owner', 'manager')
  );
$$;

revoke all on function public.can_access_contract_templates(uuid) from public, anon, authenticated;
revoke all on function public.can_delete_contract_templates(uuid) from public, anon, authenticated;
grant execute on function public.can_access_contract_templates(uuid) to authenticated;
grant execute on function public.can_delete_contract_templates(uuid) to authenticated;

alter table public.contract_templates enable row level security;

drop policy if exists contract_templates_read on public.contract_templates;
create policy contract_templates_read
  on public.contract_templates
  for select to authenticated
  using (public.can_access_contract_templates(organization_id));

drop policy if exists contract_templates_create on public.contract_templates;
create policy contract_templates_create
  on public.contract_templates
  for insert to authenticated
  with check (
    public.can_access_contract_templates(organization_id)
    and created_by = auth.uid()
  );

drop policy if exists contract_templates_update on public.contract_templates;
create policy contract_templates_update
  on public.contract_templates
  for update to authenticated
  using (public.can_access_contract_templates(organization_id))
  with check (public.can_access_contract_templates(organization_id));

drop policy if exists contract_templates_delete on public.contract_templates;
create policy contract_templates_delete
  on public.contract_templates
  for delete to authenticated
  using (public.can_delete_contract_templates(organization_id));

-- Keep tenant/catalog identity immutable and increment the version when content
-- or status changes, preserving the version copied into issued contracts.
create or replace function public.guard_contract_template_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.code is distinct from old.code
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'contract_template_identity_immutable' using errcode = '42501';
  end if;

  if row(new.name, new.description, new.content, new.variables, new.active)
     is distinct from row(old.name, old.description, old.content, old.variables, old.active) then
    new.version := old.version + 1;
  else
    new.version := old.version;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists contract_templates_guard_update on public.contract_templates;
create trigger contract_templates_guard_update
  before update on public.contract_templates
  for each row execute function public.guard_contract_template_update();
revoke all on function public.guard_contract_template_update() from public, anon, authenticated;

-- Upgrade only untouched placeholders; preserve names, descriptions, and any
-- content that a clinic has already customized.
update public.contract_templates as existing
set content = defaults.content,
    variables = defaults.variables
from public.contract_template_defaults as defaults
where existing.code = defaults.code
  and existing.content like '[PENDENTE DE IMPORTAÇÃO]%';

-- New organizations receive private editable copies of the complete baseline.
create or replace function public.seed_default_contract_templates_for_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contract_templates (
    organization_id, code, name, description, content, variables, version, active
  )
  select
    new.id, defaults.code, defaults.name, defaults.description,
    defaults.content, defaults.variables, defaults.version, defaults.active
  from public.contract_template_defaults as defaults
  order by defaults.code
  on conflict (organization_id, code) where code is not null do nothing;

  return new;
end;
$$;

revoke all on function public.seed_default_contract_templates_for_organization() from public, anon, authenticated;
drop trigger if exists seed_default_contract_templates_on_organization on public.organizations;
create trigger seed_default_contract_templates_on_organization
  after insert on public.organizations
  for each row execute function public.seed_default_contract_templates_for_organization();
