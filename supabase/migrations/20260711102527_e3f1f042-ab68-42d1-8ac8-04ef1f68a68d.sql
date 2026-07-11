
-- field-report-docs: restrict SELECT to admins, report officer, or task creator
DROP POLICY IF EXISTS fr_docs_read ON storage.objects;
CREATE POLICY fr_docs_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'field-report-docs'
    AND (
      public.is_admin_tier(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.field_report_documents d
        JOIN public.field_reports r ON r.id = d.report_id
        WHERE d.storage_path = storage.objects.name
          AND (r.officer_id = auth.uid() OR public.is_task_creator(r.task_id, auth.uid()))
      )
    )
  );

-- task-attachments: restrict SELECT to admins, task creator, or assignee
DROP POLICY IF EXISTS task_attach_read ON storage.objects;
CREATE POLICY task_attach_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      public.is_admin_tier(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.task_attachments a
        WHERE a.storage_path = storage.objects.name
          AND (
            public.is_task_creator(a.task_id, auth.uid())
            OR public.is_task_assignee(a.task_id, auth.uid())
          )
      )
    )
  );

-- location-attachments: restrict SELECT to admins or uploader (matches write/delete)
DROP POLICY IF EXISTS loc_attach_read ON storage.objects;
CREATE POLICY loc_attach_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'location-attachments'
    AND (
      public.is_admin_tier(auth.uid())
      OR (storage.foldername(name))[1] = (auth.uid())::text
    )
  );
