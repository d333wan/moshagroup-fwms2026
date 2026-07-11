-- Revoke default PUBLIC/anon EXECUTE on internal SECURITY DEFINER functions.
-- Triggers still work (they run as the function owner regardless of grants).
-- Keep anon EXECUTE only for the two functions the login page must call
-- before authentication (check_account_locked, record_failed_login).

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_active_super_admins() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_report_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_assignable_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_failed_logins(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_task_status_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_task_status_initial() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_assignment() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_status_change() FROM PUBLIC, anon;

-- Ensure the login-page callable functions remain callable pre-auth.
GRANT EXECUTE ON FUNCTION public.check_account_locked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO anon, authenticated;

-- Grant EXECUTE back to authenticated + service_role where the app needs it.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_tier(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_active_super_admins() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_report_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_failed_logins(uuid) TO authenticated, service_role;