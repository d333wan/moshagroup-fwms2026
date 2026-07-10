-- Enums
CREATE TYPE public.task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.task_status AS ENUM ('draft','assigned','in_progress','on_hold','completed','cancelled');

-- Tables (create first, policies after)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'draft',
  due_date timestamptz,
  location_text text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, assignee_id)
);
CREATE INDEX task_assignments_task_id_idx ON public.task_assignments(task_id);
CREATE INDEX task_assignments_assignee_id_idx ON public.task_assignments(assignee_id);

CREATE TABLE public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_status public.task_status,
  to_status public.task_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);
CREATE INDEX task_status_history_task_id_idx ON public.task_status_history(task_id);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;
GRANT SELECT, INSERT ON public.task_status_history TO authenticated;
GRANT ALL ON public.task_status_history TO service_role;

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

-- ==== tasks policies ====
CREATE POLICY tasks_select_manager_tier ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY tasks_select_own_created ON public.tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY tasks_select_assignee ON public.tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_assignments ta
    WHERE ta.task_id = tasks.id AND ta.assignee_id = auth.uid()
  ));

CREATE POLICY tasks_insert_manager_tier ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'super_admin')
     OR public.has_role(auth.uid(),'admin')
     OR public.has_role(auth.uid(),'manager'))
    AND created_by = auth.uid()
  );

CREATE POLICY tasks_update_manager_tier ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY tasks_update_assignee ON public.tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_assignments ta
    WHERE ta.task_id = tasks.id AND ta.assignee_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_assignments ta
    WHERE ta.task_id = tasks.id AND ta.assignee_id = auth.uid()
  ));

CREATE POLICY tasks_delete_manager_tier ON public.tasks
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

-- ==== task_assignments policies ====
CREATE POLICY task_assignments_select_manager_tier ON public.task_assignments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY task_assignments_select_self ON public.task_assignments
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid());

CREATE POLICY task_assignments_select_creator ON public.task_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid()
  ));

CREATE POLICY task_assignments_write_manager_tier ON public.task_assignments
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

-- ==== task_status_history policies ====
CREATE POLICY tsh_select_manager_tier ON public.task_status_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

CREATE POLICY tsh_select_related ON public.task_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_status_history.task_id
      AND (t.created_by = auth.uid()
           OR EXISTS (SELECT 1 FROM public.task_assignments ta
                      WHERE ta.task_id = t.id AND ta.assignee_id = auth.uid()))
  ));

CREATE POLICY tsh_insert_authenticated ON public.task_status_history
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- ==== Triggers ====
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.log_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_log_status_change
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_status_change();

CREATE OR REPLACE FUNCTION public.log_task_status_initial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_log_status_initial
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_status_initial();

-- Helper: list assignable users
CREATE OR REPLACE FUNCTION public.list_assignable_users()
RETURNS TABLE (user_id uuid, full_name text, role public.app_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, ur.role
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.is_active = true
    AND ur.role IN ('petugas_lapangan','guest','manager')
  ORDER BY p.full_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.list_assignable_users() TO authenticated;