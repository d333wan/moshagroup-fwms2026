
-- ============ task_attachments ============
CREATE TYPE public.task_attachment_kind AS ENUM ('surat_tugas','other');

CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  kind public.task_attachment_kind NOT NULL DEFAULT 'other',
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select"
  ON public.task_attachments FOR SELECT TO authenticated
  USING (
    public.is_admin_tier(auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
    OR public.is_task_assignee(task_id, auth.uid())
  );

CREATE POLICY "task_attachments_insert"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (public.is_admin_tier(auth.uid()) OR public.is_task_creator(task_id, auth.uid()))
  );

CREATE POLICY "task_attachments_delete"
  ON public.task_attachments FOR DELETE TO authenticated
  USING (
    public.is_admin_tier(auth.uid())
    OR public.is_task_creator(task_id, auth.uid())
    OR uploaded_by = auth.uid()
  );

-- ============ location_attachments ============
CREATE TABLE public.location_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  kind public.task_attachment_kind NOT NULL DEFAULT 'surat_tugas',
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_location_attachments_loc ON public.location_attachments(location_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_attachments TO authenticated;
GRANT ALL ON public.location_attachments TO service_role;

ALTER TABLE public.location_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_attachments_select"
  ON public.location_attachments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "location_attachments_insert"
  ON public.location_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_admin_tier(auth.uid()));

CREATE POLICY "location_attachments_delete"
  ON public.location_attachments FOR DELETE TO authenticated
  USING (public.is_admin_tier(auth.uid()) OR uploaded_by = auth.uid());

-- ============ field_report_documents ============
CREATE TABLE public.field_report_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_field_report_docs_report ON public.field_report_documents(report_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_report_documents TO authenticated;
GRANT ALL ON public.field_report_documents TO service_role;

ALTER TABLE public.field_report_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_report_documents_select"
  ON public.field_report_documents FOR SELECT TO authenticated
  USING (
    public.is_admin_tier(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.field_reports r
      WHERE r.id = report_id AND (
        r.officer_id = auth.uid()
        OR public.is_task_creator(r.task_id, auth.uid())
      )
    )
  );

CREATE POLICY "field_report_documents_insert"
  ON public.field_report_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.field_reports r
      WHERE r.id = report_id AND r.officer_id = auth.uid()
    )
  );

CREATE POLICY "field_report_documents_delete"
  ON public.field_report_documents FOR DELETE TO authenticated
  USING (
    public.is_admin_tier(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.field_reports r
      WHERE r.id = report_id AND r.officer_id = auth.uid()
    )
  );
