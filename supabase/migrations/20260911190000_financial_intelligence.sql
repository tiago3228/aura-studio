-- Advanced financial intelligence: safe tenant-scoped RPC over existing tables.
create index if not exists sales_org_period_idx on public.sales(organization_id, created_at desc);
create index if not exists appointments_org_period_status_idx on public.appointments(organization_id, starts_at desc, status);
create index if not exists sale_items_service_idx on public.sale_items(organization_id, service_id, sale_id);
create index if not exists payments_org_period_status_idx on public.payments(organization_id, paid_at desc, status);

create or replace function public.get_financial_intelligence(_from date, _to date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  org uuid;
  revenue numeric := 0; costs numeric := 0; paid numeric := 0; avg_ticket numeric := 0;
  attended integer := 0; cancelled integer := 0; missed integer := 0; total_appointments integer := 0;
  result jsonb;
begin
  select organization_id into org from public.organization_members where user_id = auth.uid() and active = true limit 1;
  if org is null then raise exception 'Organização não encontrada'; end if;
  select coalesce(sum(total),0), coalesce(sum(cost),0), count(*) into revenue, costs, total_appointments from public.sales where organization_id = org and created_at >= _from::timestamptz and created_at < (_to + 1)::timestamptz;
  select coalesce(sum(amount) filter (where status = 'pago'),0) into paid from public.payments where organization_id = org and coalesce(paid_at, created_at) >= _from::timestamptz and coalesce(paid_at, created_at) < (_to + 1)::timestamptz;
  select count(*) filter (where status = 'atendido'), count(*) filter (where status = 'cancelado'), count(*) filter (where status = 'faltou'), count(*) into attended, cancelled, missed, total_appointments from public.appointments where organization_id = org and starts_at >= _from::timestamptz and starts_at < (_to + 1)::timestamptz;
  avg_ticket := case when attended > 0 then revenue / attended else 0 end;
  select jsonb_build_object(
    'period', jsonb_build_object('from', _from, 'to', _to),
    'summary', jsonb_build_object('revenue', revenue, 'costs', costs, 'gross_margin', revenue - costs, 'margin_percent', case when revenue > 0 then round(((revenue-costs)/revenue)*100,2) else 0 end, 'paid', paid, 'average_ticket', round(avg_ticket,2), 'appointments', total_appointments, 'attended', attended, 'cancelled', cancelled, 'missed', missed, 'attendance_rate', case when total_appointments > 0 then round((attended::numeric/total_appointments)*100,2) else 0 end, 'no_show_rate', case when total_appointments > 0 then round((missed::numeric/total_appointments)*100,2) else 0 end),
    'top_services', coalesce((select jsonb_agg(row_to_json(x)) from (select coalesce(si.description, s.name, 'Avulso') as service, sum(si.total) as revenue, sum(si.quantity) as quantity from public.sale_items si left join public.services s on s.id = si.service_id where si.organization_id = org and exists (select 1 from public.sales sa where sa.id = si.sale_id and sa.created_at >= _from::timestamptz and sa.created_at < (_to + 1)::timestamptz) group by coalesce(si.description, s.name, 'Avulso') order by sum(si.total) desc limit 10) x), '[]'::jsonb),
    'by_month', coalesce((select jsonb_agg(row_to_json(x) order by x.month) from (select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, sum(total) as revenue, sum(cost) as costs from public.sales where organization_id = org and created_at >= _from::timestamptz and created_at < (_to + 1)::timestamptz group by date_trunc('month', created_at)) x), '[]'::jsonb)
  ) into result;
  return result;
end; $$;
grant execute on function public.get_financial_intelligence(date,date) to authenticated;
