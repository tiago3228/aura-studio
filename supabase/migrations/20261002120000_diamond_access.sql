-- Aura Diamond access: complimentary PRO-equivalent access granted by the platform master.
-- This does not create or modify a paid subscription.

alter table public.organizations
  add column if not exists diamond_access boolean not null default false,
  add column if not exists diamond_access_at timestamptz,
  add column if not exists diamond_access_granted_by uuid;

comment on column public.organizations.diamond_access is
  'Gratuidade Diamond concedida pelo administrador master; equivale ao acesso PRO sem cobrança.';

create or replace function public.platform_set_diamond_access(
  _organization_id uuid,
  _enabled boolean
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.organizations;
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador master pode alterar o acesso Diamond';
  end if;

  update public.organizations
  set diamond_access = _enabled,
      diamond_access_at = case when _enabled then now() else null end,
      diamond_access_granted_by = case when _enabled then auth.uid() else null end,
      updated_at = now()
  where id = _organization_id
  returning * into result;

  if result.id is null then
    raise exception 'Organização não encontrada';
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity,
    entity_id,
    meta
  ) values (
    _organization_id,
    auth.uid(),
    case when _enabled then 'organization_diamond_enabled' else 'organization_diamond_disabled' end,
    'organization',
    _organization_id,
    jsonb_build_object('diamond_access', _enabled)
  );

  return result;
end;
$$;

revoke all on function public.platform_set_diamond_access(uuid, boolean) from public;
grant execute on function public.platform_set_diamond_access(uuid, boolean) to authenticated;
