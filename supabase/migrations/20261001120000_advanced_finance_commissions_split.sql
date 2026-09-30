-- Fase 5: gestão financeira e faturamento avançado.
--
-- Esta migration complementa sales, payments, payment_charges e
-- commission_entries existentes. Não duplica vendas ou pagamentos.
-- Segredos bancários, tokens e dados completos de contas devem permanecer em
-- secrets/cofre externo; o banco guarda apenas referências operacionais.

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  package_id uuid references public.packages(id) on delete cascade,
  commission_type text not null check (commission_type in ('percentual', 'fixo')),
  commission_value numeric(12,2) not null check (commission_value >= 0),
  effective_from date not null default current_date,
  effective_until date,
  priority integer not null default 0,
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until >= effective_from),
  check (professional_id is not null or service_id is not null or package_id is not null)
);

create index if not exists commission_rules_org_active_idx
  on public.commission_rules (organization_id, active, effective_from desc, priority desc);

create index if not exists commission_rules_professional_idx
  on public.commission_rules (professional_id, service_id, package_id);

create table if not exists public.commission_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  location_id uuid references public.organization_locations(id) on delete set null,
  period_start date not null,
  period_end date not null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'em_revisao', 'aprovado', 'pago', 'cancelado')),
  gross_amount numeric(12,2) not null default 0 check (gross_amount >= 0),
  deductions numeric(12,2) not null default 0 check (deductions >= 0),
  adjustments numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0 check (net_amount >= 0),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  payout_method text check (payout_method is null or payout_method in ('pix', 'transferencia', 'dinheiro', 'folha', 'outro')),
  payout_reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (net_amount = greatest(gross_amount - deductions + adjustments, 0))
);

create unique index if not exists commission_settlements_period_uidx
  on public.commission_settlements (organization_id, professional_id, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid), period_start, period_end)
  where status <> 'cancelado';

create index if not exists commission_settlements_org_status_idx
  on public.commission_settlements (organization_id, status, period_end desc);

create table if not exists public.commission_settlement_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  settlement_id uuid not null references public.commission_settlements(id) on delete cascade,
  commission_entry_id uuid not null references public.commission_entries(id) on delete restrict,
  gross_amount numeric(12,2) not null default 0 check (gross_amount >= 0),
  deductions numeric(12,2) not null default 0 check (deductions >= 0),
  net_amount numeric(12,2) not null default 0 check (net_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (commission_entry_id),
  check (net_amount = greatest(gross_amount - deductions, 0))
);

create index if not exists commission_settlement_items_settlement_idx
  on public.commission_settlement_items (settlement_id, created_at);

create table if not exists public.payment_split_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  charge_id uuid not null references public.payment_charges(id) on delete cascade,
  payment_transaction_id uuid references public.payment_transactions(id) on delete set null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'calculado', 'enviado', 'parcial', 'concluido', 'falhou', 'cancelado')),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  gateway_fee numeric(12,2) not null default 0 check (gateway_fee >= 0),
  net_amount numeric(12,2) not null default 0 check (net_amount = greatest(gross_amount - gateway_fee, 0)),
  provider text,
  external_transfer_id text,
  processed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (charge_id)
);

create index if not exists payment_split_batches_org_status_idx
  on public.payment_split_batches (organization_id, status, created_at desc);

create table if not exists public.payment_split_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.payment_split_batches(id) on delete cascade,
  recipient_type text not null
    check (recipient_type in ('professional', 'clinic', 'platform', 'partner', 'gateway')),
  professional_id uuid references public.professionals(id) on delete set null,
  recipient_name text,
  percentage numeric(7,4) not null default 0 check (percentage >= 0 and percentage <= 100),
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pendente'
    check (status in ('pendente', 'agendado', 'enviado', 'pago', 'falhou', 'cancelado')),
  destination_reference text,
  external_transfer_id text,
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_type <> 'professional' or professional_id is not null),
  unique (batch_id, recipient_type, professional_id)
);

create index if not exists payment_split_items_batch_idx
  on public.payment_split_items (batch_id, status);

create index if not exists payment_split_items_professional_idx
  on public.payment_split_items (organization_id, professional_id, status, created_at desc);

