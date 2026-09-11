-- Aura platform administration: presence, access audit and tenant controls.
-- The platform owner is intentionally restricted to the configured master email.

alter table public.organizations
  add column if not exists access_blocked boolean not null default false,
  add column if not exists access_blocked_at timestamptz,
  add column if not exists access_blocked_reason text;

create table if not exists public.platform_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null check (event_type in ('entered','heartbeat','left')),
  session_id uuid,
  user_email text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_access_events_created_idx on public.platform_access_events(created_at desc);
create index if not exists platform_access_events_user_idx on public.platform_access_events(user_id, created_at desc);

create table if not exists public.platform_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid references public.organizations(id) on delete set null,
  user_email text,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists platform_sessions_online_idx on public.platform_sessions(last_seen_at desc) where left_at is null;
create index if not exists platform_sessions_user_idx on public.platform_sessions(user_id, last_seen_at desc);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'tiago3228@yahoo.com.br';
$$;

create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = _org and m.user_id = auth.uid() and m.active and not o.access_blocked
  ) or public.is_platform_admin();
$$;

create or replace function public.platform_touch_session(
  _session_id uuid,
  _organization_id uuid,
  _event_type text default 'heartbeat',
  _user_email text default null,
  _user_agent text default null,
  _metadata jsonb default '{}'::jsonb
)
returns public.platform_sessions
language plpgsql security definer set search_path = public as $$
declare result public.platform_sessions;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  insert into public.platform_sessions (id, user_id, organization_id, user_email, user_agent, metadata, first_seen_at, last_seen_at, left_at)
  values (_session_id, auth.uid(), _organization_id, coalesce(_user_email, auth.jwt() ->> 'email'), _user_agent, coalesce(_metadata, '{}'::jsonb), now(), now(), null)
  on conflict (id) do update set last_seen_at = now(), left_at = case when _event_type = 'left' then now() else null end, metadata = coalesce(excluded.metadata, public.platform_sessions.metadata);
  insert into public.platform_access_events (user_id, organization_id, event_type, session_id, user_email, user_agent, metadata)
  values (auth.uid(), _organization_id, _event_type, _session_id, coalesce(_user_email, auth.jwt() ->> 'email'), _user_agent, coalesce(_metadata, '{}'::jsonb));
  select * into result from public.platform_sessions where id = _session_id;
  return result;
end; $$;

create or replace function public.platform_set_organization_access(
  _organization_id uuid,
  _enabled boolean,
  _reason text default null
)
returns public.organizations
language plpgsql security definer set search_path = public as $$
declare result public.organizations;
begin
  if not public.is_platform_admin() then raise exception 'Apenas o administrador master pode alterar o acesso'; end if;
  update public.organizations
  set access_blocked = not _enabled,
      access_blocked_at = case when _enabled then null else now() end,
      access_blocked_reason = case when _enabled then null else _reason end,
      updated_at = now()
  where id = _organization_id
  returning * into result;
  insert into public.audit_logs (organization_id, user_id, action, entity, entity_id, meta)
  values (_organization_id, auth.uid(), case when _enabled then 'organization_access_enabled' else 'organization_access_blocked' end, 'organization', _organization_id, jsonb_build_object('reason', _reason));
  return result;
end; $$;

create or replace function public.platform_set_subscription(
  _organization_id uuid,
  _status text,
  _plan text default null,
  _period_end timestamptz default null
)
returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare result public.subscriptions;
begin
  if not public.is_platform_admin() then raise exception 'Apenas o administrador master pode liberar assinaturas'; end if;
  update public.subscriptions
  set status = _status,
      plan = coalesce(_plan, plan),
      current_period_end = coalesce(_period_end, current_period_end),
      canceled_at = case when _status in ('canceled','cancelled') then now() else null end,
      updated_at = now()
  where organization_id = _organization_id
  returning * into result;
  if result.id is null then raise exception 'Assinatura não encontrada para esta organização'; end if;
  insert into public.subscription_events (organization_id, subscription_id, kind, status, meta)
  values (_organization_id, result.id, 'admin_platform_update', _status, jsonb_build_object('plan', result.plan, 'updated_by', auth.uid()));
  return result;
end; $$;

alter table public.platform_access_events enable row level security;
alter table public.platform_sessions enable row level security;

drop policy if exists platform_events_self_insert on public.platform_access_events;
create policy platform_events_self_insert on public.platform_access_events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists platform_events_master_read on public.platform_access_events;
create policy platform_events_master_read on public.platform_access_events for select to authenticated using (public.is_platform_admin());
drop policy if exists platform_sessions_self_exec on public.platform_sessions;
create policy platform_sessions_self_exec on public.platform_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists platform_sessions_master_read on public.platform_sessions;
create policy platform_sessions_master_read on public.platform_sessions for select to authenticated using (public.is_platform_admin());

revoke all on function public.platform_set_organization_access(uuid, boolean, text) from public;
grant execute on function public.platform_set_organization_access(uuid, boolean, text) to authenticated;
revoke all on function public.platform_set_subscription(uuid, text, text, timestamptz) from public;
grant execute on function public.platform_set_subscription(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.platform_touch_session(uuid, uuid, text, text, text, jsonb) to authenticated;
