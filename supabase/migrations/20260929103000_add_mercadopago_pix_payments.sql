-- Aura Studio: Pix dinâmico via Mercado Pago para a assinatura PRO.
-- Cole este arquivo no editor SQL do Lovable e execute antes de testar o novo checkout.

CREATE TABLE IF NOT EXISTS public.mercadopago_pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'BRL',
  provider text NOT NULL DEFAULT 'mercado_pago',
  provider_payment_id text NOT NULL,
  external_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_detail text,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  payer_email text NOT NULL,
  expires_at timestamptz,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id),
  UNIQUE (external_reference)
);

ALTER TABLE public.mercadopago_pix_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.mercadopago_pix_payments TO authenticated;
GRANT ALL ON public.mercadopago_pix_payments TO service_role;

DROP POLICY IF EXISTS "members read Mercado Pago Pix payments"
  ON public.mercadopago_pix_payments;
CREATE POLICY "members read Mercado Pago Pix payments"
  ON public.mercadopago_pix_payments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "managers create Mercado Pago Pix payments"
  ON public.mercadopago_pix_payments;
CREATE POLICY "managers create Mercado Pago Pix payments"
  ON public.mercadopago_pix_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','manager']::public.app_role[]));

DROP TRIGGER IF EXISTS mercadopago_pix_payments_updated
  ON public.mercadopago_pix_payments;
CREATE TRIGGER mercadopago_pix_payments_updated
  BEFORE UPDATE ON public.mercadopago_pix_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS mercadopago_pix_payments_org_idx
  ON public.mercadopago_pix_payments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mercadopago_pix_payments_status_idx
  ON public.mercadopago_pix_payments(status, expires_at);
