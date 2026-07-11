
CREATE POLICY "field_reports_storage_owner_all" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'field-reports'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin_tier(auth.uid())
    OR public.has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  bucket_id = 'field-reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
