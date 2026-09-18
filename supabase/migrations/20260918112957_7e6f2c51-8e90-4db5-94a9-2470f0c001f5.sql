REVOKE SELECT ON public.plans FROM anon;
DROP POLICY IF EXISTS plans_read ON public.plans;
CREATE POLICY plans_authenticated_read
ON public.plans
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

REVOKE SELECT ON public.service_library FROM anon;
DROP POLICY IF EXISTS service_library_read ON public.service_library;
CREATE POLICY service_library_authenticated_read
ON public.service_library
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS orgs_insert ON public.organizations;
CREATE POLICY orgs_owner_insert
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);