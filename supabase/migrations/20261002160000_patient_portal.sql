-- Portal público individual da paciente. O token é armazenado somente como hash.
create extension if not exists pgcrypto;
create table if not exists public.patient_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists patient_portal_tokens_client_idx on public.patient_portal_tokens(client_id, created_at desc);
alter table public.patient_portal_tokens enable row level security;
grant select, insert, update on public.patient_portal_tokens to authenticated;
create policy patient_portal_tokens_admin on public.patient_portal_tokens for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create or replace function public.get_patient_portal(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  token_row public.patient_portal_tokens;
  result jsonb;
begin
  select * into token_row from public.patient_portal_tokens
  where token_hash = encode(digest(_token, 'sha256'), 'hex')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
  if token_row.id is null then raise exception 'Link do portal inválido ou expirado.' using errcode = '28000'; end if;
  select jsonb_build_object(
    'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = token_row.client_id),
    'records', coalesce((select jsonb_agg(jsonb_build_object(
      'performed_at', r.performed_at,
      'procedure', r.procedure,
      'evolution', r.evolution,
      'weight_kg', r.weight_kg,
      'height_cm', r.height_cm,
      'bust_cm', r.bust_cm,
      'waist_cm', r.waist_cm,
      'hip_cm', r.hip_cm,
      'arm_cm', r.arm_cm,
      'thigh_cm', r.thigh_cm,
      'photos', coalesce((select jsonb_agg(jsonb_build_object('stage', p->>'stage', 'label', p->>'label', 'url', (select signed_url from storage.create_signed_url(p->>'path', 3600)))) from jsonb_array_elements(r.photos) p), '[]'::jsonb)
    ) order by r.performed_at desc) from public.treatment_records r where r.client_id = token_row.client_id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_patient_portal(text) from public;
grant execute on function public.get_patient_portal(text) to anon, authenticated;
