DROP POLICY IF EXISTS appointments_public_busy_read ON public.appointments;
DROP POLICY IF EXISTS professionals_public_read ON public.professionals;

REVOKE SELECT ON TABLE public.appointments FROM anon;
REVOKE SELECT ON TABLE public.professionals FROM anon;

DO $do$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.signature);
  END LOOP;
END
$do$;

-- Helpers required by authenticated RLS policies. Each validates the current auth.uid().
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_location(uuid) TO authenticated;

-- Explicit authenticated application actions with authorization enforced inside each function.
GRANT EXECUTE ON FUNCTION public.convert_organization_amount(numeric, text, text, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_convert_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_intelligence(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payment_create_transaction(uuid, text, text, numeric, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_set_organization_access(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_set_subscription(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_touch_session(uuid, uuid, text, text, text, jsonb) TO authenticated;

COMMENT ON TABLE public.appointments IS 'Dados privados de agenda; disponibilidade pública é calculada no servidor sem expor PII.';
COMMENT ON TABLE public.professionals IS 'Cadastro privado; o perfil público é projetado no servidor sem telefone ou e-mail.';