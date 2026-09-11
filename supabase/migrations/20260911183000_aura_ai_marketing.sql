-- Aura IA Marketing: incremental, multi-tenant, approval-first.
create table if not exists public.ai_marketing_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  voice_tone text not null default 'profissional', audience text, preferred_topics text[] not null default '{}', blocked_topics text[] not null default '{}', preferred_formats text[] not null default '{}', preferred_cta text, brand_rules text, use_idea boolean not null default true, use_instagram boolean not null default false, use_aura_data boolean not null default true, use_agenda boolean not null default true, use_crm boolean not null default true, updated_at timestamptz not null default now()
);
create table if not exists public.ai_marketing_ideas (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid references auth.users(id), idea text not null, objective text, created_at timestamptz not null default now()
);
create table if not exists public.ai_marketing_campaigns (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, created_by uuid references auth.users(id), name text not null, objective text, starts_on date, days integer not null default 7 check (days in (3,5,7,14)), posts_per_day integer not null default 1 check (posts_per_day between 1 and 3), formats text[] not null default '{}', status text not null default 'rascunho' check (status in ('rascunho','em_andamento','concluida','arquivada')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_marketing_posts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, campaign_id uuid references public.ai_marketing_campaigns(id) on delete cascade, idea_id uuid references public.ai_marketing_ideas(id) on delete set null, created_by uuid references auth.users(id), scheduled_for timestamptz, title text not null, theme text, format text not null default 'feed' check (format in ('feed','story','reel','carrossel')), artwork_text text, caption text, cta text, hashtags text, story_suggestion text, reel_suggestion text, status text not null default 'rascunho' check (status in ('rascunho','gerado','em_edicao','aguardando_aprovacao','aprovado','agendado','publicado','arquivado')), source_snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_marketing_generations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid references auth.users(id), campaign_id uuid references public.ai_marketing_campaigns(id) on delete set null, model text, source_flags jsonb not null default '{}'::jsonb, objective text, posts_requested integer not null default 1, generated_at timestamptz not null default now()
);
create table if not exists public.ai_marketing_usage (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid references auth.users(id), generation_id uuid references public.ai_marketing_generations(id) on delete set null, content_count integer not null default 0, image_count integer not null default 0, estimated_tokens integer, created_at timestamptz not null default now()
);

alter table public.ai_marketing_settings enable row level security;
alter table public.ai_marketing_ideas enable row level security;
alter table public.ai_marketing_campaigns enable row level security;
alter table public.ai_marketing_posts enable row level security;
alter table public.ai_marketing_generations enable row level security;
alter table public.ai_marketing_usage enable row level security;

do $$ declare t text; begin for t in select unnest(array['ai_marketing_settings','ai_marketing_ideas','ai_marketing_campaigns','ai_marketing_posts','ai_marketing_generations','ai_marketing_usage']) loop execute format('drop policy if exists %I_member on public.%I', t, t); execute format('create policy %I_member on public.%I for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t, t); end loop; end $$;
create index if not exists ai_marketing_posts_campaign_idx on public.ai_marketing_posts(campaign_id, scheduled_for);
create index if not exists ai_marketing_posts_status_idx on public.ai_marketing_posts(organization_id, status, scheduled_for);
create index if not exists ai_marketing_campaigns_status_idx on public.ai_marketing_campaigns(organization_id, status, created_at desc);
