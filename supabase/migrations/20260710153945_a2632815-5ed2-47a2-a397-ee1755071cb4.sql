-- Helper: is user assigned to a task?
CREATE OR REPLACE FUNCTION public.is_task_assignee(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE task_id = _task_id AND assignee_id = _user_id
  )
$$;

-- Helper: is user the creator of a task?
CREATE OR REPLACE FUNCTION public.is_task_creator(_task_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = _task_id AND created_by = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid, uuid) TO authenticated;

-- Rebuild tasks policies that referenced task_assignments
DROP POLICY IF EXISTS tasks_select_assignee ON public.tasks;
CREATE POLICY tasks_select_assignee ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_task_assignee(id, auth.uid()));

DROP POLICY IF EXISTS tasks_update_assignee ON public.tasks;
CREATE POLICY tasks_update_assignee ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.is_task_assignee(id, auth.uid()))
  WITH CHECK (public.is_task_assignee(id, auth.uid()));

-- Rebuild task_assignments policy that referenced tasks
DROP POLICY IF EXISTS task_assignments_select_creator ON public.task_assignments;
CREATE POLICY task_assignments_select_creator ON public.task_assignments
  FOR SELECT TO authenticated
  USING (public.is_task_creator(task_id, auth.uid()));

-- Rebuild task_status_history policy that referenced both
DROP POLICY IF EXISTS tsh_select_related ON public.task_status_history;
CREATE POLICY tsh_select_related ON public.task_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_task_creator(task_id, auth.uid())
    OR public.is_task_assignee(task_id, auth.uid())
  );