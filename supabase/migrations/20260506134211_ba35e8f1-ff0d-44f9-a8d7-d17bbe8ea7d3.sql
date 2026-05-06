
REVOKE ALL ON FUNCTION public.auto_qc_sampling() FROM anon;
REVOKE ALL ON FUNCTION public.auto_qc_sampling() FROM authenticated;

REVOKE ALL ON FUNCTION public.handle_demo_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_demo_user_role() FROM anon;
REVOKE ALL ON FUNCTION public.handle_demo_user_role() FROM authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;
