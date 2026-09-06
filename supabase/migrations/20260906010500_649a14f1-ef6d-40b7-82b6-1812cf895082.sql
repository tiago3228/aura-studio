create table public.treatment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  performed_at timestamptz not null default now(),
  procedure text not null,
  products_used text,
  parameters text,
  evolution text,
  next_steps text,
  photos jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.treatment_records to authenticated;
grant all on public.treatment_records to service_role;

alter table public.treatment_records enable row level security;

create policy "org members manage treatment records"
on public.treatment_records for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create trigger set_updated_at before update on public.treatment_records
for each row execute function public.set_updated_at();

create index treatment_records_client_idx on public.treatment_records(client_id, performed_at desc);