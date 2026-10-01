-- Reparo da migration de Orçamentos.
-- Execute este script depois que as tabelas quotes e quote_items existirem.
-- A função correta do Aura para validar acesso à organização é is_org_member(uuid).

drop policy if exists quotes_org_access on public.quotes;
create policy quotes_org_access on public.quotes for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists quote_items_org_access on public.quote_items;
create policy quote_items_org_access on public.quote_items for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));
