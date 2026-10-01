-- Fase 7: Portal do Paciente e Agendamento Online.
--
-- O Aura já possui o catálogo público em /agendar/:slug e usa appointments,
-- clients e treatment_records. Esta migration adiciona rastreabilidade das
-- solicitações online e acesso seguro por token hash, sem expor prontuário ou
-- dados pessoais por consultas anônimas diretas.

create table if not exists public.online_booking_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  requested_starts_at timestamptz not null,
  requested_ends_at timestamptz not null,
  guest_name text not null,
  guest_phone text,
  guest_email text,
  notes text,
  status text not null default 'pendente'
    check (status in ('pendente', 'confirmado', 'recusado', 'cancelado', 'expirado', 'concluido')),
  source text not null default 'web',
  idempotency_key text not null,
  consent_data_processing boolean not null default false,
  consent_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  check (requested_ends_at > requested_starts_at),
  check (char_length(trim(guest_name)) >= 2),
  check (guest_phone is null or char_length(trim(guest_phone)) >= 8)
);

create index if not exists online_booking_requests_org_status_idx
  on public.online_booking_requests (organization_id, status, requested_starts_at desc);

create index if not exists online_booking_requests_client_idx
  on public.online_booking_requests (organization_id, client_id, created_at desc);

create table if not exists public.patient_portal_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  token_expires_at timestamptz not null,
  active boolean not null default true,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (token_expires_at > created_at),
  check (active or revoked_at is not null)
);

create unique index if not exists patient_portal_access_active_client_uidx
  on public.patient_portal_access (organization_id, client_id)
  where active and revoked_at is null;

create index if not exists patient_portal_access_expiration_idx
  on public.patient_portal_access (token_expires_at)
  where active and revoked_at is null;

