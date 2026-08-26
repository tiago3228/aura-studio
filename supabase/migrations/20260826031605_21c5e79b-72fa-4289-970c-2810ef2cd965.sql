
-- ========== ENUMS ==========
create type public.app_role as enum ('owner','manager','reception','professional');
create type public.appointment_status as enum ('agendado','confirmado','aguardando','atendido','cancelado','faltou','reagendado');
create type public.payment_method as enum ('pix','credito','debito','dinheiro','transferencia','outros');
create type public.commission_type as enum ('percentual','fixo');
create type public.account_status as enum ('pendente','vencido','pago','cancelado');
create type public.movement_type as enum ('entrada','saida','ajuste','perda','consumo');
create type public.block_type as enum ('ausencia','ferias','almoco','reuniao','manutencao','sala','equipamento','particular');
create type public.question_type as enum ('texto','texto_longo','sim_nao','multipla_escolha','selecao','checkbox','data','numero','assinatura','imagem','documento');

-- ========== CORE ==========
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  instagram text,
  address text,
  city text,
  state text,
  zip text,
  primary_color text not null default '#1f6f5c',
  secondary_color text not null default '#c9964f',
  booking_slug text unique,
  online_booking_enabled boolean not null default true,
  business_hours jsonb not null default '{}'::jsonb,
  plan text not null default 'essencial',
  status text not null default 'trial',
  trial_ends_at timestamptz default (now() + interval '35 days'),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null default 'owner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on public.organization_members(user_id);

-- ========== HELPERS ==========
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id = _org and m.user_id = auth.uid() and m.active);
$$;

create or replace function public.has_org_role(_org uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id = _org and m.user_id = auth.uid() and m.active and m.role = any(_roles));
$$;

