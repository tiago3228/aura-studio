-- Advanced security: immutable audit trail and granular organization permissions.
alter table public.audit_logs add column if not exists before_data jsonb;
alter table public.audit_logs add column if not exists after_data jsonb;
alter table public.audit_logs add column if not exists severity text not null default 'info' check (severity in ('info','warning','critical'));
alter table public.audit_logs add column if not exists ip_hash text;
alter table public.audit_logs add column if not exists user_agent text;
alter table public.audit_logs add column if not exists request_id text;

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin raise exception 'Logs de auditoria são imutáveis'; end; $$;
drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.prevent_audit_mutation();

create or replace function public.write_audit_log(_organization_id uuid, _action text, _entity text default null, _entity_id uuid default null, _meta jsonb default '{}'::jsonb, _before jsonb default null, _after jsonb default null, _severity text default 'info')
returns public.audit_logs language plpgsql security definer set search_path = public as $$
declare result public.audit_logs;
begin
  if _organization_id is not null and not public.is_org_member(_organization_id) and not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  insert into public.audit_logs (organization_id,user_id,action,entity,entity_id,meta,before_data,after_data,severity) values (_organization_id, auth.uid(), _action, _entity, _entity_id, coalesce(_meta,'{}'::jsonb), _before, _after, coalesce(_severity,'info')) returning * into result;
  return result;
end; $$;
revoke insert on public.audit_logs from authenticated;
grant execute on function public.write_audit_log(uuid,text,text,uuid,jsonb,jsonb,jsonb,text) to authenticated;

create table if not exists public.organization_permissions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  permission text not null,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (organization_id, role, permission)
);
alter table public.organization_permissions enable row level security;
create policy organization_permissions_admin_read on public.organization_permissions for select to authenticated using (public.is_org_member(organization_id));
create policy organization_permissions_owner_write on public.organization_permissions for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create or replace function public.has_org_permission(_organization_id uuid, _permission text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m left join public.organization_permissions p on p.organization_id=m.organization_id and p.role=m.role and p.permission=_permission where m.organization_id=_organization_id and m.user_id=auth.uid() and m.active and (p.allowed is null or p.allowed));
$$;
grant execute on function public.has_org_permission(uuid,text) to authenticated;

-- Automatic before/after snapshots for the most sensitive operational entities.
create or replace function public.audit_sensitive_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare org uuid; action_name text;
begin
  org := coalesce((to_jsonb(new)->>'organization_id')::uuid, (to_jsonb(old)->>'organization_id')::uuid);
  action_name := lower(tg_op) || '_' || tg_table_name;
  if tg_op = 'INSERT' then perform public.write_audit_log(org, action_name, tg_table_name, (to_jsonb(new)->>'id')::uuid, '{}'::jsonb, null, to_jsonb(new)); return new;
  elsif tg_op = 'UPDATE' then perform public.write_audit_log(org, action_name, tg_table_name, (to_jsonb(new)->>'id')::uuid, '{}'::jsonb, to_jsonb(old), to_jsonb(new)); return new;
  else perform public.write_audit_log(org, action_name, tg_table_name, (to_jsonb(old)->>'id')::uuid, '{}'::jsonb, to_jsonb(old), null); return old; end if;
end; $$;

do $$ declare t text; begin for t in select unnest(array['subscriptions','payment_transactions','organization_members','ai_marketing_campaigns']) loop execute format('drop trigger if exists audit_sensitive_%I on public.%I', t, t); execute format('create trigger audit_sensitive_%I after insert or update or delete on public.%I for each row execute function public.audit_sensitive_change()', t, t); end loop; end $$;
