-- Aura: cupons, utilizações e clientes em recuperação
create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  starts_at date,
  expires_at date,
  active boolean not null default true,
  single_use_per_client boolean not null default false,
  max_uses integer check (max_uses is null or max_uses > 0),
  applies_to_all_services boolean not null default true,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_coupon_dates check (expires_at is null or starts_at is null or expires_at >= starts_at)
);
create unique index if not exists discount_coupons_org_code_idx
  on public.discount_coupons(organization_id, upper(code));

create table if not exists public.discount_coupon_services (
  coupon_id uuid not null references public.discount_coupons(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (coupon_id, service_id)
);

create table if not exists public.discount_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coupon_id uuid not null references public.discount_coupons(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  original_amount numeric(10,2) not null check (original_amount >= 0),
  discount_amount numeric(10,2) not null check (discount_amount >= 0),
  final_amount numeric(10,2) not null check (final_amount >= 0),
  redeemed_at timestamptz not null default now()
);
create index if not exists discount_redemptions_coupon_idx on public.discount_coupon_redemptions(coupon_id, redeemed_at desc);
create index if not exists discount_redemptions_client_idx
  on public.discount_coupon_redemptions(coupon_id, client_id) where client_id is not null;

create table if not exists public.organization_recovery_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default true,
  inactivity_days integer not null default 60 check (inactivity_days between 1 and 730),
  updated_at timestamptz not null default now()
);

alter table public.discount_coupons enable row level security;
alter table public.discount_coupon_services enable row level security;
alter table public.discount_coupon_redemptions enable row level security;
alter table public.organization_recovery_settings enable row level security;

grant select, insert, update, delete on public.discount_coupons to authenticated;
grant select, insert, update, delete on public.discount_coupon_services to authenticated;
grant select, insert, update, delete on public.discount_coupon_redemptions to authenticated;
grant select, insert, update, delete on public.organization_recovery_settings to authenticated;
grant all on public.discount_coupons, public.discount_coupon_services, public.discount_coupon_redemptions, public.organization_recovery_settings to service_role;

drop policy if exists discount_coupons_member_all on public.discount_coupons;
create policy discount_coupons_member_all on public.discount_coupons for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists discount_coupon_services_member_all on public.discount_coupon_services;
create policy discount_coupon_services_member_all on public.discount_coupon_services for all to authenticated
  using (exists (select 1 from public.discount_coupons c where c.id = coupon_id and public.is_org_admin(c.organization_id)))
  with check (exists (select 1 from public.discount_coupons c where c.id = coupon_id and public.is_org_admin(c.organization_id)));
drop policy if exists discount_redemptions_member_read on public.discount_coupon_redemptions;
create policy discount_redemptions_member_read on public.discount_coupon_redemptions for select to authenticated
  using (public.is_org_member(organization_id));
drop policy if exists recovery_settings_admin_all on public.organization_recovery_settings;
create policy recovery_settings_admin_all on public.organization_recovery_settings for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Validação pública centralizada: o navegador nunca decide se o cupom é válido.
create or replace function public.validate_public_coupon(
  _slug text, _code text, _service_ids uuid[] default '{}', _client_phone text default null
) returns table(valid boolean, message text, coupon_id uuid, percentage numeric, original_code text)
language plpgsql security definer set search_path = public as $$
declare _org uuid; _coupon discount_coupons%rowtype; _today date := current_date; _uses integer; _client uuid; _eligible boolean;
begin
  select id into _org from organizations where booking_slug = _slug and online_booking_enabled = true;
  if _org is null then return query select false, 'Agendamento online indisponível.'::text, null::uuid, null::numeric, null::text; return; end if;
  select * into _coupon from discount_coupons where organization_id = _org and upper(code) = upper(trim(_code)) limit 1;
  if _coupon.id is null then return query select false, 'Cupom não encontrado.'::text, null::uuid, null::numeric, null::text; return; end if;
  if not _coupon.active then return query select false, 'Este cupom está inativo.'::text, _coupon.id, _coupon.percentage, _coupon.code; return; end if;
  if _coupon.starts_at is not null and _today < _coupon.starts_at then return query select false, 'Este cupom ainda não está válido.'::text, _coupon.id, _coupon.percentage, _coupon.code; return; end if;
  if _coupon.expires_at is not null and _today > _coupon.expires_at then return query select false, 'Este cupom está expirado.'::text, _coupon.id, _coupon.percentage, _coupon.code; return; end if;
  select count(*) into _uses from discount_coupon_redemptions where coupon_id = _coupon.id;
  if _coupon.max_uses is not null and _uses >= _coupon.max_uses then return query select false, 'Este cupom atingiu o limite de utilizações.'::text, _coupon.id, _coupon.percentage, _coupon.code; return; end if;
  if _client_phone is not null and length(regexp_replace(_client_phone, '\D', '', 'g')) > 0 then
    select id into _client from clients where organization_id = _org and (phone = regexp_replace(_client_phone, '\D', '', 'g') or whatsapp = regexp_replace(_client_phone, '\D', '', 'g')) and deleted_at is null limit 1;
    if _coupon.single_use_per_client and _client is not null and exists (select 1 from discount_coupon_redemptions where coupon_id = _coupon.id and client_id = _client) then
      return query select false, 'Este cupom já foi utilizado por este cliente.'::text, _coupon.id, _coupon.percentage, _coupon.code; return;
    end if;
  end if;
  if not _coupon.applies_to_all_services then
    select exists (select 1 from discount_coupon_services where coupon_id = _coupon.id and service_id = any(_service_ids)) into _eligible;
    if not coalesce(_eligible, false) then return query select false, 'Este cupom não se aplica ao procedimento escolhido.'::text, _coupon.id, _coupon.percentage, _coupon.code; return; end if;
  end if;
  return query select true, 'Cupom aplicado.'::text, _coupon.id, _coupon.percentage, _coupon.code;
