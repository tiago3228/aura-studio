-- Fase 4: WhatsApp profissional centralizado.
--
-- Segredos de provedores, access tokens e app secrets não devem ser armazenados
-- nestas tabelas. Use secrets da Edge Function ou um cofre externo. O banco
-- guarda apenas referências operacionais, mensagens e estados de entrega.
-- Webhooks públicos devem ser processados por backend seguro com service_role.

create table if not exists public.whatsapp_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'meta_cloud'
    check (provider in ('meta_cloud', 'twilio', '360dialog', 'evolution', 'outro')),
  display_name text not null default 'WhatsApp da clínica',
  phone_number text,
  phone_number_id text,
  business_account_id text,
  provider_account_id text,
  active boolean not null default false,
  verified boolean not null default false,
  last_webhook_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, phone_number_id)
);

create unique index if not exists whatsapp_integrations_active_org_uidx
  on public.whatsapp_integrations (organization_id)
  where active;

create index if not exists whatsapp_integrations_org_idx
  on public.whatsapp_integrations (organization_id, active);

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  phone text not null check (char_length(trim(phone)) between 8 and 30),
  display_name text,
  profile_name text,
  opted_in boolean not null default false,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone)
);

create index if not exists whatsapp_contacts_client_idx
  on public.whatsapp_contacts (client_id);

create index if not exists whatsapp_contacts_org_optin_idx
  on public.whatsapp_contacts (organization_id, opted_in, updated_at desc);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid references public.whatsapp_integrations(id) on delete set null,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'aberta'
    check (status in ('aberta', 'aguardando', 'resolvida', 'arquivada')),
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contact_id)
);

create index if not exists whatsapp_conversations_org_status_idx
  on public.whatsapp_conversations (organization_id, status, last_message_at desc);

create index if not exists whatsapp_conversations_assigned_idx
  on public.whatsapp_conversations (organization_id, assigned_to, status, last_message_at desc);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  integration_id uuid references public.whatsapp_integrations(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'audio', 'video', 'document', 'location', 'template', 'system')),
  body text,
  media_url text,
  media_mime_type text,
  media_storage_path text,
  provider_message_id text,
  reply_to_message_id uuid references public.whatsapp_messages(id) on delete set null,
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  error_code text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  sender_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (message_type = 'system' or body is not null or media_url is not null or media_storage_path is not null)
);

create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages (conversation_id, created_at desc);

create index if not exists whatsapp_messages_org_status_idx
  on public.whatsapp_messages (organization_id, delivery_status, created_at desc);

