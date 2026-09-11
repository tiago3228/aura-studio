-- Multi-location: existing organization becomes the parent; current records are assigned to a main location.
create table if not exists public.organization_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  phone text,
  whatsapp text,
  address text,
  city text,
  state text,
  timezone text not null default 'America/Sao_Paulo',
  active boolean not null default true,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create unique index if not exists organization_one_main_location on public.organization_locations(organization_id) where is_main;
create table if not exists public.organization_location_members (
  location_id uuid not null references public.organization_locations(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null default 'professional',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (location_id, user_id)
);

alter table public.clients add column if not exists location_id uuid references public.organization_locations(id) on delete set null;
alter table public.services add column if not exists location_id uuid references public.organization_locations(id) on delete set null;
alter table public.packages add column if not exists location_id uuid references public.organization_locations(id) on delete set null;
alter table public.professionals add column if not exists location_id uuid references public.organization_locations(id) on delete set null;
alter table public.appointments add column if not exists location_id uuid references public.organization_locations(id) on delete set null;
alter table public.sales add column if not exists location_id uuid references public.organization_locations(id) on delete set null;
alter table public.payment_transactions add column if not exists location_id uuid references public.organization_locations(id) on delete set null;

insert into public.organization_locations (organization_id, name, code, city, state, phone, whatsapp, address, is_main)
select id, name, 'principal', city, state, phone, whatsapp, address, true from public.organizations on conflict (organization_id, code) do nothing;
do $$ declare org record; loc uuid; begin for org in select id from public.organizations loop select id into loc from public.organization_locations where organization_id=org.id and is_main limit 1; update public.clients set location_id=loc where organization_id=org.id and location_id is null; update public.services set location_id=loc where organization_id=org.id and location_id is null; update public.packages set location_id=loc where organization_id=org.id and location_id is null; update public.professionals set location_id=loc where organization_id=org.id and location_id is null; update public.appointments set location_id=loc where organization_id=org.id and location_id is null; update public.sales set location_id=loc where organization_id=org.id and location_id is null; update public.payment_transactions set location_id=loc where organization_id=org.id and location_id is null; end loop; end $$;

alter table public.organization_locations enable row level security;
alter table public.organization_location_members enable row level security;
create policy organization_locations_member on public.organization_locations for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy organization_location_members_read on public.organization_location_members for select to authenticated using (exists (select 1 from public.organization_locations l where l.id=location_id and public.is_org_member(l.organization_id)));
create policy organization_location_members_admin on public.organization_location_members for all to authenticated using (exists (select 1 from public.organization_locations l where l.id=location_id and public.is_org_admin(l.organization_id))) with check (exists (select 1 from public.organization_locations l where l.id=location_id and public.is_org_admin(l.organization_id)));

create index if not exists locations_org_active_idx on public.organization_locations(organization_id, active);
create index if not exists clients_location_idx on public.clients(location_id);
create index if not exists appointments_location_period_idx on public.appointments(location_id, starts_at desc);
create index if not exists sales_location_period_idx on public.sales(location_id, created_at desc);

create or replace function public.user_has_location(_location_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.organization_locations l where l.id=_location_id and public.is_org_member(l.organization_id) and (exists (select 1 from public.organization_location_members lm where lm.location_id=l.id and lm.user_id=auth.uid() and lm.active) or public.is_org_admin(l.organization_id)));
$$;
grant execute on function public.user_has_location(uuid) to authenticated;
