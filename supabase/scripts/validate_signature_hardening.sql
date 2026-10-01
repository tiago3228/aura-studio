-- Validação do hardening de aceite e assinatura.
-- Este script é somente leitura: não altera tabelas, policies ou privilégios.
-- Execute no SQL Editor do Lovable Cloud.

with target_tables(table_name) as (
  values
    ('contract_term_acceptances'::text),
    ('signature_verifications'::text)
),
rls as (
  select
    t.table_name,
    coalesce(c.relrowsecurity, false) as rls_enabled,
    coalesce(c.relforcerowsecurity, false) as force_rls
  from target_tables t
  left join pg_class c
    on c.relname = t.table_name
  left join pg_namespace n
    on n.oid = c.relnamespace
   and n.nspname = 'public'
),
policy_summary as (
  select
    t.table_name,
    count(p.policyname) filter (where p.cmd = 'SELECT') as select_policies,
    count(p.policyname) filter (where p.cmd <> 'SELECT') as write_policies,
    string_agg(
      case when p.cmd <> 'SELECT' then p.policyname end,
      ', ' order by p.policyname
    ) as write_policy_names,
    string_agg(
      case when p.cmd = 'SELECT' then p.policyname end,
      ', ' order by p.policyname
    ) as select_policy_names
  from target_tables t
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = t.table_name
  group by t.table_name
),
privileges as (
  select
    table_name,
    has_table_privilege(
      'anon',
      format('public.%I', table_name),
      'INSERT'
    ) as anon_insert,
    has_table_privilege(
      'anon',
      format('public.%I', table_name),
      'UPDATE'
    ) as anon_update,
    has_table_privilege(
      'anon',
      format('public.%I', table_name),
      'DELETE'
    ) as anon_delete,
    has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'INSERT'
    ) as authenticated_insert,
    has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'UPDATE'
    ) as authenticated_update,
    has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'DELETE'
    ) as authenticated_delete
  from target_tables
)
select
  r.table_name,
  r.rls_enabled,
  r.force_rls,
  p.select_policies,
  p.write_policies,
  p.select_policy_names,
  p.write_policy_names,
  v.anon_insert,
  v.anon_update,
  v.anon_delete,
  v.authenticated_insert,
  v.authenticated_update,
  v.authenticated_delete,
  (
    r.rls_enabled
    and p.select_policies = 1
    and p.write_policies = 0
    and not v.anon_insert
    and not v.anon_update
    and not v.anon_delete
    and not v.authenticated_insert
    and not v.authenticated_update
    and not v.authenticated_delete
  ) as hardening_ok
from rls r
join policy_summary p using (table_name)
join privileges v using (table_name)
order by r.table_name;

-- Resumo agregado: deve retornar hardening_ok = true e failed_checks = 0.
with checks as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    (
      select count(*)
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = c.relname
        and p.cmd <> 'SELECT'
    ) as write_policy_count,
    (
      select count(*)
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = c.relname
        and p.cmd = 'SELECT'
    ) as select_policy_count,
    has_table_privilege('anon', format('public.%I', c.relname), 'INSERT') as anon_insert,
    has_table_privilege('anon', format('public.%I', c.relname), 'UPDATE') as anon_update,
    has_table_privilege('anon', format('public.%I', c.relname), 'DELETE') as anon_delete,
    has_table_privilege('authenticated', format('public.%I', c.relname), 'INSERT') as authenticated_insert,
    has_table_privilege('authenticated', format('public.%I', c.relname), 'UPDATE') as authenticated_update,
    has_table_privilege('authenticated', format('public.%I', c.relname), 'DELETE') as authenticated_delete
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('contract_term_acceptances', 'signature_verifications')
)
select
  count(*) filter (
    where not rls_enabled
       or write_policy_count <> 0
       or select_policy_count <> 1
       or anon_insert
       or anon_update
       or anon_delete
       or authenticated_insert
       or authenticated_update
       or authenticated_delete
  ) as failed_checks,
  count(*) filter (
    where rls_enabled
      and write_policy_count = 0
      and select_policy_count = 1
      and not anon_insert
      and not anon_update
      and not anon_delete
      and not authenticated_insert
      and not authenticated_update
      and not authenticated_delete
  ) as passed_tables
from checks;

-- Validação estrita: interrompe com erro se a configuração estiver incorreta.
do $$
declare
  failures text[] := array[]::text[];
  table_name text;
  rls_enabled boolean;
  write_policy_count integer;
  select_policy_count integer;
  has_anon_write boolean;
  has_authenticated_write boolean;
begin
  for table_name, rls_enabled, write_policy_count, select_policy_count,
      has_anon_write, has_authenticated_write in
    select
      c.relname,
      c.relrowsecurity,
      (
        select count(*)::integer
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.cmd <> 'SELECT'
      ),
      (
        select count(*)::integer
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.cmd = 'SELECT'
      ),
      (
        has_table_privilege('anon', format('public.%I', c.relname), 'INSERT')
        or has_table_privilege('anon', format('public.%I', c.relname), 'UPDATE')
        or has_table_privilege('anon', format('public.%I', c.relname), 'DELETE')
      ),
      (
        has_table_privilege('authenticated', format('public.%I', c.relname), 'INSERT')
        or has_table_privilege('authenticated', format('public.%I', c.relname), 'UPDATE')
        or has_table_privilege('authenticated', format('public.%I', c.relname), 'DELETE')
      )
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('contract_term_acceptances', 'signature_verifications')
  loop
    if not rls_enabled then
      failures := failures || format('%s: RLS desabilitado', table_name);
    end if;
    if write_policy_count <> 0 then
      failures := failures || format('%s: existem %s policies de escrita', table_name, write_policy_count);
    end if;
    if select_policy_count <> 1 then
      failures := failures || format('%s: esperado 1 policy de leitura, encontrado %s', table_name, select_policy_count);
    end if;
    if has_anon_write then
      failures := failures || format('%s: anon possui privilégio SQL de escrita', table_name);
    end if;
    if has_authenticated_write then
      failures := failures || format('%s: authenticated possui privilégio SQL de escrita', table_name);
    end if;
  end loop;

  if coalesce(array_length(failures, 1), 0) > 0 then
    raise exception 'Hardening inválido: %', array_to_string(failures, '; ')
      using errcode = 'P0001';
  end if;

  raise notice 'Hardening validado com sucesso para contract_term_acceptances e signature_verifications.';
end;
$$;
