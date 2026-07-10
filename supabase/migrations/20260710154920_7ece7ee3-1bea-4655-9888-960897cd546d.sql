
-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS employee_id text UNIQUE;

-- Locations
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  province text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_auth" ON public.locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_insert_manager" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY "locations_update_manager" ON public.locations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY "locations_delete_manager" ON public.locations
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE TRIGGER trg_locations_updated
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Field officer status enum
CREATE TYPE public.officer_status AS ENUM ('available','on_duty','off_duty','leave');

-- Field officers
CREATE TABLE public.field_officers (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  department text,
  skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  base_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status public.officer_status NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_officers TO authenticated;
GRANT ALL ON public.field_officers TO service_role;

ALTER TABLE public.field_officers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_officers_select_manager" ON public.field_officers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
    OR user_id = auth.uid()
  );

CREATE POLICY "field_officers_insert_manager" ON public.field_officers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY "field_officers_update_manager_or_self" ON public.field_officers
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
    OR user_id = auth.uid()
  );

CREATE POLICY "field_officers_delete_manager" ON public.field_officers
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE TRIGGER trg_field_officers_updated
  BEFORE UPDATE ON public.field_officers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tasks: add location_id
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;
