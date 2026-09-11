grant insert on public.subscription_events to authenticated;
grant update on public.pix_payments to authenticated;
grant insert, update on public.subscriptions to authenticated;

drop policy if exists "members create own org subscription events" on public.subscription_events;
create policy "members create own org subscription events"
on public.subscription_events for insert to authenticated
with check (public.is_org_member(organization_id));

drop policy if exists "platform admin reviews pix payments" on public.pix_payments;
create policy "platform admin reviews pix payments"
on public.pix_payments for update to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "platform admin creates subscriptions" on public.subscriptions;
create policy "platform admin creates subscriptions"
on public.subscriptions for insert to authenticated
with check (public.is_platform_admin());

drop policy if exists "platform admin updates subscriptions" on public.subscriptions;
create policy "platform admin updates subscriptions"
on public.subscriptions for update to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "platform admin creates subscription events" on public.subscription_events;
create policy "platform admin creates subscription events"
on public.subscription_events for insert to authenticated
with check (public.is_platform_admin());

alter function public.declare_pix_payment(integer, text, numeric, text) security invoker;
alter function public.review_pix_payment(uuid, boolean, text) security invoker;