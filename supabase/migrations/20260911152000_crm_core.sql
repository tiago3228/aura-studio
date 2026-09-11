-- Aura CRM core: leads, pipeline, follow-ups, interactions and client classification
-- Execute this migration in the Lovable/Supabase SQL editor.

alter table public.clients
  add column if not exists instagram text,
  add column if not exists crm_status text not null default 'novo'
    check (crm_status in ('novo','ativo','vip','inativo','perdido')),
  add column if not exists is_vip boolean not null default false,
  add column if not exists last_contact_at timestamptz;

create table if not exists public.crm_lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index if not exists crm_lead_sources_org_idx on public.crm_lead_sources(organization_id);

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  whatsapp text,
  email text,
  instagram text,
  birth_date date,
  source text,
  source_id uuid references public.crm_lead_sources(id) on delete set null,
  interested_service_id uuid references public.services(id) on delete set null,
  interested_professional_id uuid references public.professionals(id) on delete set null,
  notes text,
  first_contact_at timestamptz,
  owner_id uuid,
  stage text not null default 'novo_lead' check (stage in ('novo_lead','primeiro_contato','interessado','orcamento_enviado','aguardando_resposta','agendou','compareceu','converteu','fidelizado','perdido')),
  lost_reason text,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_leads_org_stage_idx on public.crm_leads(organization_id, stage, updated_at desc);
create index if not exists crm_leads_org_contact_idx on public.crm_leads(organization_id, whatsapp, email);

create table if not exists public.crm_lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  previous_stage text,
  new_stage text not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists crm_lead_stage_history_lead_idx on public.crm_lead_stage_history(lead_id, created_at desc);

create table if not exists public.crm_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  type text not null default 'observacao' check (type in ('whatsapp','ligacao','email','mensagem','observacao')),
  occurred_at timestamptz not null default now(),
  subject text,
  description text not null,
  result text,
  next_action text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (client_id is not null or lead_id is not null)
);
create index if not exists crm_interactions_org_date_idx on public.crm_interactions(organization_id, occurred_at desc);

create table if not exists public.crm_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  assigned_to uuid,
  status text not null default 'pendente' check (status in ('pendente','concluido','cancelado')),
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (client_id is not null or lead_id is not null)
);
create index if not exists crm_follow_ups_org_due_idx on public.crm_follow_ups(organization_id, status, due_at);

create or replace function public.crm_touch_updated_at() returns trigger
language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists crm_leads_touch_updated_at on public.crm_leads;
create trigger crm_leads_touch_updated_at before update on public.crm_leads for each row execute function public.crm_touch_updated_at();

create or replace function public.crm_record_stage_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_lead_stage_history (organization_id, lead_id, new_stage, changed_by)
    values (new.organization_id, new.id, new.stage, auth.uid());
  elsif old.stage is distinct from new.stage then
    insert into public.crm_lead_stage_history (organization_id, lead_id, previous_stage, new_stage, changed_by)
    values (new.organization_id, new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end; $$;
drop trigger if exists crm_leads_record_stage on public.crm_leads;
create trigger crm_leads_record_stage after insert or update of stage on public.crm_leads for each row execute function public.crm_record_stage_change();

alter table public.crm_lead_sources enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_lead_stage_history enable row level security;
alter table public.crm_interactions enable row level security;
alter table public.crm_follow_ups enable row level security;

drop policy if exists crm_sources_member on public.crm_lead_sources;
create policy crm_sources_member on public.crm_lead_sources for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists crm_leads_member on public.crm_leads;
create policy crm_leads_member on public.crm_leads for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists crm_stage_history_member on public.crm_lead_stage_history;
create policy crm_stage_history_member on public.crm_lead_stage_history for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists crm_interactions_member on public.crm_interactions;
create policy crm_interactions_member on public.crm_interactions for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists crm_follow_ups_member on public.crm_follow_ups;
create policy crm_follow_ups_member on public.crm_follow_ups for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

insert into public.crm_lead_sources (organization_id, name)
select o.id, source_name
from public.organizations o
cross join unnest(array['Instagram','WhatsApp','Google','Indicação','Site','Link público','Facebook','Anúncio','Outros']) as source_name
on conflict (organization_id, name) do nothing;
