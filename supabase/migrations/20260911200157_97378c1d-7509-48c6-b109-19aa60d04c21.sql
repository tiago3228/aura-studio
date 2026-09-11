create or replace function public.declare_pix_payment(
  _months integer default 1,
  _note text default null,
  _amount numeric default 49.90,
  _pix_key text default 'tiago3228@gmail.com'
)
returns public.pix_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  _org_id uuid;
  _role text;
  _subscription_id uuid;
  _result public.pix_payments;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;
  if _months < 1 or _months > 12 then
    raise exception 'Quantidade de meses inválida';
  end if;
  if length(coalesce(_note, '')) > 500 then
    raise exception 'Observação muito longa';
  end if;

  select organization_id, role
    into _org_id, _role
  from public.organization_members
  where user_id = auth.uid() and active = true
  order by created_at asc
  limit 1;

  if _org_id is null then
    raise exception 'Clínica não encontrada';
  end if;
  if _role not in ('owner', 'manager') then
    raise exception 'Apenas proprietária ou gerente pode informar o pagamento';
  end if;
  if exists (
    select 1 from public.pix_payments
    where organization_id = _org_id and status = 'pending'
  ) then
    raise exception 'Já existe um pagamento aguardando liberação';
  end if;

  select id into _subscription_id
  from public.subscriptions
  where organization_id = _org_id;

  insert into public.pix_payments (
    organization_id, subscription_id, amount, months, pix_key, payer_note, requested_by
  ) values (
    _org_id, _subscription_id, _amount * _months, _months, _pix_key, nullif(trim(_note), ''), auth.uid()
  ) returning * into _result;

  insert into public.subscription_events (
    organization_id, subscription_id, kind, status, amount
  ) values (
    _org_id, _subscription_id, 'pix_informado', 'pending', _amount * _months
  );

  return _result;
end;
$$;

revoke all on function public.declare_pix_payment(integer, text, numeric, text) from public;
grant execute on function public.declare_pix_payment(integer, text, numeric, text) to authenticated;

create or replace function public.review_pix_payment(
  _payment_id uuid,
  _approve boolean,
  _note text default null
)
returns public.pix_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  _payment public.pix_payments;
  _subscription public.subscriptions;
  _base timestamptz;
  _period_end timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito';
  end if;
  if length(coalesce(_note, '')) > 500 then
    raise exception 'Observação muito longa';
  end if;

  select * into _payment
  from public.pix_payments
  where id = _payment_id
  for update;

  if _payment.id is null then
    raise exception 'Pagamento não encontrado';
  end if;
  if _payment.status <> 'pending' then
    raise exception 'Este pagamento já foi revisado';
  end if;

  update public.pix_payments
  set status = case when _approve then 'approved' else 'rejected' end,
      admin_note = nullif(trim(_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = _payment_id
  returning * into _payment;

  if _approve then
    select * into _subscription
    from public.subscriptions
    where organization_id = _payment.organization_id
    for update;

    if _subscription.id is null then
      insert into public.subscriptions (
        organization_id, plan, status, amount, current_period_end, created_by
      ) values (
        _payment.organization_id, 'pro', 'active', 49.90,
        now() + make_interval(months => coalesce(_payment.months, 1)), auth.uid()
      ) returning * into _subscription;
    else
      _base := greatest(coalesce(_subscription.current_period_end, now()), now());
      _period_end := _base + make_interval(months => coalesce(_payment.months, 1));
      update public.subscriptions
      set status = 'active', plan = 'pro', amount = 49.90,
          current_period_end = _period_end, canceled_at = null
      where id = _subscription.id
      returning * into _subscription;
    end if;
  end if;

  insert into public.subscription_events (
    organization_id, subscription_id, kind, status, amount
  ) values (
    _payment.organization_id,
    coalesce(_payment.subscription_id, _subscription.id),
    case when _approve then 'pix_liberado' else 'pix_recusado' end,
    case when _approve then 'active' else 'rejected' end,
    _payment.amount
  );

  return _payment;
end;
$$;

revoke all on function public.review_pix_payment(uuid, boolean, text) from public;
grant execute on function public.review_pix_payment(uuid, boolean, text) to authenticated;