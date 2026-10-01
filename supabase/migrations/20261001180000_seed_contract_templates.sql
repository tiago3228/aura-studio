-- Catálogo inicial de modelos de contratos do Aura.
--
-- Popula os 14 modelos identificados no Estetic somente com código e título.
-- O conteúdo fica explicitamente marcado como pendente de importação autorizada.
-- A migration é idempotente, multi-organização e não sobrescreve modelos existentes.

alter table public.contract_templates
  add column if not exists code integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contract_templates_code_range_check'
      and conrelid = 'public.contract_templates'::regclass
  ) then
    alter table public.contract_templates
      add constraint contract_templates_code_range_check
      check (code is null or code between 1 and 14);
  end if;
end;
$$;

create unique index if not exists contract_templates_organization_code_key
  on public.contract_templates (organization_id, code)
  where code is not null;

with seed(code, name) as (
  values
    (14, 'Termo de Consentimento – Depilação a Laser'),
    (13, 'Termo de Consentimento – Tratamento de Estrias'),
    (12, 'Termo de Consentimento – Lipo Enzimática'),
    (11, 'Termo de Consentimento – Secagem de Vasinhos'),
    (10, 'Termo de Consentimento – Bioestimulador de Colágeno'),
    (9, 'Termo de Consentimento – Fios de PDO'),
    (8, 'Termo de Consentimento – Preenchimento Facial'),
    (7, 'Termo de Consentimento – Botox (Toxina Botulínica)'),
    (6, 'Termo de Consentimento – Peeling'),
    (5, 'Termo de Consentimento – Microagulhamento'),
    (4, 'Termo de Consentimento - Limpeza de pele'),
    (3, 'Termo de Comparecimento'),
    (2, 'Contrato de Prestação de Serviços da Clínica'),
    (1, 'Contrato de Avaliações')
)
update public.contract_templates as existing
set code = seed.code
from seed
where existing.code is null
  and lower(regexp_replace(existing.name, '[^[:alnum:]]+', '', 'g')) =
      lower(regexp_replace(seed.name, '[^[:alnum:]]+', '', 'g'));

with seed(code, name) as (
  values
    (14, 'Termo de Consentimento – Depilação a Laser'),
    (13, 'Termo de Consentimento – Tratamento de Estrias'),
    (12, 'Termo de Consentimento – Lipo Enzimática'),
    (11, 'Termo de Consentimento – Secagem de Vasinhos'),
    (10, 'Termo de Consentimento – Bioestimulador de Colágeno'),
    (9, 'Termo de Consentimento – Fios de PDO'),
    (8, 'Termo de Consentimento – Preenchimento Facial'),
    (7, 'Termo de Consentimento – Botox (Toxina Botulínica)'),
    (6, 'Termo de Consentimento – Peeling'),
    (5, 'Termo de Consentimento – Microagulhamento'),
    (4, 'Termo de Consentimento - Limpeza de pele'),
    (3, 'Termo de Comparecimento'),
    (2, 'Contrato de Prestação de Serviços da Clínica'),
    (1, 'Contrato de Avaliações')
)
insert into public.contract_templates (
  organization_id,
  code,
  name,
  description,
  content,
  variables,
  version,
  active
)
select
  organizations.id,
  seed.code,
  seed.name,
  'Modelo importado do catálogo do Estetic; conteúdo aguardando importação autorizada.',
  '[PENDENTE DE IMPORTAÇÃO] O conteúdo completo deste modelo ainda não foi copiado.',
  '[]'::jsonb,
  1,
  true
from public.organizations
cross join seed
where not exists (
  select 1
  from public.contract_templates existing
  where existing.organization_id = organizations.id
    and (existing.code = seed.code or lower(existing.name) = lower(seed.name))
);

comment on column public.contract_templates.code is
  'Código externo do modelo de contrato, preservado para importação e rastreabilidade.';
