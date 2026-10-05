-- WhatsApp Business Platform (Meta) — requer a migration-base whatsapp_inbox anterior.
-- Access token guardado no Vault; PIN de registro é fornecido pela clínica e usado
-- somente em memória durante o setup, nunca persistido no banco ou em logs.

begin;

create extension if not exists supabase_vault with schema vault;

alter table public.whatsapp_integrations
  add column if not exists onboarding_state text not null default 'disconnected';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.whatsapp_integrations'::regclass
      and conname = 'whatsapp_integrations_onboarding_state_check'
  ) then
    alter table public.whatsapp_integrations
      add constraint whatsapp_integrations_onboarding_state_check
      check (onboarding_state in ('disconnected', 'pending_setup', 'connected', 'failed'));
  end if;
end;
$$;

create table if not exists public.whatsapp_message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.whatsapp_integrations(id) on delete cascade,
  meta_template_id text not null,
  name text not null,
  language text not null,
  category text not null,
  status text not null,
  components jsonb not null default '[]'::jsonb,
  quality_score text,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, meta_template_id),
  unique (integration_id, name, language)
);
create index if not exists whatsapp_meta_templates_org_status_idx
  on public.whatsapp_message_templates (organization_id, status, category);

create table if not exists public.whatsapp_automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null check (event_key in (
    'appointment_confirmation', 'appointment_reminder_24h',
    'appointment_reminder_2h', 'post_appointment'
  )),
  template_id uuid references public.whatsapp_message_templates(id) on delete set null,
  enabled boolean not null default false,
  offset_minutes integer not null default 0 check (offset_minutes between -10080 and 10080),
  require_opt_in boolean not null default true check (require_opt_in = true),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_key)
);

