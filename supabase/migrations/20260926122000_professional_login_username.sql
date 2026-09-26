-- Login simplificado de profissionais: o username é armazenado no perfil,
-- enquanto a senha permanece exclusivamente no Auth do Supabase.
alter table public.professionals
  add column if not exists login_username text;

create unique index if not exists professionals_login_username_unique
  on public.professionals (lower(login_username))
  where login_username is not null;
