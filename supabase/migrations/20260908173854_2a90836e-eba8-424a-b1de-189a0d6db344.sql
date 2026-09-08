-- Leitura pública (anon) restrita para a página de agendamento
GRANT SELECT (id, organization_id, name, specialty, photo_url, active, online_booking,
  work_days, work_start, work_end, lunch_enabled, lunch_start, lunch_end,
  slot_minutes, slot_gap_min, booking_horizon_days)
  ON public.professionals TO anon;

GRANT SELECT (id, organization_id, category_id, name, description, duration_min, buffer_min,
  price, promo_price, photo_url, active, online_booking)
  ON public.services TO anon;

GRANT SELECT (id, organization_id, professional_id, room_id, starts_at, ends_at, status)
  ON public.appointments TO anon;
GRANT SELECT (id, organization_id, professional_id, room_id, starts_at, ends_at)
  ON public.calendar_blocks TO anon;

CREATE POLICY professionals_public_read ON public.professionals
  FOR SELECT TO anon
  USING (active AND online_booking AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = professionals.organization_id
      AND o.online_booking_enabled AND o.booking_slug IS NOT NULL));

CREATE POLICY services_public_read ON public.services
  FOR SELECT TO anon
  USING (active AND online_booking AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = services.organization_id
      AND o.online_booking_enabled AND o.booking_slug IS NOT NULL));

CREATE POLICY appointments_public_busy_read ON public.appointments
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = appointments.organization_id
      AND o.online_booking_enabled AND o.booking_slug IS NOT NULL));

CREATE POLICY blocks_public_read ON public.calendar_blocks
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = calendar_blocks.organization_id
      AND o.online_booking_enabled AND o.booking_slug IS NOT NULL));