REVOKE EXECUTE ON FUNCTION public.check_account_locked(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_failed_login(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_account_locked(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO service_role;