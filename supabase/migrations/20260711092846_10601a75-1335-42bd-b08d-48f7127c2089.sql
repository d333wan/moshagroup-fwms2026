
-- ============ ENUMS ============
CREATE TYPE public.field_report_status AS ENUM ('draft','submitted','needs_revision','approved','rejected');
CREATE TYPE public.field_work_status AS ENUM ('not_started','arrived','in_progress','delayed','completed');
CREATE TYPE public.field_gps_source AS ENUM ('device','external');
CREATE TYPE public.field_photo_type AS ENUM ('officer_selfie','location','location_direction','physical_condition','gps_evidence','vehicle','obstacle');
CREATE TYPE public.field_photo_source AS ENUM ('camera','gallery','upload');
CREATE TYPE public.task_photo_direction_mode AS ENUM ('none','single','four_way');

-- ============ EXTEND tasks ============
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS supervisor_company_name text,
  ADD COLUMN IF NOT EXISTS supervisor_person_name text,
  ADD COLUMN IF NOT EXISTS supervisor_job_title text,
  ADD COLUMN IF NOT EXISTS supervisor_phone text,
  ADD COLUMN IF NOT EXISTS supervisor_whatsapp text,
  ADD COLUMN IF NOT EXISTS emergency_contact_primary text,
  ADD COLUMN IF NOT EXISTS emergency_contact_secondary text,
  ADD COLUMN IF NOT EXISTS default_vehicle_type text,
  ADD COLUMN IF NOT EXISTS default_license_plate text,
  ADD COLUMN IF NOT EXISTS photo_direction_mode public.task_photo_direction_mode NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS radius_meters integer NOT NULL DEFAULT 100;

-- ============ SEQUENCE for report number ============
CREATE SEQUENCE IF NOT EXISTS public.field_report_seq;

CREATE OR REPLACE FUNCTION public.generate_field_report_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.field_report_seq');
  RETURN 'LAP-' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') || '-' || lpad(n::text, 5, '0');
END;
$$;

-- ============ field_reports ============
CREATE TABLE public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number text NOT NULL UNIQUE DEFAULT public.generate_field_report_number(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  officer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  report_time time NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::time,
  latitude double precision,
  longitude double precision,
  gps_accuracy numeric,
  distance_from_target numeric,
  gps_source public.field_gps_source NOT NULL DEFAULT 'device',
  within_radius boolean,
  progress_percent smallint NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  work_status public.field_work_status NOT NULL DEFAULT 'not_started',
  work_description text,
  has_obstacle boolean NOT NULL DEFAULT false,
  obstacle_description text,
  assistance_needed text,
  vehicle_type text,
  license_plate text,
  vehicle_change_reason text,
  status public.field_report_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX field_reports_task_id_idx ON public.field_reports(task_id);
CREATE INDEX field_reports_officer_id_idx ON public.field_reports(officer_id);
CREATE INDEX field_reports_status_idx ON public.field_reports(status);
CREATE INDEX field_reports_report_date_idx ON public.field_reports(report_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_reports TO authenticated;
GRANT ALL ON public.field_reports TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.field_report_seq TO authenticated, service_role;

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

-- Officer sees own reports; admin tier & manager see all
CREATE POLICY "fr_select_own_or_admin" ON public.field_reports
FOR SELECT TO authenticated
USING (
  officer_id = auth.uid()
  OR public.is_admin_tier(auth.uid())
  OR public.has_role(auth.uid(), 'manager')
);

-- Officer can create only for tasks assigned to them
CREATE POLICY "fr_insert_assigned_officer" ON public.field_reports
FOR INSERT TO authenticated
WITH CHECK (
  officer_id = auth.uid()
  AND public.is_task_assignee(task_id, auth.uid())
);

-- Officer can update own only when draft/needs_revision; admin any
CREATE POLICY "fr_update_own_draft_or_admin" ON public.field_reports
FOR UPDATE TO authenticated
USING (
  (officer_id = auth.uid() AND status IN ('draft','needs_revision'))
  OR public.is_admin_tier(auth.uid())
)
WITH CHECK (
  (officer_id = auth.uid())
  OR public.is_admin_tier(auth.uid())
);

CREATE POLICY "fr_delete_own_draft_or_admin" ON public.field_reports
FOR DELETE TO authenticated
USING (
  (officer_id = auth.uid() AND status = 'draft')
  OR public.is_admin_tier(auth.uid())
);

CREATE TRIGGER field_reports_updated_at
BEFORE UPDATE ON public.field_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============ field_report_photos ============
CREATE TABLE public.field_report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  photo_type public.field_photo_type NOT NULL,
  storage_path text NOT NULL,
  capture_source public.field_photo_source NOT NULL DEFAULT 'camera',
  caption text,
  direction_label text, -- 'front'|'right'|'back'|'left' for four-way
  latitude double precision,
  longitude double precision,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX field_report_photos_report_id_idx ON public.field_report_photos(report_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_report_photos TO authenticated;
GRANT ALL ON public.field_report_photos TO service_role;

ALTER TABLE public.field_report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frp_select" ON public.field_report_photos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.field_reports r WHERE r.id = report_id
    AND (r.officer_id = auth.uid()
      OR public.is_admin_tier(auth.uid())
      OR public.has_role(auth.uid(), 'manager'))
));

CREATE POLICY "frp_insert" ON public.field_report_photos
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.field_reports r WHERE r.id = report_id
    AND r.officer_id = auth.uid()
    AND r.status IN ('draft','needs_revision')
));

