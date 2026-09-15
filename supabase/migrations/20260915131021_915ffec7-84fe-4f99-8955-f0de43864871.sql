DROP POLICY IF EXISTS pix_payments_platform_admin_all ON public.pix_payments;
CREATE POLICY pix_payments_platform_admin_all ON public.pix_payments
FOR ALL TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tiago3228@yahoo.com.br', 'tiago3228@gmail.com'))
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tiago3228@yahoo.com.br', 'tiago3228@gmail.com'));

DROP POLICY IF EXISTS subscriptions_platform_admin_all ON public.subscriptions;
CREATE POLICY subscriptions_platform_admin_all ON public.subscriptions
FOR ALL TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tiago3228@yahoo.com.br', 'tiago3228@gmail.com'))
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tiago3228@yahoo.com.br', 'tiago3228@gmail.com'));

DROP POLICY IF EXISTS subscription_events_platform_admin_all ON public.subscription_events;
CREATE POLICY subscription_events_platform_admin_all ON public.subscription_events
FOR ALL TO authenticated
USING (lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tiago3228@yahoo.com.br', 'tiago3228@gmail.com'))
WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tiago3228@yahoo.com.br', 'tiago3228@gmail.com'));