-- Impede vínculos entre organizações diferentes.
create or replace function public.validate_advanced_finance_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_organization_id uuid;
begin
  if tg_table_name = 'commission_rules' then
    if new.professional_id is not null then
      select p.organization_id into related_organization_id from public.professionals p where p.id = new.professional_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'O profissional não pertence à organização da regra de comissão.';
      end if;
    end if;
    if new.service_id is not null then
      select s.organization_id into related_organization_id from public.services s where s.id = new.service_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'O serviço não pertence à organização da regra de comissão.';
      end if;
    end if;
    if new.package_id is not null then
      select p.organization_id into related_organization_id from public.packages p where p.id = new.package_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'O pacote não pertence à organização da regra de comissão.';
      end if;
    end if;
  elsif tg_table_name = 'commission_settlements' then
    select p.organization_id into related_organization_id from public.professionals p where p.id = new.professional_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O profissional não pertence ao fechamento de comissão.';
    end if;
    if new.location_id is not null then
      select l.organization_id into related_organization_id from public.organization_locations l where l.id = new.location_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'A filial não pertence ao fechamento de comissão.';
      end if;
    end if;
  elsif tg_table_name = 'commission_settlement_items' then
    select s.organization_id into related_organization_id from public.commission_settlements s where s.id = new.settlement_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O fechamento não pertence ao item de comissão.';
    end if;
    select e.organization_id into related_organization_id from public.commission_entries e where e.id = new.commission_entry_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'A comissão não pertence ao item de fechamento.';
    end if;
  elsif tg_table_name = 'payment_split_batches' then
    select c.organization_id into related_organization_id from public.payment_charges c where c.id = new.charge_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'A cobrança não pertence ao lote de split.';
    end if;
  else
    select b.organization_id into related_organization_id from public.payment_split_batches b where b.id = new.batch_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O lote não pertence ao item de split.';
    end if;
    if new.professional_id is not null then
      select p.organization_id into related_organization_id from public.professionals p where p.id = new.professional_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'O profissional não pertence ao item de split.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_commission_rule_organization on public.commission_rules;
create trigger validate_commission_rule_organization
before insert or update on public.commission_rules
for each row execute function public.validate_advanced_finance_organization();

drop trigger if exists validate_commission_settlement_organization on public.commission_settlements;
create trigger validate_commission_settlement_organization
before insert or update on public.commission_settlements
for each row execute function public.validate_advanced_finance_organization();

drop trigger if exists validate_commission_settlement_item_organization on public.commission_settlement_items;
create trigger validate_commission_settlement_item_organization
before insert or update on public.commission_settlement_items
for each row execute function public.validate_advanced_finance_organization();

drop trigger if exists validate_payment_split_batch_organization on public.payment_split_batches;
create trigger validate_payment_split_batch_organization
before insert or update on public.payment_split_batches
for each row execute function public.validate_advanced_finance_organization();

drop trigger if exists validate_payment_split_item_organization on public.payment_split_items;
create trigger validate_payment_split_item_organization
before insert or update on public.payment_split_items
for each row execute function public.validate_advanced_finance_organization();

create or replace function public.recalculate_commission_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_id_value uuid;
begin
  settlement_id_value := coalesce(new.settlement_id, old.settlement_id);
  update public.commission_settlements s
     set gross_amount = coalesce((select sum(i.gross_amount) from public.commission_settlement_items i where i.settlement_id = settlement_id_value), 0),
         deductions = coalesce((select sum(i.deductions) from public.commission_settlement_items i where i.settlement_id = settlement_id_value), 0),
         net_amount = greatest(
           coalesce((select sum(i.gross_amount) from public.commission_settlement_items i where i.settlement_id = settlement_id_value), 0)
           - coalesce((select sum(i.deductions) from public.commission_settlement_items i where i.settlement_id = settlement_id_value), 0)
           + s.adjustments,
           0
         ),
         updated_at = now()
   where s.id = settlement_id_value;
  return coalesce(new, old);
end;
$$;

drop trigger if exists recalculate_commission_settlement_after_item on public.commission_settlement_items;
create trigger recalculate_commission_settlement_after_item
after insert or update or delete on public.commission_settlement_items
for each row execute function public.recalculate_commission_settlement();

