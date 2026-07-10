-- Phase 2.1: Restructure roles to super_admin/admin/manager/petugas_lapangan/guest,
-- add profile status columns, refresh RBAC helpers and RLS.

-- Drop dependent policies before altering the enum
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_write ON public.user_roles;

-- Drop helper functions bound to old enum signature
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_user_roles(uuid);

-- Rename old enum, create new one with the full role set
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','manager','petugas_lapangan','guest');

-- Migrate existing user_roles rows: petugas->petugas_lapangan, viewer->guest, others map by name
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING (
    CASE role::text
      WHEN 'petugas' THEN 'petugas_lapangan'
      WHEN 'viewer'  THEN 'guest'
      ELSE role::text
    END
  )::public.app_role;

DROP TYPE public.app_role_old;

-- Profile status columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Recreate RBAC helpers against new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS public.app_role[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role ORDER BY role), ARRAY[]::public.app_role[])
  FROM public.user_roles WHERE user_id = _user_id
$$;

-- Convenience: is this user an "admin-tier" account (super_admin or admin)
CREATE OR REPLACE FUNCTION public.is_admin_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin')
  )
$$;

-- Count active super_admins (used by app logic to prevent removing the last one)
CREATE OR REPLACE FUNCTION public.count_active_super_admins()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'super_admin' AND p.is_active = true
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_tier(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.count_active_super_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_active_super_admins() TO authenticated;

-- Update signup trigger: default role is now 'guest', and new accounts are inactive by default
-- (super_admin must activate them). Also marks must_change_password=false for self-signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_active, must_change_password)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    -- Accounts created by super_admin flow pass is_active=true in metadata; self-signup stays inactive
    COALESCE((new.raw_user_meta_data->>'is_active')::boolean, false),
    COALESCE((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'guest'::public.app_role)
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END $$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Recreate RLS policies with the new role names
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_select_admin_tier ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Super admin may update any profile (activate/deactivate, force pw change, etc.)
CREATE POLICY profiles_update_super_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles policies
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY user_roles_select_admin_tier ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));

-- Only super_admin may write role rows (admin cannot escalate/change roles freely — Phase 3 refinement)
CREATE POLICY user_roles_super_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