CREATE POLICY "frp_delete" ON public.field_report_photos
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.field_reports r WHERE r.id = report_id
    AND ((r.officer_id = auth.uid() AND r.status IN ('draft','needs_revision'))
         OR public.is_admin_tier(auth.uid()))
));

-- ============ field_report_comments ============
CREATE TABLE public.field_report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX field_report_comments_report_id_idx ON public.field_report_comments(report_id);

GRANT SELECT, INSERT, DELETE ON public.field_report_comments TO authenticated;
GRANT ALL ON public.field_report_comments TO service_role;

ALTER TABLE public.field_report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frc_select" ON public.field_report_comments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.field_reports r WHERE r.id = report_id
    AND (r.officer_id = auth.uid()
      OR public.is_admin_tier(auth.uid())
      OR public.has_role(auth.uid(), 'manager'))
));

CREATE POLICY "frc_insert" ON public.field_report_comments
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.field_reports r WHERE r.id = report_id
      AND (r.officer_id = auth.uid()
        OR public.is_admin_tier(auth.uid())
        OR public.has_role(auth.uid(), 'manager'))
  )
);

CREATE POLICY "frc_delete_own_or_admin" ON public.field_report_comments
FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.is_admin_tier(auth.uid()));

-- ============ Notification trigger: field report status ============
CREATE OR REPLACE FUNCTION public.notify_field_report_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_title text;
  t_creator uuid;
BEGIN
  SELECT title, created_by INTO t_title, t_creator FROM public.tasks WHERE id = NEW.task_id;

  -- Notify admins & creator when officer submits or reports obstacle / outside radius
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'submitted')
  THEN
    IF t_creator IS NOT NULL AND t_creator <> NEW.officer_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (t_creator, 'field_report_submitted', 'Laporan lapangan baru',
        COALESCE(t_title,'') || ' - ' || NEW.report_number,
        '/dashboard/field-reports/admin/' || NEW.id::text);
    END IF;

    -- Notify all admins
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT ur.user_id, 'field_report_submitted', 'Laporan lapangan baru',
      COALESCE(t_title,'') || ' - ' || NEW.report_number,
      '/dashboard/field-reports/admin/' || NEW.id::text
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','super_admin')
      AND ur.user_id <> NEW.officer_id
      AND ur.user_id <> COALESCE(t_creator,'00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  -- Notify officer when admin changes status to needs_revision / approved / rejected
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('needs_revision','approved','rejected')
  THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.officer_id, 'field_report_' || NEW.status::text,
      CASE NEW.status
        WHEN 'needs_revision' THEN 'Laporan perlu revisi'
        WHEN 'approved' THEN 'Laporan disetujui'
        WHEN 'rejected' THEN 'Laporan ditolak'
      END,
      COALESCE(t_title,'') || ' - ' || NEW.report_number,
      '/dashboard/field-reports/' || NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER field_reports_notify
AFTER INSERT OR UPDATE OF status ON public.field_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_field_report_change();

-- ============ Comment notification ============
CREATE OR REPLACE FUNCTION public.notify_field_report_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_officer uuid;
  r_number text;
  t_title text;
  t_creator uuid;
BEGIN
  SELECT r.officer_id, r.report_number, t.title, t.created_by
    INTO r_officer, r_number, t_title, t_creator
  FROM public.field_reports r JOIN public.tasks t ON t.id = r.task_id
  WHERE r.id = NEW.report_id;

  -- Notify officer if sender is not the officer
  IF r_officer IS NOT NULL AND r_officer <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (r_officer, 'field_report_comment', 'Komentar baru pada laporan',
      COALESCE(t_title,'') || ' - ' || r_number,
      '/dashboard/field-reports/' || NEW.report_id::text);
  END IF;

  -- Notify task creator if not sender and not officer
  IF t_creator IS NOT NULL AND t_creator <> NEW.sender_id AND t_creator <> r_officer THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (t_creator, 'field_report_comment', 'Komentar baru pada laporan',
      COALESCE(t_title,'') || ' - ' || r_number,
      '/dashboard/field-reports/admin/' || NEW.report_id::text);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER field_report_comments_notify
AFTER INSERT ON public.field_report_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_field_report_comment();
