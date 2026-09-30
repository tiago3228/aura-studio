-- Fase 6: gestão avançada de estoque e insumos com rastreabilidade de lotes.
--
-- A migration complementa products e inventory_movements existentes. O estoque
-- atual é preservado em um lote LEGACY por produto e os novos consumos devem
-- usar inventory_consume_fefo para rastrear lote, validade e custo.

alter table public.inventory_movements
  add column if not exists lot_id uuid,
  add column if not exists unit_cost numeric(12,4);

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid references public.organization_locations(id) on delete set null,
  lot_number text not null check (char_length(trim(lot_number)) between 1 and 100),
  manufacturer text,
  supplier_name text,
  supplier_document text,
  received_at timestamptz not null default now(),
  manufactured_at date,
  expires_at date,
  quantity_received numeric(12,3) not null default 0 check (quantity_received >= 0),
  quantity_available numeric(12,3) not null default 0 check (quantity_available >= 0),
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  status text not null default 'disponivel'
    check (status in ('disponivel', 'bloqueado', 'esgotado', 'vencido', 'descartado')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id, lot_number),
  check (expires_at is null or manufactured_at is null or expires_at >= manufactured_at),
  check (quantity_available <= quantity_received)
);

create index if not exists inventory_lots_product_status_idx
  on public.inventory_lots (organization_id, product_id, status, expires_at asc nulls last);

create index if not exists inventory_lots_expiration_idx
  on public.inventory_lots (organization_id, expires_at asc)
  where status = 'disponivel' and quantity_available > 0;

