
-- 1) Reset password super_admin
UPDATE auth.users
SET encrypted_password = crypt('Mosha#FWMS2026', gen_salt('bf')),
    updated_at = now()
WHERE email = 'mks.fwms2026@outlook.com';

UPDATE public.profiles
SET must_change_password = true,
    locked_at = NULL,
    is_active = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'mks.fwms2026@outlook.com');

-- 2) Kolom counter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts int NOT NULL DEFAULT 0;

-- 3) Fungsi catat gagal login
CREATE OR REPLACE FUNCTION public.record_failed_login(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_attempts int;
  v_is_super boolean;
  v_locked boolean := false;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = _email;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('attempts', 0, 'locked', false, 'exists', false);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'super_admin')
    INTO v_is_super;

  UPDATE public.profiles
     SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
   WHERE id = v_user_id
   RETURNING failed_login_attempts INTO v_attempts;

  IF v_attempts >= 3 AND NOT v_is_super THEN
    UPDATE public.profiles
       SET is_active = false,
           locked_at = now()
     WHERE id = v_user_id;
    v_locked := true;
  END IF;

  RETURN jsonb_build_object(
    'attempts', v_attempts,
    'locked', v_locked,
    'is_super_admin', v_is_super,
    'exists', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_failed_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO anon, authenticated;

-- 4) Reset counter saat login sukses
CREATE OR REPLACE FUNCTION public.reset_failed_logins(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET failed_login_attempts = 0
   WHERE id = _user_id AND failed_login_attempts <> 0;
$$;

REVOKE ALL ON FUNCTION public.reset_failed_logins(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_failed_logins(uuid) TO authenticated;

-- 5) Cek akun terkunci sebelum login
CREATE OR REPLACE FUNCTION public.check_account_locked(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email = _email AND p.is_active = false AND p.locked_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.check_account_locked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_account_locked(text) TO anon, authenticated;
