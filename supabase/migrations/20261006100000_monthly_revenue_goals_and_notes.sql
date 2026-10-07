-- Meta mensal de faturamento e anotações colaborativas com privacidade por autor.

create table if not exists public.monthly_revenue_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  month_start date not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_revenue_goals_org_month_unique unique (organization_id, month_start),
  constraint monthly_revenue_goals_month_start_check check (extract(day from month_start) = 1)
);

create index if not exists monthly_revenue_goals_org_month_idx
  on public.monthly_revenue_goals (organization_id, month_start desc);

alter table public.monthly_revenue_goals enable row level security;
-- Remove broad legacy grants; RLS does not restrict table-level TRUNCATE privileges.
revoke all privileges on table public.monthly_revenue_goals from anon, authenticated, public;
grant select, insert, update, delete on table public.monthly_revenue_goals to authenticated;
grant all privileges on table public.monthly_revenue_goals to service_role;

drop policy if exists monthly_revenue_goals_member_read on public.monthly_revenue_goals;
drop policy if exists monthly_revenue_goals_admin_insert on public.monthly_revenue_goals;
drop policy if exists monthly_revenue_goals_admin_update on public.monthly_revenue_goals;
drop policy if exists monthly_revenue_goals_admin_delete on public.monthly_revenue_goals;

create policy monthly_revenue_goals_member_read
  on public.monthly_revenue_goals
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy monthly_revenue_goals_admin_insert
  on public.monthly_revenue_goals
  for insert to authenticated
  with check (public.is_org_admin(organization_id) and created_by = auth.uid());

create policy monthly_revenue_goals_admin_update
  on public.monthly_revenue_goals
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy monthly_revenue_goals_admin_delete
  on public.monthly_revenue_goals
  for delete to authenticated
  using (public.is_org_admin(organization_id));

create or replace function public.set_monthly_revenue_goal_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.created_by := old.created_by;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists monthly_revenue_goals_updated_at on public.monthly_revenue_goals;
create trigger monthly_revenue_goals_updated_at
before update on public.monthly_revenue_goals
for each row execute function public.set_monthly_revenue_goal_updated_at();

create table if not exists public.dashboard_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Membro da equipe',
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text check (body is null or char_length(body) <= 2000),
  due_at timestamptz,
  is_private boolean not null default true,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evolui também a primeira versão das notas, caso ela já tenha sido aplicada.
alter table public.dashboard_notes
  add column if not exists author_name text not null default 'Membro da equipe',
  add column if not exists is_private boolean not null default false,
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

-- Keep old team notes shared; newly created notes remain private by default.
alter table public.dashboard_notes alter column is_private set default true;

create index if not exists dashboard_notes_org_status_due_idx
  on public.dashboard_notes (organization_id, completed_at, due_at);
create index if not exists dashboard_notes_user_created_idx
  on public.dashboard_notes (user_id, created_at desc);

alter table public.dashboard_notes enable row level security;
-- Remove broad legacy grants; RLS does not restrict table-level TRUNCATE privileges.
revoke all privileges on table public.dashboard_notes from anon, authenticated, public;
grant select, insert, update, delete on table public.dashboard_notes to authenticated;
grant all privileges on table public.dashboard_notes to service_role;

-- Remove políticas permissivas da versão inicial para que notas privadas não fiquem visíveis à equipe.
drop policy if exists dashboard_notes_member_select on public.dashboard_notes;
drop policy if exists dashboard_notes_member_insert on public.dashboard_notes;
drop policy if exists dashboard_notes_author_update on public.dashboard_notes;
drop policy if exists dashboard_notes_author_delete on public.dashboard_notes;
drop policy if exists dashboard_notes_visible_select on public.dashboard_notes;
drop policy if exists dashboard_notes_author_insert on public.dashboard_notes;
drop policy if exists dashboard_notes_author_update on public.dashboard_notes;
drop policy if exists dashboard_notes_author_delete on public.dashboard_notes;

create policy dashboard_notes_visible_select
  on public.dashboard_notes
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (not is_private or user_id = auth.uid())
  );

create policy dashboard_notes_author_insert
  on public.dashboard_notes
  for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

create policy dashboard_notes_author_update
  on public.dashboard_notes
  for update to authenticated
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

create policy dashboard_notes_author_delete
  on public.dashboard_notes
  for delete to authenticated
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

create or replace function public.set_dashboard_notes_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.author_name := coalesce(
      nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
      nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
      'Membro da equipe'
    );
  else
    new.organization_id := old.organization_id;
    new.user_id := old.user_id;
    new.author_name := old.author_name;
    new.created_at := old.created_at;
    if new.completed_at is distinct from old.completed_at then
      if new.completed_at is null then
        new.completed_by := null;
      else
        new.completed_at := now();
        new.completed_by := auth.uid();
      end if;
    else
      new.completed_by := old.completed_by;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dashboard_notes_updated_at on public.dashboard_notes;
create trigger dashboard_notes_updated_at
before insert or update on public.dashboard_notes
for each row execute function public.set_dashboard_notes_updated_at();
