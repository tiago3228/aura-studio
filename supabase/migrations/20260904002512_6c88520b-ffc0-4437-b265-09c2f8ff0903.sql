CREATE TABLE public.pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 29.90,
  pix_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  payer_note text,
  admin_note text,
  months integer NOT NULL DEFAULT 1,
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pix_payments TO authenticated;
GRANT ALL ON public.pix_payments TO service_role;

ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own org pix payments"
ON public.pix_payments FOR SELECT TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "members create own org pix payments"
ON public.pix_payments FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(organization_id));

CREATE INDEX pix_payments_org_idx ON public.pix_payments(organization_id, created_at DESC);