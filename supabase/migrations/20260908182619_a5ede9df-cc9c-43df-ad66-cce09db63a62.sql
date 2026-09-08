-- 1) Pacotes: descrição e disponibilidade pública
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS online_booking boolean NOT NULL DEFAULT false;

-- 2) Itens do pacote (pacotes com vários procedimentos)
CREATE TABLE IF NOT EXISTS public.package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sessions integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_items TO authenticated;
GRANT SELECT ON public.package_items TO anon;
GRANT ALL ON public.package_items TO service_role;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_items_member ON public.package_items FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY package_items_public_read ON public.package_items FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.organizations o
                 WHERE o.id = package_items.organization_id AND o.online_booking_enabled));

-- 3) Procedimentos oferecidos por profissional
CREATE TABLE IF NOT EXISTS public.professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_services TO authenticated;
GRANT SELECT ON public.professional_services TO anon;
GRANT ALL ON public.professional_services TO service_role;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_services_member ON public.professional_services FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY professional_services_public_read ON public.professional_services FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.organizations o
                 WHERE o.id = professional_services.organization_id AND o.online_booking_enabled));

-- 4) Pacotes oferecidos por profissional
CREATE TABLE IF NOT EXISTS public.professional_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, package_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_packages TO authenticated;
GRANT SELECT ON public.professional_packages TO anon;
GRANT ALL ON public.professional_packages TO service_role;
ALTER TABLE public.professional_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_packages_member ON public.professional_packages FOR ALL TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY professional_packages_public_read ON public.professional_packages FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.organizations o
                 WHERE o.id = professional_packages.organization_id AND o.online_booking_enabled));

-- 5) Leitura pública de pacotes ativos e liberados online
GRANT SELECT (id, organization_id, name, description, service_id, sessions, price, validity_days, active, online_booking) ON public.packages TO anon;
CREATE POLICY packages_public_read ON public.packages FOR SELECT TO anon
  USING (active AND online_booking AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = packages.organization_id AND o.online_booking_enabled));

-- 6) Biblioteca de procedimentos pré-cadastrados (global, somente leitura)
CREATE TABLE IF NOT EXISTS public.service_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  duration_min integer NOT NULL DEFAULT 60,
  position integer NOT NULL DEFAULT 0,
  UNIQUE (category, name)
);
GRANT SELECT ON public.service_library TO authenticated, anon;
GRANT ALL ON public.service_library TO service_role;
ALTER TABLE public.service_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_library_read ON public.service_library FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.service_library (category, name, duration_min, position) VALUES
  ('Massagens','Massagem Relaxante',60,1),
  ('Massagens','Massagem Modeladora',60,2),
  ('Massagens','Massagem Terapêutica',60,3),
  ('Massagens','Drenagem Linfática',60,4),
  ('Massagens','Massagem com Pedras Quentes',75,5),
  ('Facial','Limpeza de Pele',60,1),
  ('Facial','Peeling',45,2),
  ('Facial','Hidratação Facial',45,3),
  ('Facial','Revitalização Facial',60,4),
  ('Facial','Microagulhamento',60,5),
  ('Facial','Máscara Facial',30,6),
  ('Corporal','Drenagem',60,1),
  ('Corporal','Criolipólise',60,2),
  ('Corporal','Radiofrequência',45,3),
  ('Corporal','Ultrassom',45,4),
  ('Corporal','Tratamento para Celulite',60,5),
  ('Corporal','Tratamento para Gordura Localizada',60,6),
  ('Depilação','Depilação Axilas',20,1),
  ('Depilação','Depilação Pernas',45,2),
  ('Depilação','Depilação Virilha',30,3),
  ('Depilação','Depilação Buço',15,4),
  ('Depilação','Depilação Rosto',20,5),
  ('Depilação','Depilação Braços',30,6)
ON CONFLICT (category, name) DO NOTHING;

-- 7) Histórico de mensagens enviadas ao cliente
CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  kind text NOT NULL DEFAULT 'personalizada',
  channel text NOT NULL DEFAULT 'whatsapp',
  body text NOT NULL,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.message_logs TO authenticated;
GRANT ALL ON public.message_logs TO service_role;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY message_logs_member_read ON public.message_logs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY message_logs_member_insert ON public.message_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

-- 8) Backfill: pacotes com procedimento único viram itens
INSERT INTO public.package_items (organization_id, package_id, service_id, sessions)
SELECT p.organization_id, p.id, p.service_id, p.sessions
FROM public.packages p
WHERE p.service_id IS NOT NULL
ON CONFLICT (package_id, service_id) DO NOTHING;