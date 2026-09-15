-- Corrige o carregamento das páginas autenticadas.
-- Os helpers abaixo são chamados pelas políticas RLS e precisam consultar
-- organization_members/organizations sem reentrar nas próprias políticas.
-- O search_path já é fixado como public para evitar resolução insegura de objetos.

ALTER FUNCTION public.is_org_member(uuid)
  SECURITY DEFINER;

ALTER FUNCTION public.has_org_role(uuid, public.app_role[])
  SECURITY DEFINER;

ALTER FUNCTION public.is_org_admin(uuid)
  SECURITY DEFINER;

ALTER FUNCTION public.has_org_permission(uuid, text)
  SECURITY DEFINER;

ALTER FUNCTION public.is_platform_admin()
  SECURITY DEFINER;

ALTER FUNCTION public.user_has_location(uuid)
  SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_location(uuid) TO authenticated;
