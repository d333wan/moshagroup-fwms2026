
-- 1) Revoke public/anon EXECUTE from trigger functions that shouldn't be callable
REVOKE EXECUTE ON FUNCTION public.notify_field_report_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_field_report_comment() FROM PUBLIC, anon;

-- 2) Protect security-sensitive profile columns from self-modification
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only guard self-updates; super_admin can change anything via the other policy
  IF auth.uid() IS NULL OR auth.uid() <> NEW.id THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     OR NEW.failed_login_attempts IS DISTINCT FROM OLD.failed_login_attempts
     OR NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
    RAISE EXCEPTION 'Not allowed to modify security-sensitive profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_sensitive_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();

-- 3) Allow admins/super_admins to correct or remove task_status_history rows
DROP POLICY IF EXISTS tsh_update_admin ON public.task_status_history;
CREATE POLICY tsh_update_admin ON public.task_status_history
  FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS tsh_delete_admin ON public.task_status_history;
CREATE POLICY tsh_delete_admin ON public.task_status_history
  FOR DELETE TO authenticated
  USING (public.is_admin_tier(auth.uid()));
