-- Collaborator access: per-member permissions, professional linkage and action-level RLS.
alter table public.organization_members
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists professional_id uuid references public.professionals(id) on delete set null;

create unique index if not exists organization_members_professional_unique
  on public.organization_members(organization_id, professional_id)
  where professional_id is not null;
create index if not exists organization_members_professional_idx
  on public.organization_members(professional_id);

create or replace function public.member_has_permission(_organization_id uuid, _permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = _organization_id
      and m.user_id = auth.uid()
      and m.active
      and (
        case
          when m.role in ('owner','manager') then true
          when m.permissions ? _permission then coalesce((m.permissions ->> _permission)::boolean, false)
          when _permission like 'agenda.%' then m.role = 'reception' or (_permission in ('agenda.ver','agenda.criar','agenda.editar','agenda.cancelar') and m.role = 'professional')
          when _permission like 'clientes.%' then m.role in ('reception','professional')
          when _permission in ('dashboard.ver','procedimentos.ver','pacotes.ver','crm.ver','anamnese.ver','comissoes.ver') then m.role in ('reception','professional')
          else false
        end
      )
  );
$$;

create or replace function public.has_org_permission(_organization_id uuid, _permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.member_has_permission(_organization_id, _permission)
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = _organization_id and m.user_id = auth.uid() and m.active
        and exists (
          select 1 from public.organization_permissions p
          where p.organization_id = m.organization_id and p.role = m.role
            and p.permission = _permission and p.allowed
        )
    );
$$;
grant execute on function public.member_has_permission(uuid, text) to authenticated;
grant execute on function public.has_org_permission(uuid, text) to authenticated;

