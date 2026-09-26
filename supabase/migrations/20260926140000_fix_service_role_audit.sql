-- Allow trusted server-side operations (service_role) to write audit rows.
-- These operations may not have auth.uid(), but they must not fail after the
-- primary mutation has already been authorized by the server action.
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
  is_trusted_server boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if not is_trusted_server
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

revoke execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, jsonb, jsonb, text) to authenticated, service_role;
