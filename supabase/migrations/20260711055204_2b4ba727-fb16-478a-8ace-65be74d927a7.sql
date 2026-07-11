CREATE POLICY "location-photos read (authenticated)"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'location-photos');

CREATE POLICY "location-photos insert (manager+)"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'location-photos' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "location-photos update (manager+)"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'location-photos' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "location-photos delete (manager+)"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'location-photos' AND (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  )
);