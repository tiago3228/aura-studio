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
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END
$do$;