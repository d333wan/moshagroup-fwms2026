
CREATE POLICY "task_reports_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-reports' AND (
      public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'manager')
      OR owner = auth.uid()
    )
  );

CREATE POLICY "task_reports_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-reports' AND owner = auth.uid());

CREATE POLICY "task_reports_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-reports' AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'manager')
    )
  );
