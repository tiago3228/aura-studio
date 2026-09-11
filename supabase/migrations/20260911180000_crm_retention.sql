-- CRM retention: configurable inactivity/return windows and reactivation templates.
create table if not exists public.crm_retention_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  inactivity_days integer not null default 60 check (inactivity_days between 1 and 730),
  return_days integer not null default 30 check (return_days between 1 and 730),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email','mensagem')),
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.crm_retention_settings enable row level security;
alter table public.crm_message_templates enable row level security;
drop policy if exists crm_retention_settings_member on public.crm_retention_settings;
create policy crm_retention_settings_member on public.crm_retention_settings for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists crm_message_templates_member on public.crm_message_templates;
create policy crm_message_templates_member on public.crm_message_templates for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

insert into public.crm_message_templates (organization_id, name, channel, body)
select id, 'Reativação — sentimos sua falta', 'whatsapp', 'Olá, {{nome}}! Sentimos sua falta. Já faz um tempo desde seu último atendimento. Gostaria de verificar nossos horários disponíveis?'
from public.organizations
on conflict (organization_id, name) do nothing;

insert into public.crm_retention_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;