-- Fila sem telefone ou texto de cliente: os dados são resolvidos no backend no envio.
create table if not exists public.whatsapp_automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.whatsapp_automation_rules(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text not null unique,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists whatsapp_automation_jobs_due_idx
  on public.whatsapp_automation_jobs (scheduled_for, status)
  where status = 'queued';

-- Deduplicação no nível do banco: retries do provedor não podem criar a mesma mensagem duas vezes.
create unique index if not exists whatsapp_messages_provider_id_uidx
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;

-- A tabela contém apenas a referência do token no Vault; PIN de registro não é persistido.
create table if not exists public.whatsapp_integration_secret_refs (
  integration_id uuid primary key references public.whatsapp_integrations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  access_token_secret_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_message_templates enable row level security;
alter table public.whatsapp_automation_rules enable row level security;
alter table public.whatsapp_automation_jobs enable row level security;
alter table public.whatsapp_integration_secret_refs enable row level security;

revoke all on public.whatsapp_message_templates from anon, authenticated;
grant select on public.whatsapp_message_templates to authenticated;
grant all on public.whatsapp_message_templates to service_role;
drop policy if exists whatsapp_meta_templates_member_read on public.whatsapp_message_templates;
create policy whatsapp_meta_templates_member_read
  on public.whatsapp_message_templates for select to authenticated
  using (public.has_org_permission(organization_id, 'whatsapp.ver'));

revoke all on public.whatsapp_automation_rules from anon, authenticated;
grant select, insert, update, delete on public.whatsapp_automation_rules to authenticated;
grant all on public.whatsapp_automation_rules to service_role;
drop policy if exists whatsapp_automation_rules_member_read on public.whatsapp_automation_rules;
drop policy if exists whatsapp_automation_rules_admin_manage on public.whatsapp_automation_rules;
create policy whatsapp_automation_rules_member_read
  on public.whatsapp_automation_rules for select to authenticated
  using (public.has_org_permission(organization_id, 'whatsapp.ver'));
create policy whatsapp_automation_rules_admin_manage
  on public.whatsapp_automation_rules for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create or replace function public.validate_whatsapp_automation_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template_organization_id uuid;
  template_status text;
begin
  if new.require_opt_in is not true then
    raise exception 'whatsapp_opt_in_required' using errcode = '23514';
  end if;
  if new.template_id is null then
    if new.enabled then
      raise exception 'approved_template_required' using errcode = '23514';
    end if;
    return new;
  end if;

  select organization_id, status into template_organization_id, template_status
  from public.whatsapp_message_templates
  where id = new.template_id;
  if not found or template_organization_id is distinct from new.organization_id then
    raise exception 'template_organization_mismatch' using errcode = '23503';
  end if;
  if new.enabled and upper(coalesce(template_status, '')) <> 'APPROVED' then
    raise exception 'approved_template_required' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists whatsapp_automation_rule_validate on public.whatsapp_automation_rules;
create trigger whatsapp_automation_rule_validate
before insert or update on public.whatsapp_automation_rules
for each row execute function public.validate_whatsapp_automation_rule();

create or replace function public.deactivate_whatsapp_rules_for_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if upper(coalesce(new.status, '')) <> 'APPROVED' then
    update public.whatsapp_automation_rules
      set enabled = false, updated_at = now()
      where organization_id = new.organization_id and template_id = new.id and enabled;
  end if;
  return new;
end;
$$;
drop trigger if exists whatsapp_template_status_deactivate_rules on public.whatsapp_message_templates;
create trigger whatsapp_template_status_deactivate_rules
after update of status on public.whatsapp_message_templates
for each row execute function public.deactivate_whatsapp_rules_for_template();

create or replace function public.deactivate_whatsapp_rules_before_template_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.whatsapp_automation_rules
    set enabled = false, updated_at = now()
    where organization_id = old.organization_id and template_id = old.id and enabled;
  return old;
end;
$$;
drop trigger if exists whatsapp_template_delete_deactivate_rules on public.whatsapp_message_templates;
create trigger whatsapp_template_delete_deactivate_rules
before delete on public.whatsapp_message_templates
for each row execute function public.deactivate_whatsapp_rules_before_template_delete();

revoke all on public.whatsapp_automation_jobs from anon, authenticated;
grant all on public.whatsapp_automation_jobs to service_role;
revoke all on public.whatsapp_integration_secret_refs from anon, authenticated;
grant all on public.whatsapp_integration_secret_refs to service_role;

-- Estas RPCs podem ser chamadas somente pelo backend com service_role.
create or replace function public.whatsapp_store_integration_secrets(
  _organization_id uuid,
  _integration_id uuid,
  _access_token text
)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  existing public.whatsapp_integration_secret_refs%rowtype;
  access_secret_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if length(_access_token) < 16 or length(_access_token) > 8192 then
    raise exception 'invalid_credentials' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.whatsapp_integrations
    where id = _integration_id and organization_id = _organization_id
  ) then
    raise exception 'integration_not_found' using errcode = '22023';
  end if;

  select * into existing
  from public.whatsapp_integration_secret_refs
  where integration_id = _integration_id
  for update;

  if found then
    access_secret_id := existing.access_token_secret_id;
    perform vault.update_secret(
      access_secret_id,
      _access_token,
      'whatsapp_access_' || _integration_id::text,
      'Meta WhatsApp access token for one Aura integration'
    );
    update public.whatsapp_integration_secret_refs
      set organization_id = _organization_id, updated_at = now()
      where integration_id = _integration_id;
  else
    access_secret_id := vault.create_secret(
      _access_token,
      'whatsapp_access_' || _integration_id::text,
      'Meta WhatsApp access token for one Aura integration'
    );
    insert into public.whatsapp_integration_secret_refs (
      integration_id, organization_id, access_token_secret_id
    ) values (
      _integration_id, _organization_id, access_secret_id
    );
  end if;
end;
$$;

create or replace function public.whatsapp_get_access_token_secret(_integration_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  result text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select access_secret.decrypted_secret into result
    from public.whatsapp_integration_secret_refs refs
    join vault.decrypted_secrets access_secret on access_secret.id = refs.access_token_secret_id
    where refs.integration_id = _integration_id;
  return result;
end;
$$;

-- Called only after the backend has successfully removed the WABA webhook
-- subscription. The function is transactional and scoped to one tenant/integration.
create or replace function public.whatsapp_disconnect_integration(
  _organization_id uuid,
  _integration_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  access_secret_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  perform 1 from public.whatsapp_integrations
    where id = _integration_id and organization_id = _organization_id
    for update;
  if not found then
    raise exception 'integration_not_found' using errcode = '22023';
  end if;

  select access_token_secret_id into access_secret_id
    from public.whatsapp_integration_secret_refs
    where integration_id = _integration_id and organization_id = _organization_id
    for update;

  if access_secret_id is not null then
    delete from vault.secrets where id = access_secret_id;
  end if;

  delete from public.whatsapp_integration_secret_refs
    where integration_id = _integration_id and organization_id = _organization_id;
  update public.whatsapp_automation_rules
    set enabled = false, updated_at = now()
    where organization_id = _organization_id and enabled;
  update public.whatsapp_automation_jobs
    set status = 'cancelled', processed_at = now()
    where organization_id = _organization_id and status = 'queued';
  update public.whatsapp_integrations
    set active = false, verified = false, onboarding_state = 'disconnected',
        last_error = null, last_error_at = null, updated_at = now()
    where id = _integration_id and organization_id = _organization_id;

  perform public.write_audit_log(
    _organization_id,
    'whatsapp_integration_disconnected',
    'whatsapp_integrations',
    _integration_id,
    jsonb_build_object('provider', 'meta_cloud', 'vault_token_removed', access_secret_id is not null),
    null, null, 'info'
  );
end;
$$;

revoke all on function public.whatsapp_store_integration_secrets(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.whatsapp_get_access_token_secret(uuid) from public, anon, authenticated;
revoke all on function public.whatsapp_disconnect_integration(uuid, uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_store_integration_secrets(uuid, uuid, text) to service_role;
grant execute on function public.whatsapp_get_access_token_secret(uuid) to service_role;
grant execute on function public.whatsapp_disconnect_integration(uuid, uuid) to service_role;

comment on table public.whatsapp_integration_secret_refs is
  'Private references to Supabase Vault access tokens; phone registration PINs are transient and never persisted.';
comment on table public.whatsapp_message_templates is
  'Local catalog synchronized from Meta; components contain template definitions, not customer message payloads.';
comment on table public.whatsapp_automation_rules is
  'Automation configuration; every rule starts disabled and requires approved template and opt-in.';
comment on table public.whatsapp_automation_jobs is
  'Private idempotent dispatch queue; recipient data is resolved server-side at execution time.';

commit;
