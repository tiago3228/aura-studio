-- Aura Payment Center: tenant-scoped charges and provider capabilities.
create table if not exists public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('mercado_pago','stripe','pagbank','asaas')),
  status text not null default 'disconnected' check (status in ('disconnected','connected','error')),
  display_name text not null,
  capabilities jsonb not null default '{}'::jsonb,
  account_label text,
  last_webhook_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);
create table if not exists public.payment_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  provider_id uuid references public.payment_providers(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  kind text not null check (kind in ('service','package','product','custom')),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  final_amount numeric(12,2) not null check (final_amount >= 0),
  method text,
  status text not null default 'pending' check (status in ('pending','processing','paid','cancelled','expired','refunded','failed')),
  payment_url text,
  external_id text,
  idempotency_key text not null,
  paid_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);
create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  charge_id uuid not null references public.payment_charges(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  status text not null default 'requested',
  external_id text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.payment_providers to authenticated;
grant select, insert on public.payment_charges to authenticated;
grant select, insert on public.payment_refunds to authenticated;
alter table public.payment_providers enable row level security;
alter table public.payment_charges enable row level security;
alter table public.payment_refunds enable row level security;
create policy payment_providers_member on public.payment_providers for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy payment_charges_member on public.payment_charges for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy payment_refunds_member on public.payment_refunds for select to authenticated using (public.is_org_member(organization_id));
create index if not exists payment_charges_org_status_idx on public.payment_charges(organization_id,status,created_at desc);
create index if not exists payment_charges_client_idx on public.payment_charges(organization_id,client_id,created_at desc);
