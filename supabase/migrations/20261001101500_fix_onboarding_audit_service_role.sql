-- Corrige o primeiro cadastro de clínica.
--
-- Durante o onboarding, a Edge/server function usa service_role para criar a
-- organização e o primeiro organization_member. O trigger de auditoria de
-- organization_members chama write_audit_log antes de existir um membership
-- para o novo proprietário; a validação antiga interpretava isso como acesso
-- negado e revertia toda a criação.
--
-- Usuários autenticados continuam obrigados a pertencer à organização. Apenas
-- operações internas com service_role podem registrar o primeiro vínculo.

create or replace function public.write_audit_log(
  _organization_id uuid,
  _action text,
  _entity text default null,
  _entity_id uuid default null,
  _meta jsonb default '{}'::jsonb,
  _before jsonb default null,
  _after jsonb default null,
  _severity text default 'info'
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.audit_logs;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and _organization_id is not null
     and not public.is_org_member(_organization_id)
     and not public.is_platform_admin() then
    raise exception 'Acesso negado';
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity,
    entity_id,
    meta,
    before_data,
    after_data,
    severity
  )
  values (
    _organization_id,
    auth.uid(),
    _action,
    _entity,
    _entity_id,
    coalesce(_meta, '{}'::jsonb),
    _before,
    _after,
    coalesce(_severity, 'info')
  )
  returning * into result;

  return result;
end;
$$;

comment on function public.write_audit_log(uuid, text, text, uuid, jsonb, jsonb, jsonb, text)
is 'Auditoria tenant-scoped; permite apenas service_role registrar o primeiro vínculo durante o onboarding.';
