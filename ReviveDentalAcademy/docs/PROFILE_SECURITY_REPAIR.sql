-- Non-destructive privilege repair; original data and administrator roles unchanged.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (id, full_name, avatar_url, role, created_at, updated_at) ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url, updated_at) ON public.profiles TO authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.is_admin(uuid) SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
