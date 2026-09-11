-- Public bookings run server-side without an authenticated user. The previous
-- CRM refresh function required is_org_member(auth.uid()), causing the
-- appointment insert trigger to raise "Cliente não encontrado" even when the
-- client had just been created.
create or replace function public.crm_refresh_client_status(_client_id uuid)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clients;
  attended_count integer;
  total_spent numeric;
  last_attended timestamptz;
  next_appointment timestamptz;
  calculated text;
begin
  select * into c from public.clients where id = _client_id for update;
  if c.id is null then raise exception 'Cliente não encontrado'; end if;
  if auth.uid() is not null and not public.is_org_member(c.organization_id) then
    raise exception 'Acesso negado';
  end if;
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
