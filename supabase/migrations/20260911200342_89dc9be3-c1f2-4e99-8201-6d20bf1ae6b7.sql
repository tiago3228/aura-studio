drop policy if exists "members create own org subscription events" on public.subscription_events;
drop policy if exists "platform admin creates subscription events" on public.subscription_events;
create policy "authorized managers create subscription events"
on public.subscription_events for insert to authenticated
with check (public.is_org_admin(organization_id) or public.is_platform_admin());

drop policy if exists "platform admin creates subscriptions" on public.subscriptions;
create policy "authorized managers create subscriptions"
on public.subscriptions for insert to authenticated
with check (public.is_org_admin(organization_id) or public.is_platform_admin());

drop policy if exists "platform admin updates subscriptions" on public.subscriptions;
create policy "authorized managers update subscriptions"
on public.subscriptions for update to authenticated
using (public.is_org_admin(organization_id) or public.is_platform_admin())
with check (public.is_org_admin(organization_id) or public.is_platform_admin());