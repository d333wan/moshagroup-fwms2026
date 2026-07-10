
-- 1) Rewrite storage.objects policies for the 'task-reports' bucket
--    to verify ownership through joins against application tables.
DROP POLICY IF EXISTS "task_reports_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "task_reports_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_reports_storage_delete" ON storage.objects;

-- Path convention (see src/routes/.../reports.new.tsx):
--   {task_id}/{uploader_user_id}/{filename}
-- We authorize on task_id (segment 1) and, when attachment rows exist,
-- on the linked task_report -> task ownership/assignment chain.

CREATE POLICY "task_reports_storage_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-reports'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.task_report_attachments a
      JOIN public.task_reports r ON r.id = a.report_id
      WHERE a.storage_path = storage.objects.name
        AND (
          r.reported_by = auth.uid()
          OR public.is_task_creator(r.task_id, auth.uid())
          OR public.is_task_assignee(r.task_id, auth.uid())
        )
    )
    OR (
      -- Allow the uploader to read their own just-uploaded object
      -- before the attachment row is inserted (same transaction path).
      (storage.foldername(storage.objects.name))[2] = auth.uid()::text
      AND public.is_task_assignee(
        ((storage.foldername(storage.objects.name))[1])::uuid,
        auth.uid()
      )
    )
  )
);

CREATE POLICY "task_reports_storage_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.is_task_assignee(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
    OR public.is_task_creator(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  )
);

CREATE POLICY "task_reports_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-reports'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.task_report_attachments a
      JOIN public.task_reports r ON r.id = a.report_id
      WHERE a.storage_path = storage.objects.name
        AND r.reported_by = auth.uid()
    )
  )
);

-- 2) Revoke EXECUTE from anon (and PUBLIC) on all public SECURITY DEFINER
--    functions. These are RLS helpers and role-scoped RPCs that must never
--    be reachable without an authenticated session. Signed-in access is
--    preserved because RLS policies and app server functions require it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_report_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_active_super_admins() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_assignable_users() FROM PUBLIC, anon;

-- Ensure authenticated + service_role retain access
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_tier(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_report_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_active_super_admins() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated, service_role;