-- Timestamps padronizados.
drop trigger if exists commission_rules_updated_at on public.commission_rules;
create trigger commission_rules_updated_at before update on public.commission_rules for each row execute function public.set_updated_at();
drop trigger if exists commission_settlements_updated_at on public.commission_settlements;
create trigger commission_settlements_updated_at before update on public.commission_settlements for each row execute function public.set_updated_at();
drop trigger if exists payment_split_batches_updated_at on public.payment_split_batches;
create trigger payment_split_batches_updated_at before update on public.payment_split_batches for each row execute function public.set_updated_at();
drop trigger if exists payment_split_items_updated_at on public.payment_split_items;
create trigger payment_split_items_updated_at before update on public.payment_split_items for each row execute function public.set_updated_at();

alter table public.commission_rules enable row level security;
alter table public.commission_settlements enable row level security;
alter table public.commission_settlement_items enable row level security;
alter table public.payment_split_batches enable row level security;
alter table public.payment_split_items enable row level security;

grant select, insert, update, delete on public.commission_rules to authenticated;
grant select, insert, update, delete on public.commission_settlements to authenticated;
grant select, insert, update, delete on public.commission_settlement_items to authenticated;
grant select, insert, update on public.payment_split_batches to authenticated;
grant select, insert, update on public.payment_split_items to authenticated;
grant all on public.commission_rules, public.commission_settlements, public.commission_settlement_items, public.payment_split_batches, public.payment_split_items to service_role;

drop policy if exists commission_rules_read on public.commission_rules;
drop policy if exists commission_rules_manage on public.commission_rules;
create policy commission_rules_read on public.commission_rules for select to authenticated using (public.has_org_permission(organization_id, 'comissoes.ver'));
create policy commission_rules_manage on public.commission_rules for all to authenticated using (public.has_org_permission(organization_id, 'comissoes.editar')) with check (public.has_org_permission(organization_id, 'comissoes.editar'));

drop policy if exists commission_settlements_read on public.commission_settlements;
drop policy if exists commission_settlements_manage on public.commission_settlements;
create policy commission_settlements_read on public.commission_settlements for select to authenticated using (public.has_org_permission(organization_id, 'comissoes.ver'));
create policy commission_settlements_manage on public.commission_settlements for all to authenticated using (public.has_org_permission(organization_id, 'comissoes.editar')) with check (public.has_org_permission(organization_id, 'comissoes.editar'));

drop policy if exists commission_settlement_items_read on public.commission_settlement_items;
drop policy if exists commission_settlement_items_manage on public.commission_settlement_items;
create policy commission_settlement_items_read on public.commission_settlement_items for select to authenticated using (public.has_org_permission(organization_id, 'comissoes.ver'));
create policy commission_settlement_items_manage on public.commission_settlement_items for all to authenticated using (public.has_org_permission(organization_id, 'comissoes.editar')) with check (public.has_org_permission(organization_id, 'comissoes.editar'));

drop policy if exists payment_split_batches_read on public.payment_split_batches;
drop policy if exists payment_split_batches_manage on public.payment_split_batches;
create policy payment_split_batches_read on public.payment_split_batches for select to authenticated using (public.has_org_permission(organization_id, 'financeiro.ver'));
create policy payment_split_batches_manage on public.payment_split_batches for all to authenticated using (public.has_org_permission(organization_id, 'financeiro.editar')) with check (public.has_org_permission(organization_id, 'financeiro.editar'));

drop policy if exists payment_split_items_read on public.payment_split_items;
drop policy if exists payment_split_items_manage on public.payment_split_items;
create policy payment_split_items_read on public.payment_split_items for select to authenticated using (public.has_org_permission(organization_id, 'financeiro.ver'));
create policy payment_split_items_manage on public.payment_split_items for all to authenticated using (public.has_org_permission(organization_id, 'financeiro.editar')) with check (public.has_org_permission(organization_id, 'financeiro.editar'));

comment on table public.commission_rules is 'Regras versionadas de comissão por profissional, serviço ou pacote.';
comment on table public.commission_settlements is 'Fechamentos e repasses de comissão por profissional e período.';
comment on table public.commission_settlement_items is 'Comissões individuais incluídas em um fechamento, sem duplicidade.';
comment on table public.payment_split_batches is 'Lote de divisão de uma cobrança já existente entre destinatários.';
comment on table public.payment_split_items is 'Destinatários e valores individuais de um split de pagamento.';
comment on column public.payment_split_items.destination_reference is 'Referência segura do destino; não armazena dados bancários completos.';
