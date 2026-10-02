-- Guarda Documentação: arquivos privados organizados por clínica e categoria.
alter table public.organizations
  add column if not exists document_storage_limit_bytes bigint not null default 83886080;

create table if not exists public.organization_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  category text not null check (category in ('pdf', 'planilhas', 'documentos')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create index if not exists organization_documents_org_category_idx
  on public.organization_documents(organization_id, category, created_at desc);

alter table public.organization_documents enable row level security;

drop policy if exists organization_documents_member_read on public.organization_documents;
create policy organization_documents_member_read
  on public.organization_documents for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists organization_documents_admin_insert on public.organization_documents;
create policy organization_documents_admin_insert
  on public.organization_documents for insert to authenticated
  with check (public.is_org_admin(organization_id) and uploaded_by = auth.uid());

drop policy if exists organization_documents_admin_delete on public.organization_documents;
create policy organization_documents_admin_delete
  on public.organization_documents for delete to authenticated
  using (public.is_org_admin(organization_id));

grant select, insert, delete on public.organization_documents to authenticated;
grant all on public.organization_documents to service_role;

comment on table public.organization_documents is 'Arquivos privados da clínica: PDF, planilhas e documentos Word.';

create or replace function public.enforce_document_storage_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used_bytes bigint;
  limit_bytes bigint;
begin
  select coalesce(sum(file_size), 0) into used_bytes
    from public.organization_documents
    where organization_id = new.organization_id;
  select document_storage_limit_bytes into limit_bytes
    from public.organizations where id = new.organization_id;
  if limit_bytes is null then limit_bytes := 83886080; end if;
  if used_bytes + new.file_size > limit_bytes then
    raise exception 'Limite de armazenamento atingido. Esta organização pode armazenar até % MB.',
      round(limit_bytes / 1048576.0, 0) using errcode = '54000';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_documents_storage_limit on public.organization_documents;
create trigger organization_documents_storage_limit
  before insert on public.organization_documents
  for each row execute function public.enforce_document_storage_limit();
