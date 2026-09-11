-- CRM client 360: indexes and automatic client classification.
create index if not exists appointments_client_starts_idx on public.appointments(client_id, starts_at desc);
create index if not exists sales_client_created_idx on public.sales(client_id, created_at desc);
create index if not exists payments_client_lookup_idx on public.payments(organization_id, paid_at desc);

create or replace function public.crm_refresh_client_status(_client_id uuid)
returns public.clients
language plpgsql security definer set search_path = public as $$
declare
  c public.clients;
  attended_count integer;
  total_spent numeric;
  last_attended timestamptz;
  next_appointment timestamptz;
  calculated text;
begin
  select * into c from public.clients where id = _client_id and public.is_org_member(organization_id) for update;
  if c.id is null then raise exception 'Cliente não encontrado'; end if;
  select count(*) filter (where status = 'atendido'), coalesce(sum(price) filter (where status = 'atendido'), 0), max(starts_at) filter (where status = 'atendido'), min(starts_at) filter (where starts_at >= now() and status not in ('cancelado','faltou'))
    into attended_count, total_spent, last_attended, next_appointment
    from public.appointments where client_id = c.id;
  calculated := case
    when c.is_vip or total_spent >= 2000 then 'vip'
    when last_attended is null then 'novo'
    when last_attended < now() - interval '60 days' then 'inativo'
    else 'ativo'
  end;
  update public.clients set crm_status = calculated, last_contact_at = coalesce(last_contact_at, last_attended), updated_at = now() where id = c.id returning * into c;
  return c;
end; $$;
grant execute on function public.crm_refresh_client_status(uuid) to authenticated;

create or replace function public.crm_refresh_client_status_after_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null then perform public.crm_refresh_client_status(new.client_id); end if;
  if tg_op = 'UPDATE' and old.client_id is not null and old.client_id is distinct from new.client_id then perform public.crm_refresh_client_status(old.client_id); end if;
  return new;
end; $$;
drop trigger if exists appointments_refresh_crm_status on public.appointments;
create trigger appointments_refresh_crm_status after insert or update of client_id, status, price, starts_at on public.appointments for each row execute function public.crm_refresh_client_status_after_appointment();

-- Backfill existing clients without changing manual VIP flags.
do $$
declare client_record record;
begin
  for client_record in select id from public.clients loop
    begin perform public.crm_refresh_client_status(client_record.id); exception when others then null; end;
  end loop;
end $$;
