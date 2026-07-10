
CREATE TYPE public.report_type AS ENUM ('progress','completion','issue');
CREATE TYPE public.attachment_kind AS ENUM ('photo','signature','document');

CREATE TABLE public.task_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL,
  report_type public.report_type NOT NULL DEFAULT 'progress',
  narrative text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  latitude numeric,
  longitude numeric,
  reported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reports TO authenticated;
GRANT ALL ON public.task_reports TO service_role;

ALTER TABLE public.task_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_reports_select" ON public.task_reports FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    OR reported_by = auth.uid()
    OR public.is_task_assignee(task_id, auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
  );

CREATE POLICY "task_reports_insert" ON public.task_reports FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = auth.uid()
    AND (
      public.is_task_assignee(task_id, auth.uid())
      OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    )
  );

CREATE POLICY "task_reports_update" ON public.task_reports FOR UPDATE TO authenticated
  USING (reported_by = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (reported_by = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "task_reports_delete" ON public.task_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE TRIGGER trg_task_reports_updated
  BEFORE UPDATE ON public.task_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.is_report_owner(_report_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.task_reports WHERE id = _report_id AND reported_by = _user_id)
$$;

CREATE TABLE public.task_report_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.task_reports(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  kind public.attachment_kind NOT NULL DEFAULT 'photo',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.task_report_attachments TO authenticated;
GRANT ALL ON public.task_report_attachments TO service_role;

ALTER TABLE public.task_report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select" ON public.task_report_attachments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    OR public.is_report_owner(report_id, auth.uid())
  );

CREATE POLICY "attachments_insert" ON public.task_report_attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_report_owner(report_id, auth.uid()));

CREATE POLICY "attachments_delete" ON public.task_report_attachments FOR DELETE TO authenticated
  USING (
    public.is_report_owner(report_id, auth.uid())
    OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
  );
