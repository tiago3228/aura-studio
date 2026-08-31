DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END $$;

GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.professionals TO anon;
GRANT SELECT ON public.plans TO anon;
GRANT INSERT ON public.appointments TO anon;