create or replace function public.can_view_appointment(_organization_id uuid, _professional_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_permission(_organization_id, 'agenda.todos')
    or (public.has_org_permission(_organization_id, 'agenda.propria') and exists (
      select 1 from public.professionals p where p.id = _professional_id and p.user_id = auth.uid()
    ));
$$;
grant execute on function public.can_view_appointment(uuid, uuid) to authenticated;

-- Remove broad member policies that would otherwise bypass granular policies.
do $$
declare t text;
begin
  foreach t in array array['professionals','clients','client_files','services','packages','client_packages','appointments','calendar_blocks'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
  end loop;
  foreach t in array array['sales','sale_items','payments','accounts_receivable','accounts_payable','cash_registers','cash_transactions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
  end loop;
end $$;

-- Make this script safe to rerun after a partially applied SQL editor attempt.
do $$
declare item record;
begin
  for item in select * from (values
    ('professionals','professionals_access'), ('professionals','professionals_manage'),
    ('professionals','professionals_update'), ('professionals','professionals_delete'),
    ('organization_members','members_self_or_admin_read'), ('organization_members','members_admin_insert'),
    ('organization_members','members_admin_update'), ('organization_members','members_admin_delete'),
    ('clients','clients_read'), ('clients','clients_insert'), ('clients','clients_update'), ('clients','clients_delete'),
    ('client_files','client_files_access'), ('appointments','appointments_read'), ('appointments','appointments_insert'),
    ('appointments','appointments_update'), ('appointments','appointments_delete'),
    ('calendar_blocks','calendar_blocks_read'), ('calendar_blocks','calendar_blocks_manage'),
    ('services','services_access'), ('services','services_manage'), ('packages','packages_access'), ('packages','packages_manage')
  ) as policies(table_name, policy_name) loop
    execute format('drop policy if exists %I on public.%I', item.policy_name, item.table_name);
  end loop;
end $$;

-- Team and professional data.
drop policy if exists professionals_member_all on public.professionals;
create policy professionals_access on public.professionals for select to authenticated
  using (public.has_org_permission(organization_id, 'equipe.ver') or user_id = auth.uid());
create policy professionals_manage on public.professionals for insert to authenticated
  with check (public.has_org_permission(organization_id, 'equipe.editar'));
create policy professionals_update on public.professionals for update to authenticated
  using (public.has_org_permission(organization_id, 'equipe.editar'))
  with check (public.has_org_permission(organization_id, 'equipe.editar'));
create policy professionals_delete on public.professionals for delete to authenticated
  using (public.has_org_permission(organization_id, 'equipe.editar'));

drop policy if exists members_self_read on public.organization_members;
drop policy if exists members_insert_self on public.organization_members;
drop policy if exists members_admin_manage on public.organization_members;
create policy members_self_or_admin_read on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.has_org_permission(organization_id, 'equipe.ver'));
create policy members_admin_insert on public.organization_members for insert to authenticated
  with check (public.has_org_permission(organization_id, 'equipe.editar'));
create policy members_admin_update on public.organization_members for update to authenticated
  using (public.has_org_permission(organization_id, 'equipe.editar'))
  with check (public.has_org_permission(organization_id, 'equipe.editar'));
create policy members_admin_delete on public.organization_members for delete to authenticated
  using (public.has_org_permission(organization_id, 'equipe.editar'));

-- Clients and clinical history.
create policy clients_read on public.clients for select to authenticated
  using (public.has_org_permission(organization_id, 'clientes.ver'));
create policy clients_insert on public.clients for insert to authenticated
  with check (public.has_org_permission(organization_id, 'clientes.criar'));
create policy clients_update on public.clients for update to authenticated
  using (public.has_org_permission(organization_id, 'clientes.editar'))
  with check (public.has_org_permission(organization_id, 'clientes.editar'));
create policy clients_delete on public.clients for delete to authenticated
  using (public.has_org_permission(organization_id, 'clientes.excluir'));
create policy client_files_access on public.client_files for all to authenticated
  using (public.has_org_permission(organization_id, 'clientes.historico'))
  with check (public.has_org_permission(organization_id, 'clientes.historico'));

-- Agenda: visibility can be limited to the linked professional.
create policy appointments_read on public.appointments for select to authenticated
  using (public.has_org_permission(organization_id, 'agenda.ver') and public.can_view_appointment(organization_id, professional_id));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (public.has_org_permission(organization_id, 'agenda.criar'));
create policy appointments_update on public.appointments for update to authenticated
  using (public.has_org_permission(organization_id, 'agenda.editar') and public.can_view_appointment(organization_id, professional_id))
  with check (public.has_org_permission(organization_id, 'agenda.editar'));
create policy appointments_delete on public.appointments for delete to authenticated
  using (public.has_org_permission(organization_id, 'agenda.cancelar') and public.can_view_appointment(organization_id, professional_id));
create policy calendar_blocks_read on public.calendar_blocks for select to authenticated
  using (public.has_org_permission(organization_id, 'agenda.ver') and (professional_id is null or public.can_view_appointment(organization_id, professional_id)));
create policy calendar_blocks_manage on public.calendar_blocks for all to authenticated
  using (public.has_org_permission(organization_id, 'agenda.bloquear'))
  with check (public.has_org_permission(organization_id, 'agenda.bloquear'));

-- Catalog and finance.
create policy services_access on public.services for select to authenticated using (public.has_org_permission(organization_id, 'procedimentos.ver'));
create policy services_manage on public.services for all to authenticated using (public.has_org_permission(organization_id, 'procedimentos.editar')) with check (public.has_org_permission(organization_id, 'procedimentos.editar'));
create policy packages_access on public.packages for select to authenticated using (public.has_org_permission(organization_id, 'pacotes.ver'));
create policy packages_manage on public.packages for all to authenticated using (public.has_org_permission(organization_id, 'pacotes.editar')) with check (public.has_org_permission(organization_id, 'pacotes.editar'));

do $$
declare t text;
begin
  foreach t in array array['sales','sale_items','payments','accounts_receivable','accounts_payable','cash_registers','cash_transactions'] loop
    execute format('drop policy if exists %I_access on public.%I', t, t);
    execute format('create policy %I_access on public.%I for all to authenticated using (public.has_org_permission(organization_id, ''financeiro.ver'')) with check (public.has_org_permission(organization_id, ''financeiro.editar''))', t, t);
  end loop;
end $$;

-- Keep the owner/admin unrestricted and ensure all new members can read their own profile.
comment on column public.organization_members.permissions is 'Per-member permission overrides keyed by permission name; owner and manager are unrestricted.';
comment on column public.organization_members.professional_id is 'Optional link between the authenticated member and the professional profile.';
