-- ============ ASSINATURAS ============
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'pro',
  status text NOT NULL DEFAULT 'trialing',
  amount numeric NOT NULL DEFAULT 29.90,
  currency text NOT NULL DEFAULT 'BRL',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  mp_preapproval_id text UNIQUE,
  mp_payer_email text,
  mp_init_point text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  amount numeric,
  status text,
  external_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscription_events_external_uniq
  ON public.subscription_events (kind, external_id) WHERE external_id IS NOT NULL;

GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read subscription events" ON public.subscription_events
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- ============ AGENDA DO PROFISSIONAL ============
ALTER TABLE public.professionals
  ADD COLUMN lunch_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN lunch_start time NOT NULL DEFAULT '12:00',
  ADD COLUMN lunch_end time NOT NULL DEFAULT '13:00',
  ADD COLUMN slot_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN slot_gap_min integer NOT NULL DEFAULT 0,
  ADD COLUMN booking_horizon_days integer NOT NULL DEFAULT 30,
  ADD COLUMN online_booking boolean NOT NULL DEFAULT true;

ALTER TABLE public.professionals ALTER COLUMN work_start SET DEFAULT '08:00';
ALTER TABLE public.professionals ALTER COLUMN work_end SET DEFAULT '19:00';