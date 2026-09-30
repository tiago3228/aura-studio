-- Anotações rápidas do dashboard, isoladas por organização e autor.
create table if not exists public.dashboard_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text check (body is null or char_length(body) <= 2000),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dashboard_notes_org_status_due_idx
  on public.dashboard_notes (organization_id, completed_at, due_at);

create index if not exists dashboard_notes_user_created_idx
  on public.dashboard_notes (user_id, created_at desc);

alter table public.dashboard_notes enable row level security;

create policy dashboard_notes_member_select
  on public.dashboard_notes
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy dashboard_notes_member_insert
  on public.dashboard_notes
  for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

create policy dashboard_notes_author_update
  on public.dashboard_notes
  for update
  to authenticated
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
  for delete
  to authenticated
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
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dashboard_notes_updated_at on public.dashboard_notes;

create trigger dashboard_notes_updated_at
before update on public.dashboard_notes
for each row
execute function public.set_dashboard_notes_updated_at();
