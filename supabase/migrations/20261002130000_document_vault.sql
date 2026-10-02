-- Guarda Documentação: arquivos privados organizados por clínica e categoria.
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
