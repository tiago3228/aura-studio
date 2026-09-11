-- Payment gateways: provider-neutral, tenant-isolated, secrets stay in server configuration.
create table if not exists public.payment_gateways (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('mercado_pago','asaas','stripe','pix_manual')),
  display_name text not null,
  secret_ref text,
  public_key text,
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  gateway_id uuid references public.payment_gateways(id) on delete set null,
  provider text not null,
  external_id text,
  idempotency_key text not null,
  kind text not null default 'checkout' check (kind in ('checkout','subscription','one_time','refund')),
  amount numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending','authorized','paid','failed','canceled','refunded')),
  checkout_url text,
  customer_email text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  transaction_id uuid references public.payment_transactions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

alter table public.payment_gateways enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
create policy payment_gateways_member on public.payment_gateways for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy payment_transactions_member on public.payment_transactions for select to authenticated using (public.is_org_member(organization_id));
create policy payment_webhook_events_member on public.payment_webhook_events for select to authenticated using (organization_id is not null and public.is_org_member(organization_id));

create index if not exists payment_transactions_org_status_idx on public.payment_transactions(organization_id, status, created_at desc);
create index if not exists payment_webhook_events_transaction_idx on public.payment_webhook_events(transaction_id, processed);

-- Atomic idempotent transaction creation for server-side gateway adapters.
create or replace function public.payment_create_transaction(_organization_id uuid, _provider text, _kind text, _amount numeric, _idempotency_key text, _customer_email text default null, _metadata jsonb default '{}'::jsonb)
returns public.payment_transactions
language plpgsql security definer set search_path = public as $$
declare result public.payment_transactions;
begin
  if not public.is_org_member(_organization_id) then raise exception 'Acesso negado'; end if;
  insert into public.payment_transactions (organization_id, provider, kind, amount, idempotency_key, customer_email, metadata)
  values (_organization_id, _provider, _kind, _amount, _idempotency_key, _customer_email, coalesce(_metadata, '{}'::jsonb))
  on conflict (organization_id, idempotency_key) do update set updated_at = now()
  returning * into result;
  return result;
end; $$;
grant execute on function public.payment_create_transaction(uuid,text,text,numeric,text,text,jsonb) to authenticated;

-- Reconcile a transaction from a verified gateway webhook. The webhook signature must be verified server-side first.
create or replace function public.payment_apply_webhook(_provider text, _external_event_id text, _event_type text, _external_id text, _status text, _payload jsonb, _organization_id uuid default null)
returns public.payment_transactions
language plpgsql security definer set search_path = public as $$
declare event_id uuid; result public.payment_transactions;
begin
  insert into public.payment_webhook_events (organization_id, provider, external_event_id, event_type, payload)
  values (_organization_id, _provider, _external_event_id, _event_type, coalesce(_payload, '{}'::jsonb))
  on conflict (provider, external_event_id) do nothing returning id into event_id;
  if event_id is null then select pt.* into result from public.payment_transactions pt where pt.provider = _provider and pt.external_id = _external_id limit 1; return result; end if;
  update public.payment_transactions set status = _status, external_id = coalesce(external_id, _external_id), paid_at = case when _status = 'paid' then now() else paid_at end, updated_at = now() where provider = _provider and (external_id = _external_id or (metadata->>'external_id') = _external_id) returning * into result;
  update public.payment_webhook_events set transaction_id = result.id, processed = true, processed_at = now() where id = event_id;
  return result;
end; $$;
grant execute on function public.payment_apply_webhook(text,text,text,text,text,jsonb,uuid) to service_role;