create or replace function public.is_org_admin(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(_org, array['owner','manager']::public.app_role[]);
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== PEOPLE ==========
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  name text not null,
  photo_url text,
  phone text,
  email text,
  specialty text,
  commission_default numeric(10,2) not null default 0,
  commission_type public.commission_type not null default 'percentual',
  work_days int[] not null default '{1,2,3,4,5}',
  work_start time not null default '09:00',
  work_end time not null default '18:00',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.professionals(organization_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  cpf text,
  birth_date date,
  phone text,
  whatsapp text,
  email text,
  address text,
  notes text,
  tags text[] not null default '{}',
  origin text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.clients(organization_id);
create index on public.clients(organization_id, name);

create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid,
  kind text not null default 'documento',
  label text,
  file_path text not null,
  created_at timestamptz not null default now()
);
create index on public.client_files(client_id);

-- ========== SERVICES ==========
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index on public.service_categories(organization_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  description text,
  duration_min int not null default 60,
  buffer_min int not null default 0,
  price numeric(10,2) not null default 0,
  promo_price numeric(10,2),
  commission_value numeric(10,2) not null default 0,
  commission_type public.commission_type not null default 'percentual',
  photo_url text,
  active boolean not null default true,
  online_booking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.services(organization_id);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  service_id uuid references public.services(id) on delete set null,
  sessions int not null default 1,
  price numeric(10,2) not null default 0,
  validity_days int not null default 365,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.packages(organization_id);

create table public.client_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  package_id uuid references public.packages(id) on delete set null,
  name text not null,
  service_id uuid references public.services(id) on delete set null,
  sessions_total int not null default 1,
  sessions_used int not null default 0,
  price numeric(10,2) not null default 0,
  expires_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_non_negative check (sessions_used >= 0 and sessions_used <= sessions_total)
);
create index on public.client_packages(organization_id, client_id);

-- ========== AGENDA ==========
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'sala',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.rooms(organization_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  client_package_id uuid references public.client_packages(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'agendado',
  price numeric(10,2) not null default 0,
  notes text,
  source text not null default 'interno',
  guest_name text,
  guest_phone text,
  guest_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_valid check (ends_at > starts_at)
);
create index on public.appointments(organization_id, starts_at);
create index on public.appointments(professional_id, starts_at);

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  status public.appointment_status not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  kind public.block_type not null default 'ausencia',
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint block_time_valid check (ends_at > starts_at)
);
create index on public.calendar_blocks(organization_id, starts_at);

-- conflict guard
create or replace function public.check_appointment_conflict()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('cancelado','faltou') then return new; end if;
  if new.professional_id is not null and exists (
    select 1 from public.appointments a
    where a.organization_id = new.organization_id
      and a.professional_id = new.professional_id
      and a.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and a.status not in ('cancelado','faltou')
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then raise exception 'Conflito de horário: profissional já possui atendimento neste período.'; end if;

  if new.room_id is not null and exists (
    select 1 from public.appointments a
    where a.organization_id = new.organization_id
      and a.room_id = new.room_id
      and a.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and a.status not in ('cancelado','faltou')
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then raise exception 'Conflito de horário: sala/equipamento já ocupado neste período.'; end if;

  if exists (
    select 1 from public.calendar_blocks b
    where b.organization_id = new.organization_id
      and (b.professional_id = new.professional_id or b.room_id = new.room_id)
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then raise exception 'Conflito: existe um bloqueio de agenda neste período.'; end if;

  return new;
end; $$;
create trigger appointments_conflict before insert or update of starts_at, ends_at, professional_id, room_id, status
  on public.appointments for each row execute function public.check_appointment_conflict();

-- ========== ANAMNESE ==========
create table public.anamnesis_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  service_id uuid references public.services(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.anamnesis_templates(organization_id);

create table public.anamnesis_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.anamnesis_templates(id) on delete cascade,
  label text not null,
  type public.question_type not null default 'texto',
  options text[] not null default '{}',
  required boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.anamnesis_questions(template_id);

create table public.anamnesis_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.anamnesis_templates(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  signature_data text,
  signed_at timestamptz,
  signed_by uuid,
  created_at timestamptz not null default now()
);
create index on public.anamnesis_responses(client_id);

-- ========== FINANCEIRO ==========
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  total numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  surcharge numeric(10,2) not null default 0,
  cost numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.sales(organization_id, created_at);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  product_id uuid,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0
);
create index on public.sale_items(sale_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  method public.payment_method not null default 'pix',
  amount numeric(10,2) not null default 0,
  status text not null default 'pago',
  paid_at timestamptz default now(),
  pix_payload text,
  created_at timestamptz not null default now()
);
create index on public.payments(organization_id, created_at);

create table public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  description text not null,
  amount numeric(10,2) not null default 0,
  due_date date not null,
  installment text,
  status public.account_status not null default 'pendente',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.accounts_receivable(organization_id, due_date);

create table public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier text,
  description text not null,
  category text,
  amount numeric(10,2) not null default 0,
  due_date date not null,
  recurrence text,
  status public.account_status not null default 'pendente',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.accounts_payable(organization_id, due_date);

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opened_by uuid,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_balance numeric(10,2) not null default 0,
  counted_balance numeric(10,2),
  created_at timestamptz not null default now()
);
create index on public.cash_registers(organization_id);

create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id) on delete cascade,
  kind text not null,
  description text,
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.cash_transactions(cash_register_id);

-- ========== ESTOQUE ==========
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'un',
  stock numeric(10,2) not null default 0,
  min_stock numeric(10,2) not null default 0,
  cost_price numeric(10,2) not null default 0,
  sale_price numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products(organization_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  type public.movement_type not null default 'entrada',
  quantity numeric(10,2) not null default 0,
  appointment_id uuid references public.appointments(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.inventory_movements(organization_id, created_at);

create table public.service_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(10,2) not null default 1,
  unique (service_id, product_id)
);
create index on public.service_products(service_id);

create table public.commission_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  base_amount numeric(10,2) not null default 0,
  gross numeric(10,2) not null default 0,
  deductions numeric(10,2) not null default 0,
  net numeric(10,2) not null default 0,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.commission_entries(organization_id, created_at);

-- ========== CRM / AUTOMAÇÕES / IA ==========
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event text not null,
  name text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.message_templates(organization_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(organization_id, created_at);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now()
);
create index on public.ai_conversations(organization_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.ai_messages(conversation_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(organization_id, created_at);

create table public.plans (
  id text primary key,
  name text not null,
  price numeric(10,2) not null,
  limits jsonb not null default '{}'::jsonb,
  position int not null default 0
);

-- ========== UPDATED_AT TRIGGERS ==========
do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','professionals','clients','services','packages','client_packages','appointments','products']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ========== GRANTS + RLS ==========
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to anon, authenticated using (true);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy profiles_self on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, update, delete on public.organizations to authenticated;
grant select on public.organizations to anon;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;
create policy orgs_member_read on public.organizations for select to authenticated using (public.is_org_member(id));
create policy orgs_public_read on public.organizations for select to anon using (booking_slug is not null and online_booking_enabled);
create policy orgs_insert on public.organizations for insert to authenticated with check (true);
create policy orgs_admin_update on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organization_members to service_role;
alter table public.organization_members enable row level security;
create policy members_self_read on public.organization_members for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy members_insert_self on public.organization_members for insert to authenticated with check (user_id = auth.uid() or public.is_org_admin(organization_id));
create policy members_admin_manage on public.organization_members for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy members_admin_delete on public.organization_members for delete to authenticated using (public.is_org_admin(organization_id));

-- generic member-scoped tables
do $$
declare t text;
begin
  foreach t in array array[
    'professionals','clients','client_files','service_categories','services','packages','client_packages',
    'rooms','appointments','appointment_status_history','calendar_blocks',
    'anamnesis_templates','anamnesis_questions','anamnesis_responses',
    'products','inventory_movements','service_products',
    'message_templates','notifications'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t||'_member_all', t);
  end loop;
end $$;

-- admin-only financial tables
do $$
declare t text;
begin
  foreach t in array array[
    'sales','sale_items','payments','accounts_receivable','accounts_payable',
    'cash_registers','cash_transactions'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id))', t||'_admin_all', t);
  end loop;
end $$;

grant select, insert, update, delete on public.commission_entries to authenticated;
grant all on public.commission_entries to service_role;
alter table public.commission_entries enable row level security;
create policy commissions_read on public.commission_entries for select to authenticated using (
  public.is_org_admin(organization_id)
  or exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid())
);
create policy commissions_admin_write on public.commission_entries for insert to authenticated with check (public.is_org_member(organization_id));
create policy commissions_admin_update on public.commission_entries for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy commissions_admin_delete on public.commission_entries for delete to authenticated using (public.is_org_admin(organization_id));

grant select, insert, update, delete on public.ai_conversations to authenticated;
grant all on public.ai_conversations to service_role;
alter table public.ai_conversations enable row level security;
create policy ai_conv_own on public.ai_conversations for all to authenticated
  using (public.is_org_member(organization_id) and user_id = auth.uid())
  with check (public.is_org_member(organization_id) and user_id = auth.uid());

grant select, insert, update, delete on public.ai_messages to authenticated;
grant all on public.ai_messages to service_role;
alter table public.ai_messages enable row level security;
create policy ai_msg_own on public.ai_messages for all to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy audit_read on public.audit_logs for select to authenticated using (public.is_org_admin(organization_id));
create policy audit_insert on public.audit_logs for insert to authenticated with check (public.is_org_member(organization_id));

insert into public.plans (id, name, price, position, limits) values
  ('essencial','Essencial',29.90,1,'{"professionals":1,"appointments":200}'),
  ('profissional','Profissional',49.90,2,'{"professionals":3,"appointments":1000}'),
  ('clinica','Clínica',79.90,3,'{"professionals":10,"appointments":5000}'),
  ('premium','Premium',119.90,4,'{"professionals":50,"appointments":50000}');

alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.notifications;