create unique index if not exists whatsapp_messages_provider_id_uidx
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  integration_id uuid references public.whatsapp_integrations(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists whatsapp_webhook_events_org_idx
  on public.whatsapp_webhook_events (organization_id, received_at desc);

create index if not exists whatsapp_webhook_events_status_idx
  on public.whatsapp_webhook_events (provider, status, received_at desc);

-- Impede misturar registros de organizações diferentes ao inserir pela API.
create or replace function public.validate_whatsapp_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_organization_id uuid;
begin
  if tg_table_name = 'whatsapp_contacts' then
    if new.client_id is not null then
      select c.organization_id into related_organization_id
        from public.clients c where c.id = new.client_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'O cliente não pertence à organização do contato WhatsApp.';
      end if;
    end if;
  elsif tg_table_name = 'whatsapp_conversations' then
    select c.organization_id into related_organization_id
      from public.whatsapp_contacts c where c.id = new.contact_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O contato WhatsApp não pertence à organização da conversa.';
    end if;
    if new.integration_id is not null then
      select i.organization_id into related_organization_id
        from public.whatsapp_integrations i where i.id = new.integration_id;
      if related_organization_id is null or related_organization_id <> new.organization_id then
        raise exception 'A integração WhatsApp não pertence à organização da conversa.';
      end if;
    end if;
  else
    select c.organization_id into related_organization_id
      from public.whatsapp_conversations c where c.id = new.conversation_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'A conversa WhatsApp não pertence à organização da mensagem.';
    end if;
    select c.organization_id into related_organization_id
      from public.whatsapp_contacts c where c.id = new.contact_id;
    if related_organization_id is null or related_organization_id <> new.organization_id then
      raise exception 'O contato WhatsApp não pertence à organização da mensagem.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_whatsapp_contact_organization on public.whatsapp_contacts;
create trigger validate_whatsapp_contact_organization
before insert or update on public.whatsapp_contacts
for each row execute function public.validate_whatsapp_organization();

drop trigger if exists validate_whatsapp_conversation_organization on public.whatsapp_conversations;
create trigger validate_whatsapp_conversation_organization
before insert or update on public.whatsapp_conversations
for each row execute function public.validate_whatsapp_organization();

drop trigger if exists validate_whatsapp_message_organization on public.whatsapp_messages;
create trigger validate_whatsapp_message_organization
before insert or update on public.whatsapp_messages
for each row execute function public.validate_whatsapp_organization();

create or replace function public.touch_whatsapp_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.whatsapp_conversations
     set last_message_preview = coalesce(new.body, '[' || new.message_type || ']'),
         last_message_at = coalesce(new.created_at, now()),
         unread_count = case
           when new.direction = 'inbound' and new.delivery_status = 'received'
             then unread_count + 1
           else unread_count
         end,
         status = case
           when new.direction = 'inbound' and status = 'arquivada' then 'aberta'
           else status
         end,
         updated_at = now()
   where id = new.conversation_id
     and organization_id = new.organization_id;

  return new;
end;
$$;

drop trigger if exists touch_whatsapp_conversation_after_message on public.whatsapp_messages;
create trigger touch_whatsapp_conversation_after_message
after insert on public.whatsapp_messages
for each row execute function public.touch_whatsapp_conversation();

-- O mesmo helper é reutilizado para todas as entidades novas.
drop trigger if exists whatsapp_integrations_updated_at on public.whatsapp_integrations;
create trigger whatsapp_integrations_updated_at
before update on public.whatsapp_integrations
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_contacts_updated_at on public.whatsapp_contacts;
create trigger whatsapp_contacts_updated_at
before update on public.whatsapp_contacts
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_conversations_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_updated_at
before update on public.whatsapp_conversations
for each row execute function public.set_updated_at();

-- O processamento de webhook usa service_role; usuários autenticados não
-- recebem acesso direto ao payload bruto do provedor.
alter table public.whatsapp_integrations enable row level security;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_webhook_events enable row level security;

grant select, insert, update, delete on public.whatsapp_integrations to authenticated;
grant select, insert, update, delete on public.whatsapp_contacts to authenticated;
grant select, insert, update on public.whatsapp_conversations to authenticated;
grant select, insert, update on public.whatsapp_messages to authenticated;
grant all on public.whatsapp_integrations, public.whatsapp_contacts, public.whatsapp_conversations, public.whatsapp_messages, public.whatsapp_webhook_events to service_role;

drop policy if exists whatsapp_integrations_read on public.whatsapp_integrations;
drop policy if exists whatsapp_integrations_manage on public.whatsapp_integrations;
create policy whatsapp_integrations_read
on public.whatsapp_integrations for select to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.ver'));
create policy whatsapp_integrations_manage
on public.whatsapp_integrations for all to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.editar'))
with check (public.has_org_permission(organization_id, 'whatsapp.editar'));

drop policy if exists whatsapp_contacts_read on public.whatsapp_contacts;
drop policy if exists whatsapp_contacts_manage on public.whatsapp_contacts;
create policy whatsapp_contacts_read
on public.whatsapp_contacts for select to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.ver'));
create policy whatsapp_contacts_manage
on public.whatsapp_contacts for all to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.editar'))
with check (public.has_org_permission(organization_id, 'whatsapp.editar'));

drop policy if exists whatsapp_conversations_read on public.whatsapp_conversations;
drop policy if exists whatsapp_conversations_manage on public.whatsapp_conversations;
drop policy if exists whatsapp_conversations_update on public.whatsapp_conversations;
create policy whatsapp_conversations_read
on public.whatsapp_conversations for select to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.ver'));
create policy whatsapp_conversations_manage
on public.whatsapp_conversations for insert to authenticated
with check (public.has_org_permission(organization_id, 'whatsapp.enviar'));
create policy whatsapp_conversations_update
on public.whatsapp_conversations for update to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.enviar'))
with check (public.has_org_permission(organization_id, 'whatsapp.enviar'));

drop policy if exists whatsapp_messages_read on public.whatsapp_messages;
drop policy if exists whatsapp_messages_send on public.whatsapp_messages;
drop policy if exists whatsapp_messages_update on public.whatsapp_messages;
create policy whatsapp_messages_read
on public.whatsapp_messages for select to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.ver'));
create policy whatsapp_messages_send
on public.whatsapp_messages for insert to authenticated
with check (
  public.has_org_permission(organization_id, 'whatsapp.enviar')
  and (sender_user_id is null or sender_user_id = auth.uid())
);
create policy whatsapp_messages_update
on public.whatsapp_messages for update to authenticated
using (public.has_org_permission(organization_id, 'whatsapp.enviar'))
with check (public.has_org_permission(organization_id, 'whatsapp.enviar'));

-- Eventos de webhook são privados ao backend e não têm policies para authenticated.
revoke all on public.whatsapp_webhook_events from anon, authenticated;

comment on table public.whatsapp_integrations is 'Configuração operacional da conexão WhatsApp; segredos ficam fora do banco.';
comment on table public.whatsapp_contacts is 'Contatos WhatsApp normalizados por organização, com opt-in/opt-out.';
comment on table public.whatsapp_conversations is 'Caixa de entrada e estado das conversas WhatsApp.';
comment on table public.whatsapp_messages is 'Mensagens WhatsApp, mídia referenciada e estados de entrega.';
comment on table public.whatsapp_webhook_events is 'Eventos recebidos de provedores WhatsApp para processamento idempotente.';
comment on column public.whatsapp_messages.media_storage_path is 'Referência protegida ao arquivo; não deve ser uma URL pública permanente.';
comment on column public.whatsapp_webhook_events.payload_hash is 'Hash usado para validar e deduplicar o payload recebido.';