create table if not exists public.inventory_lot_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lot_id uuid not null references public.inventory_lots(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null
    check (movement_type in ('entrada', 'saida', 'ajuste', 'perda', 'consumo', 'transferencia')),
  quantity numeric(12,3) not null check (quantity > 0),
  quantity_before numeric(12,3) not null check (quantity_before >= 0),
  quantity_after numeric(12,3) not null check (quantity_after >= 0),
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  total_cost numeric(12,2) not null default 0 check (total_cost >= 0),
  appointment_id uuid references public.appointments(id) on delete set null,
  treatment_record_id uuid references public.treatment_records(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  inventory_movement_id uuid references public.inventory_movements(id) on delete set null,
  reason text,
  performed_by uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists inventory_lot_movements_lot_idx
  on public.inventory_lot_movements (lot_id, occurred_at desc);

create index if not exists inventory_lot_movements_product_idx
  on public.inventory_lot_movements (organization_id, product_id, occurred_at desc);

create index if not exists inventory_lot_movements_trace_idx
  on public.inventory_lot_movements (organization_id, appointment_id, treatment_record_id, sale_id);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'inventory_movements_lot_fk'
       and conrelid = 'public.inventory_movements'::regclass
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_lot_fk
      foreign key (lot_id) references public.inventory_lots(id) on delete set null;
  end if;
end;
$$;

-- Preserva o estoque que já existia antes da rastreabilidade por lotes.
insert into public.inventory_lots (
  organization_id,
  product_id,
  lot_number,
  received_at,
  quantity_received,
  quantity_available,
  unit_cost,
  status,
  notes
)
select
  p.organization_id,
  p.id,
  'LEGACY-' || replace(p.id::text, '-', ''),
  p.created_at,
  greatest(p.stock, 0),
  greatest(p.stock, 0),
  greatest(p.cost_price, 0),
  case when p.stock > 0 then 'disponivel' else 'esgotado' end,
  'Lote inicial criado automaticamente a partir do estoque existente.'
from public.products p
on conflict (organization_id, product_id, lot_number) do nothing;

create or replace function public.validate_inventory_lot_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_organization_id uuid;
  lot_product_id uuid;
begin
  if tg_table_name = 'inventory_lots' then
    select p.organization_id into related_organization_id
      from public.products p where p.id = new.product_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O produto não pertence ao lote de estoque.';
    end if;
    if new.location_id is not null then
      select l.organization_id into related_organization_id
        from public.organization_locations l where l.id = new.location_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'A filial não pertence ao lote de estoque.';
      end if;
    end if;
  else
    select l.organization_id, l.product_id
      into related_organization_id, lot_product_id
      from public.inventory_lots l where l.id = new.lot_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O lote não pertence ao movimento de estoque.';
    end if;
    if lot_product_id <> new.product_id then
      raise exception 'O produto não corresponde ao lote do movimento.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_inventory_lot_organization_trigger on public.inventory_lots;
create trigger validate_inventory_lot_organization_trigger
before insert or update on public.inventory_lots
for each row execute function public.validate_inventory_lot_organization();

drop trigger if exists validate_inventory_lot_movement_organization_trigger on public.inventory_lot_movements;
create trigger validate_inventory_lot_movement_organization_trigger
before insert or update on public.inventory_lot_movements
for each row execute function public.validate_inventory_lot_organization();

create or replace function public.sync_product_stock_from_lots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  product_id_value uuid;
  available_stock numeric(12,3);
begin
  product_id_value := coalesce(new.product_id, old.product_id);
  select coalesce(sum(l.quantity_available), 0)
    into available_stock
    from public.inventory_lots l
   where l.organization_id = coalesce(new.organization_id, old.organization_id)
     and l.product_id = product_id_value
     and l.status not in ('descartado', 'vencido');

  update public.products
     set stock = available_stock,
         updated_at = now()
   where id = product_id_value;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_product_stock_after_lot_change on public.inventory_lots;
create trigger sync_product_stock_after_lot_change
after insert or update or delete on public.inventory_lots
for each row execute function public.sync_product_stock_from_lots();

create or replace function public.inventory_receive_lot(
  _organization_id uuid,
  _product_id uuid,
  _lot_number text,
  _quantity numeric,
  _unit_cost numeric default 0,
  _expires_at date default null,
  _location_id uuid default null,
  _supplier_name text default null,
  _reason text default 'Entrada de estoque'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lot_id_value uuid;
  current_available numeric(12,3);
  movement_id_value uuid;
begin
  if not public.has_org_permission(_organization_id, 'estoque.editar') then
    raise exception 'Acesso negado para movimentar estoque.';
  end if;
  if _quantity <= 0 then raise exception 'A quantidade de entrada deve ser maior que zero.'; end if;
  if _unit_cost < 0 then raise exception 'O custo unitário não pode ser negativo.'; end if;

  insert into public.inventory_lots (
    organization_id, product_id, location_id, lot_number, expires_at,
    quantity_received, quantity_available, unit_cost, supplier_name, created_by
  ) values (
    _organization_id, _product_id, _location_id, trim(_lot_number), _expires_at,
    _quantity, _quantity, _unit_cost, _supplier_name, auth.uid()
  )
  on conflict (organization_id, product_id, lot_number)
  do update set
    quantity_received = public.inventory_lots.quantity_received + excluded.quantity_received,
    quantity_available = public.inventory_lots.quantity_available + excluded.quantity_available,
    unit_cost = excluded.unit_cost,
    expires_at = coalesce(excluded.expires_at, public.inventory_lots.expires_at),
    supplier_name = coalesce(excluded.supplier_name, public.inventory_lots.supplier_name),
    status = 'disponivel',
    updated_at = now()
  returning id, quantity_available into lot_id_value, current_available;

  insert into public.inventory_lot_movements (
    organization_id, lot_id, product_id, movement_type, quantity,
    quantity_before, quantity_after, unit_cost, total_cost, reason, performed_by
  ) values (
    _organization_id, lot_id_value, _product_id, 'entrada', _quantity,
    current_available - _quantity, current_available, _unit_cost,
    round((_quantity * _unit_cost)::numeric, 2), _reason, auth.uid()
  ) returning id into movement_id_value;

  return lot_id_value;
end;
$$;

grant execute on function public.inventory_receive_lot(uuid, uuid, text, numeric, numeric, date, uuid, text, text) to authenticated;

create or replace function public.inventory_consume_fefo(
  _organization_id uuid,
  _product_id uuid,
  _quantity numeric,
  _appointment_id uuid default null,
  _treatment_record_id uuid default null,
  _sale_id uuid default null,
  _reason text default 'Consumo de estoque'
)
returns table (lot_id uuid, quantity numeric, movement_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  lot_row record;
  remaining numeric(12,3);
  consumed numeric(12,3);
  new_movement_id uuid;
begin
  if not public.has_org_permission(_organization_id, 'estoque.editar') then
    raise exception 'Acesso negado para movimentar estoque.';
  end if;
  if _quantity <= 0 then raise exception 'A quantidade de consumo deve ser maior que zero.'; end if;

  remaining := _quantity;
  for lot_row in
    select l.id, l.product_id, l.quantity_available, l.unit_cost
      from public.inventory_lots l
     where l.organization_id = _organization_id
       and l.product_id = _product_id
       and l.status = 'disponivel'
       and l.quantity_available > 0
       and (l.expires_at is null or l.expires_at >= current_date)
     order by l.expires_at asc nulls last, l.received_at asc, l.id
     for update
  loop
    consumed := least(remaining, lot_row.quantity_available);

    update public.inventory_lots
       set quantity_available = quantity_available - consumed,
           status = case when quantity_available - consumed <= 0 then 'esgotado' else status end,
           updated_at = now()
     where id = lot_row.id;

    insert into public.inventory_lot_movements (
      organization_id, lot_id, product_id, movement_type, quantity,
      quantity_before, quantity_after, unit_cost, total_cost,
      appointment_id, treatment_record_id, sale_id, reason, performed_by
    ) values (
      _organization_id, lot_row.id, _product_id, 'consumo', consumed,
      lot_row.quantity_available, lot_row.quantity_available - consumed,
      lot_row.unit_cost, round((consumed * lot_row.unit_cost)::numeric, 2),
      _appointment_id, _treatment_record_id, _sale_id, _reason, auth.uid()
    ) returning id into new_movement_id;

    lot_id := lot_row.id;
    quantity := consumed;
    movement_id := new_movement_id;
    return next;

    remaining := remaining - consumed;
    exit when remaining <= 0;
  end loop;

  if remaining > 0 then
    raise exception 'Estoque insuficiente ou sem lote válido para o produto. Saldo faltante: %', remaining;
  end if;
  return;
end;
$$;

grant execute on function public.inventory_consume_fefo(uuid, uuid, numeric, uuid, uuid, uuid, text) to authenticated;

-- Timestamps e trilha imutável.
drop trigger if exists inventory_lots_updated_at on public.inventory_lots;
create trigger inventory_lots_updated_at
before update on public.inventory_lots
for each row execute function public.set_updated_at();

alter table public.inventory_lots enable row level security;
alter table public.inventory_lot_movements enable row level security;

grant select, insert, update, delete on public.inventory_lots to authenticated;
grant select on public.inventory_lot_movements to authenticated;
grant all on public.inventory_lots, public.inventory_lot_movements to service_role;

drop policy if exists inventory_lots_read on public.inventory_lots;
drop policy if exists inventory_lots_manage on public.inventory_lots;
create policy inventory_lots_read
on public.inventory_lots for select to authenticated
using (public.has_org_permission(organization_id, 'estoque.ver'));
create policy inventory_lots_manage
on public.inventory_lots for all to authenticated
using (public.has_org_permission(organization_id, 'estoque.editar'))
with check (public.has_org_permission(organization_id, 'estoque.editar'));

drop policy if exists inventory_lot_movements_read on public.inventory_lot_movements;
create policy inventory_lot_movements_read
on public.inventory_lot_movements for select to authenticated
using (public.has_org_permission(organization_id, 'estoque.ver'));

comment on table public.inventory_lots is 'Lotes de produtos e insumos com validade, custo e saldo disponível.';
comment on table public.inventory_lot_movements is 'Livro imutável de rastreabilidade por lote, consumo e custo.';
comment on function public.inventory_consume_fefo(uuid, uuid, numeric, uuid, uuid, uuid, text) is 'Consome lotes por FEFO e registra a origem operacional do consumo.';
comment on column public.inventory_lots.supplier_document is 'Documento ou referência do fornecedor; não armazena credenciais.';