end $$;

grant execute on function public.validate_public_coupon(text, text, uuid[], text) to anon, authenticated, service_role;

create or replace function public.record_public_coupon_redemption(
  _coupon_id uuid, _client_id uuid, _appointment_id uuid, _service_id uuid,
  _original_amount numeric, _discount_amount numeric, _final_amount numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _coupon discount_coupons%rowtype; _id uuid; _uses integer;
begin
  select * into _coupon from discount_coupons where id = _coupon_id for update;
  if _coupon.id is null or not _coupon.active then raise exception 'Cupom inválido'; end if;
  select count(*) into _uses from discount_coupon_redemptions where coupon_id = _coupon.id;
  if _coupon.max_uses is not null and _uses >= _coupon.max_uses then raise exception 'Limite do cupom atingido'; end if;
  if _coupon.single_use_per_client and _client_id is not null and exists (select 1 from discount_coupon_redemptions where coupon_id = _coupon.id and client_id = _client_id) then raise exception 'Cupom já utilizado por este cliente'; end if;
  insert into discount_coupon_redemptions(organization_id,coupon_id,client_id,appointment_id,service_id,original_amount,discount_amount,final_amount)
  values (_coupon.organization_id,_coupon_id,_client_id,_appointment_id,_service_id,greatest(0,_original_amount),greatest(0,_discount_amount),greatest(0,_final_amount)) returning id into _id;
  return _id;
end $$;
grant execute on function public.record_public_coupon_redemption(uuid, uuid, uuid, uuid, numeric, numeric, numeric) to service_role;

-- Notificações vinculadas à ficha do cliente para a área de recuperação.
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id uuid;
create index if not exists notifications_entity_idx on public.notifications(organization_id, entity_type, entity_id, created_at desc);

create or replace function public.refresh_recovery_notifications(_org_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare _days integer; _count integer := 0; _client record;
begin
  select inactivity_days into _days from organization_recovery_settings where organization_id = _org_id and enabled = true;
  if _days is null then
    select inactivity_days into _days from crm_retention_settings where organization_id = _org_id;
  end if;
  _days := coalesce(_days, 60);
  for _client in
    select c.id, c.name, max(a.starts_at) as last_attended
    from clients c left join appointments a on a.client_id = c.id and a.organization_id = _org_id and a.status = 'atendido'
    where c.organization_id = _org_id and c.deleted_at is null
    group by c.id, c.name
    having max(a.starts_at) is not null and max(a.starts_at) <= now() - make_interval(days => _days)
  loop
    if not exists (select 1 from notifications n where n.organization_id = _org_id and n.entity_type = 'recovery_client' and n.entity_id = _client.id and n.read = false) then
      insert into notifications(organization_id,title,body,kind,entity_type,entity_id)
      values (_org_id, 'Cliente em recuperação', _client.name || ' está sem retornar há ' || _days || ' dias.', 'recovery', 'recovery_client', _client.id);
      _count := _count + 1;
    end if;
  end loop;
  return _count;
end $$;
grant execute on function public.refresh_recovery_notifications(uuid) to authenticated;
