
-- task-attachments: authenticated read/insert/delete (RLS on table already gates who sees what via signed URLs)
CREATE POLICY "task_attach_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');
CREATE POLICY "task_attach_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "task_attach_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "loc_attach_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'location-attachments');
CREATE POLICY "loc_attach_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'location-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "loc_attach_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'location-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "fr_docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'field-report-docs');
CREATE POLICY "fr_docs_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'field-report-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fr_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'field-report-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
