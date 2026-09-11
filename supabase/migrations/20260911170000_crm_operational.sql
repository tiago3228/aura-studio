-- CRM operational stage: lead conversion with duplicate protection.
create or replace function public.crm_convert_lead(_lead_id uuid)
returns public.clients
language plpgsql security definer set search_path = public as $$
declare
  l public.crm_leads;
  c public.clients;
  normalized_phone text;
begin
  select * into l from public.crm_leads where id = _lead_id and public.is_org_member(organization_id) for update;
  if l.id is null then raise exception 'Lead não encontrado'; end if;
  normalized_phone := nullif(regexp_replace(coalesce(l.whatsapp, ''), '\D', '', 'g'), '');
  select * into c from public.clients
  where organization_id = l.organization_id and deleted_at is null
    and ((normalized_phone is not null and regexp_replace(coalesce(phone, whatsapp), '\D', '', 'g') = normalized_phone)
      or (l.email is not null and lower(email) = lower(l.email)))
  order by created_at asc limit 1;
  if c.id is null then
    insert into public.clients (organization_id, name, phone, whatsapp, email, instagram, birth_date, notes, origin)
    values (l.organization_id, l.name, l.whatsapp, l.whatsapp, l.email, l.instagram, l.birth_date, l.notes, l.source)
    returning * into c;
  end if;
  update public.crm_leads set client_id = c.id, stage = 'converteu', converted_at = now(), updated_at = now() where id = l.id;
  return c;
end; $$;
grant execute on function public.crm_convert_lead(uuid) to authenticated;
create index if not exists crm_interactions_lead_idx on public.crm_interactions(lead_id, occurred_at desc);
create index if not exists crm_interactions_client_idx on public.crm_interactions(client_id, occurred_at desc);
