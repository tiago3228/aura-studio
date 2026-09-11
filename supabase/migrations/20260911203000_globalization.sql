-- Globalization: preferences are separate so existing financial values remain immutable.
create table if not exists public.organization_localization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  language_code text not null default 'pt-BR' check (language_code in ('pt-BR','en-US','es-ES','fr-FR')), 
  currency_code text not null default 'BRL' check (currency_code in ('BRL','USD','EUR','GBP','ARS','CLP','MXN')), 
  timezone text not null default 'America/Sao_Paulo',
  date_format text not null default 'dd/MM/yyyy' check (date_format in ('dd/MM/yyyy','MM/dd/yyyy','yyyy-MM-dd')),
  first_day_of_week smallint not null default 0 check (first_day_of_week between 0 and 6),
  decimal_separator text not null default ',' check (decimal_separator in (',','.')),
  thousands_separator text not null default '.' check (thousands_separator in ('.',',',' ')),
  updated_at timestamptz not null default now()
);
create table if not exists public.currency_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  base_currency text not null default 'BRL',
  quote_currency text not null,
  rate numeric(18,8) not null check (rate > 0),
  effective_on date not null default current_date,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (organization_id, base_currency, quote_currency, effective_on)
);

alter table public.organization_localization_settings enable row level security;
alter table public.currency_exchange_rates enable row level security;
create policy organization_localization_member on public.organization_localization_settings for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy currency_exchange_rates_member on public.currency_exchange_rates for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
insert into public.organization_localization_settings (organization_id) select id from public.organizations on conflict (organization_id) do nothing;
create index if not exists currency_rates_lookup_idx on public.currency_exchange_rates(organization_id, base_currency, quote_currency, effective_on desc);

create or replace function public.convert_organization_amount(_amount numeric, _from text, _to text, _organization_id uuid default null, _on date default current_date)
returns numeric language plpgsql security definer set search_path = public as $$
declare org uuid; rate numeric;
begin
  org := coalesce(_organization_id, (select organization_id from public.organization_members where user_id = auth.uid() and active = true limit 1));
  if org is null or not public.is_org_member(org) then raise exception 'Acesso negado'; end if;
  if _from = _to then return round(_amount, 2); end if;
  select cer.rate into rate from public.currency_exchange_rates cer where cer.organization_id = org and cer.base_currency = _from and cer.quote_currency = _to and cer.effective_on <= _on order by cer.effective_on desc limit 1;
  if rate is null then raise exception 'Taxa de câmbio não cadastrada para % -> %', _from, _to; end if;
  return round(_amount * rate, 2);
end; $$;
grant execute on function public.convert_organization_amount(numeric,text,text,uuid,date) to authenticated;
