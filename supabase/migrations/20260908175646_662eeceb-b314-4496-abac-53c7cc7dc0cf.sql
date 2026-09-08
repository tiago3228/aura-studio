ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS certifications text;

GRANT SELECT (bio, certifications) ON public.professionals TO anon;
GRANT SELECT (logo_url, cover_url, instagram, address, city, state, zip, phone, secondary_color) ON public.organizations TO anon;