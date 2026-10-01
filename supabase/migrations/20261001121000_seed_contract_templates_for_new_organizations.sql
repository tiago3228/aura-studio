-- Garante que os modelos padrão de contrato apareçam também para clínicas
-- criadas depois da migration inicial, como a clínica da Letícia.
-- Cada organização recebe sua própria cópia para poder editar sem expor dados
-- ou alterações de outra clínica.

create or replace function public.seed_default_contract_templates_for_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  values
    (new.id, 14, 'Termo de Consentimento – Depilação a Laser', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 13, 'Termo de Consentimento – Tratamento de Estrias', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 12, 'Termo de Consentimento – Lipo Enzimática', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 11, 'Termo de Consentimento – Secagem de Vasinhos', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 10, 'Termo de Consentimento – Bioestimulador de Colágeno', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 9, 'Termo de Consentimento – Fios de PDO', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 8, 'Termo de Consentimento – Preenchimento Facial', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 7, 'Termo de Consentimento – Botox (Toxina Botulínica)', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 6, 'Termo de Consentimento – Peeling', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 5, 'Termo de Consentimento – Microagulhamento', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 4, 'Termo de Consentimento - Limpeza de pele', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 3, 'Termo de Comparecimento', 'Modelo padrão de comparecimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 2, 'Contrato de Prestação de Serviços da Clínica', 'Modelo padrão de prestação de serviços.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
    (new.id, 1, 'Contrato de Avaliações', 'Modelo padrão de avaliação.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true)
  on conflict (organization_id, code) where code is not null do nothing;

  return new;
end;
$$;

drop trigger if exists seed_default_contract_templates_on_organization
  on public.organizations;
create trigger seed_default_contract_templates_on_organization
after insert on public.organizations
for each row execute function public.seed_default_contract_templates_for_organization();

-- Corrige organizações já existentes, incluindo clínicas criadas antes desta
-- migration e que ainda não receberam o catálogo padrão.
do $$
declare
  organization_row record;
begin
  for organization_row in select id from public.organizations loop
    insert into public.contract_templates (
      organization_id, code, name, description, content, variables, version, active
    )
    values
      (organization_row.id, 14, 'Termo de Consentimento – Depilação a Laser', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 13, 'Termo de Consentimento – Tratamento de Estrias', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 12, 'Termo de Consentimento – Lipo Enzimática', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 11, 'Termo de Consentimento – Secagem de Vasinhos', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 10, 'Termo de Consentimento – Bioestimulador de Colágeno', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 9, 'Termo de Consentimento – Fios de PDO', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 8, 'Termo de Consentimento – Preenchimento Facial', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 7, 'Termo de Consentimento – Botox (Toxina Botulínica)', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 6, 'Termo de Consentimento – Peeling', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 5, 'Termo de Consentimento – Microagulhamento', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 4, 'Termo de Consentimento - Limpeza de pele', 'Modelo padrão de consentimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 3, 'Termo de Comparecimento', 'Modelo padrão de comparecimento.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 2, 'Contrato de Prestação de Serviços da Clínica', 'Modelo padrão de prestação de serviços.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true),
      (organization_row.id, 1, 'Contrato de Avaliações', 'Modelo padrão de avaliação.', '[PENDENTE DE IMPORTAÇÃO] Revise e personalize este modelo antes de usar.', '[]'::jsonb, 1, true)
    on conflict (organization_id, code) where code is not null do nothing;
  end loop;
end;
$$;
