-- Orçamentos comerciais do Aura.
-- Permite montar propostas com serviços/produtos, validade, descontos,
-- plano de tratamento e conversão posterior em venda.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  issue_date date not null default current_date,
  valid_until date not null default (current_date + 30),
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado','expirado','convertido')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  surcharge numeric(12,2) not null default 0 check (surcharge >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  treatment_plan text,
  prescription text,
  internal_notes text,
  created_by uuid,
  converted_sale_id uuid references public.sales(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  product_id uuid,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  discount_type text not null default 'valor' check (discount_type in ('valor','percentual')),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists quotes_organization_date_idx on public.quotes(organization_id, issue_date desc);
create index if not exists quotes_client_idx on public.quotes(client_id, issue_date desc);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);

create or replace function public.quotes_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at before update on public.quotes
for each row execute function public.quotes_set_updated_at();

grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;
grant all on public.quotes to service_role;
grant all on public.quote_items to service_role;

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

drop policy if exists quotes_org_access on public.quotes;
create policy quotes_org_access on public.quotes for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists quote_items_org_access on public.quote_items;
create policy quote_items_org_access on public.quote_items for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));