create table if not exists public.patient_portal_access_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  portal_access_id uuid references public.patient_portal_access(id) on delete set null,
  action text not null
    check (action in ('login', 'view_profile', 'view_history', 'view_appointments', 'cancel_appointment', 'booking_request')),
  appointment_id uuid references public.appointments(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists patient_portal_access_log_client_idx
  on public.patient_portal_access_log (organization_id, client_id, created_at desc);

create or replace function public.validate_patient_portal_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_organization_id uuid;
  appointment_organization_id uuid;
begin
  if tg_table_name = 'patient_portal_access' then
    select c.organization_id into client_organization_id from public.clients c where c.id = new.client_id;
    if client_organization_id is null or client_organization_id <> new.organization_id then
      raise exception 'O cliente não pertence ao portal da organização.';
    end if;
  elsif tg_table_name = 'patient_portal_access_log' then
    select c.organization_id into client_organization_id from public.clients c where c.id = new.client_id;
    if client_organization_id is null or client_organization_id <> new.organization_id then
      raise exception 'O cliente não pertence ao registro do portal.';
    end if;
  else
    if new.client_id is not null then
      select c.organization_id into client_organization_id from public.clients c where c.id = new.client_id;
      if client_organization_id is null or client_organization_id <> new.organization_id then
        raise exception 'O cliente não pertence à solicitação online.';
      end if;
    end if;
    if new.appointment_id is not null then
      select a.organization_id into appointment_organization_id from public.appointments a where a.id = new.appointment_id;
      if appointment_organization_id is null or appointment_organization_id <> new.organization_id then
        raise exception 'O agendamento não pertence à solicitação online.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_online_booking_request_organization on public.online_booking_requests;
create trigger validate_online_booking_request_organization
before insert or update on public.online_booking_requests
for each row execute function public.validate_patient_portal_organization();

drop trigger if exists validate_patient_portal_access_organization on public.patient_portal_access;
create trigger validate_patient_portal_access_organization
before insert or update on public.patient_portal_access
for each row execute function public.validate_patient_portal_organization();

drop trigger if exists validate_patient_portal_access_log_organization on public.patient_portal_access_log;
create trigger validate_patient_portal_access_log_organization
before insert or update on public.patient_portal_access_log
for each row execute function public.validate_patient_portal_organization();

create or replace function public.sync_online_booking_request_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_status text;
begin
  if new.source <> 'online' then return new; end if;

  request_status := case new.status::text
    when 'confirmado' then 'confirmado'
    when 'atendido' then 'concluido'
    when 'cancelado' then 'cancelado'
    when 'faltou' then 'concluido'
    else 'pendente'
  end;

  insert into public.online_booking_requests (
    organization_id, client_id, appointment_id, professional_id, service_id,
    requested_starts_at, requested_ends_at, guest_name, guest_phone, guest_email,
    notes, status, source, idempotency_key
  ) values (
    new.organization_id, new.client_id, new.id, new.professional_id, new.service_id,
    new.starts_at, new.ends_at, coalesce(new.guest_name, 'Paciente'),
    coalesce(new.guest_phone, ''), new.guest_email, new.notes, request_status,
    'web', 'appointment:' || new.id::text
  )
  on conflict (organization_id, idempotency_key) do update set
    appointment_id = excluded.appointment_id,
    client_id = excluded.client_id,
    professional_id = excluded.professional_id,
    service_id = excluded.service_id,
    requested_starts_at = excluded.requested_starts_at,
    requested_ends_at = excluded.requested_ends_at,
    status = excluded.status,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_online_request_sync on public.appointments;
create trigger appointments_online_request_sync
after insert or update of status, starts_at, ends_at, client_id, professional_id, service_id
on public.appointments for each row execute function public.sync_online_booking_request_from_appointment();

-- Backfill dos agendamentos web já existentes.
insert into public.online_booking_requests (
  organization_id, client_id, appointment_id, professional_id, service_id,
  requested_starts_at, requested_ends_at, guest_name, guest_phone, guest_email,
  notes, status, source, idempotency_key, created_at, updated_at
)
select
  a.organization_id, a.client_id, a.id, a.professional_id, a.service_id,
  a.starts_at, a.ends_at, coalesce(a.guest_name, 'Paciente'), coalesce(a.guest_phone, ''),
  a.guest_email, a.notes,
  case a.status::text
    when 'confirmado' then 'confirmado'
    when 'atendido' then 'concluido'
    when 'cancelado' then 'cancelado'
    when 'faltou' then 'concluido'
    else 'pendente'
  end,
  'web', 'appointment:' || a.id::text, a.created_at, a.updated_at
from public.appointments a
where a.source = 'online'
on conflict (organization_id, idempotency_key) do nothing;

create or replace function public.patient_portal_issue_access(
  _organization_id uuid,
  _client_id uuid,
  _token_hash text,
  _token_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare access_id_value uuid;
begin
  if not public.has_org_permission(_organization_id, 'clientes.editar') then
    raise exception 'Acesso negado para criar acesso do portal.';
  end if;
  if _token_hash is null or char_length(trim(_token_hash)) < 32 then
    raise exception 'O hash do token do portal é inválido.';
  end if;
  if _token_expires_at <= now() then raise exception 'O token já está expirado.'; end if;

  update public.patient_portal_access
     set active = false, revoked_at = coalesce(revoked_at, now()), updated_at = now()
   where organization_id = _organization_id and client_id = _client_id and active;

  insert into public.patient_portal_access (
    organization_id, client_id, token_hash, token_expires_at, created_by
  ) values (
    _organization_id, _client_id, trim(_token_hash), _token_expires_at, auth.uid()
  ) returning id into access_id_value;
  return access_id_value;
end;
$$;

grant execute on function public.patient_portal_issue_access(uuid, uuid, text, timestamptz) to authenticated;

create or replace function public.patient_portal_get_profile(_token_hash text)
returns table (organization_id uuid, client_id uuid, name text, email text, phone text)
language plpgsql
security definer
set search_path = public
as $$
declare access_row public.patient_portal_access;
begin
  select * into access_row from public.patient_portal_access a
   where a.token_hash = trim(_token_hash)
     and a.active and a.revoked_at is null and a.token_expires_at > now();
  if access_row.id is null then raise exception 'Acesso do portal inválido ou expirado.'; end if;

  update public.patient_portal_access set last_accessed_at = now(), updated_at = now() where id = access_row.id;
  insert into public.patient_portal_access_log (organization_id, client_id, portal_access_id, action)
  values (access_row.organization_id, access_row.client_id, access_row.id, 'view_profile');

  return query select c.organization_id, c.id, c.name, c.email, c.phone
    from public.clients c where c.id = access_row.client_id and c.deleted_at is null;
end;
$$;

grant execute on function public.patient_portal_get_profile(text) to anon, authenticated;

create or replace function public.patient_portal_get_history(_token_hash text)
returns table (
  appointment_id uuid,
  treatment_record_id uuid,
  performed_at timestamptz,
  procedure text,
  service_name text,
  professional_name text,
  evolution text,
  next_steps text
)
language plpgsql
security definer
set search_path = public
as $$
declare access_row public.patient_portal_access;
begin
  select * into access_row from public.patient_portal_access a
   where a.token_hash = trim(_token_hash)
     and a.active and a.revoked_at is null and a.token_expires_at > now();
  if access_row.id is null then raise exception 'Acesso do portal inválido ou expirado.'; end if;

  insert into public.patient_portal_access_log (organization_id, client_id, portal_access_id, action)
  values (access_row.organization_id, access_row.client_id, access_row.id, 'view_history');

  return query
  select tr.appointment_id, tr.id, tr.performed_at, tr.procedure,
         s.name, p.name, tr.evolution, tr.next_steps
    from public.treatment_records tr
    left join public.services s on s.id = tr.service_id
    left join public.professionals p on p.id = tr.professional_id
   where tr.organization_id = access_row.organization_id
     and tr.client_id = access_row.client_id
   order by tr.performed_at desc;
end;
$$;

grant execute on function public.patient_portal_get_history(text) to anon, authenticated;

create or replace function public.patient_portal_get_appointments(_token_hash text)
returns table (
  appointment_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  service_name text,
  professional_name text,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare access_row public.patient_portal_access;
begin
  select * into access_row from public.patient_portal_access a
   where a.token_hash = trim(_token_hash)
     and a.active and a.revoked_at is null and a.token_expires_at > now();
  if access_row.id is null then raise exception 'Acesso do portal inválido ou expirado.'; end if;

  insert into public.patient_portal_access_log (organization_id, client_id, portal_access_id, action)
  values (access_row.organization_id, access_row.client_id, access_row.id, 'view_appointments');

  return query
  select a.id, a.starts_at, a.ends_at, a.status, s.name, p.name, a.notes
    from public.appointments a
    left join public.services s on s.id = a.service_id
    left join public.professionals p on p.id = a.professional_id
   where a.organization_id = access_row.organization_id
     and a.client_id = access_row.client_id
     and a.status not in ('cancelado', 'faltou')
   order by a.starts_at desc;
end;
$$;

grant execute on function public.patient_portal_get_appointments(text) to anon, authenticated;

create or replace function public.patient_portal_cancel_appointment(
  _token_hash text,
  _appointment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare access_row public.patient_portal_access;
changed boolean;
begin
  select * into access_row from public.patient_portal_access a
   where a.token_hash = trim(_token_hash)
     and a.active and a.revoked_at is null and a.token_expires_at > now();
  if access_row.id is null then raise exception 'Acesso do portal inválido ou expirado.'; end if;

  update public.appointments
     set status = 'cancelado', updated_at = now(), notes = concat_ws(' · ', notes, 'Cancelado pelo portal do paciente')
   where id = _appointment_id
     and organization_id = access_row.organization_id
     and client_id = access_row.client_id
     and starts_at > now() + interval '24 hours'
     and status not in ('cancelado', 'faltou', 'atendido');
  changed := found;

  if changed then
    insert into public.patient_portal_access_log (organization_id, client_id, portal_access_id, action, appointment_id)
    values (access_row.organization_id, access_row.client_id, access_row.id, 'cancel_appointment', _appointment_id);
  end if;
  return changed;
end;
$$;

grant execute on function public.patient_portal_cancel_appointment(text, uuid) to anon, authenticated;

-- RLS: solicitações e tokens são dados internos; o paciente usa apenas as RPCs.
alter table public.online_booking_requests enable row level security;
alter table public.patient_portal_access enable row level security;
alter table public.patient_portal_access_log enable row level security;

grant select, insert, update on public.online_booking_requests to authenticated;
grant select, insert, update, delete on public.patient_portal_access to authenticated;
grant select on public.patient_portal_access_log to authenticated;
grant all on public.online_booking_requests, public.patient_portal_access, public.patient_portal_access_log to service_role;

drop policy if exists online_booking_requests_read on public.online_booking_requests;
drop policy if exists online_booking_requests_manage on public.online_booking_requests;
create policy online_booking_requests_read
on public.online_booking_requests for select to authenticated
using (public.has_org_permission(organization_id, 'agenda.ver'));
create policy online_booking_requests_manage
on public.online_booking_requests for all to authenticated
using (public.has_org_permission(organization_id, 'agenda.editar'))
with check (public.has_org_permission(organization_id, 'agenda.editar'));

drop policy if exists patient_portal_access_read on public.patient_portal_access;
drop policy if exists patient_portal_access_manage on public.patient_portal_access;
create policy patient_portal_access_read
on public.patient_portal_access for select to authenticated
using (public.has_org_permission(organization_id, 'clientes.ver'));
create policy patient_portal_access_manage
on public.patient_portal_access for all to authenticated
using (public.has_org_permission(organization_id, 'clientes.editar'))
with check (public.has_org_permission(organization_id, 'clientes.editar'));

drop policy if exists patient_portal_access_log_read on public.patient_portal_access_log;
create policy patient_portal_access_log_read
on public.patient_portal_access_log for select to authenticated
using (public.has_org_permission(organization_id, 'clientes.ver'));

revoke all on public.patient_portal_access, public.patient_portal_access_log from anon;

comment on table public.online_booking_requests is 'Solicitações web vinculadas aos appointments existentes e ao status de confirmação.';
comment on table public.patient_portal_access is 'Acessos do portal por hash de token; o token original nunca é armazenado.';
comment on table public.patient_portal_access_log is 'Auditoria mínima de acessos e ações realizadas no portal do paciente.';
comment on function public.patient_portal_get_history(text) is 'Retorna somente o histórico de procedimentos do cliente autenticado por token válido.';
comment on function public.patient_portal_cancel_appointment(text, uuid) is 'Permite cancelamento pelo portal somente com antecedência mínima de 24 horas.';
