-- Allow the three supported application languages.
alter table public.organization_localization_settings drop constraint if exists organization_localization_settings_language_code_check;
alter table public.organization_localization_settings add constraint organization_localization_settings_language_code_check check (language_code in ('pt-BR','pt-PT','en-US'));
