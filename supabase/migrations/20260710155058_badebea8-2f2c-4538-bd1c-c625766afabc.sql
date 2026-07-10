
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger: on assignment insert -> notify assignee
CREATE OR REPLACE FUNCTION public.notify_on_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_title text;
BEGIN
  SELECT title INTO t_title FROM public.tasks WHERE id = NEW.task_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.assignee_id,
    'task_assigned',
    'Tugas baru ditugaskan',
    COALESCE(t_title,'Tugas baru'),
    '/dashboard/tasks/' || NEW.task_id::text
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_assignment
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();

-- Trigger: on status history insert -> notify creator + assignees (except actor)
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_title text;
  t_creator uuid;
BEGIN
  IF NEW.from_status IS NULL THEN
    RETURN NEW; -- skip initial creation
  END IF;
  SELECT title, created_by INTO t_title, t_creator FROM public.tasks WHERE id = NEW.task_id;

  -- notify creator
  IF t_creator IS NOT NULL AND t_creator <> COALESCE(NEW.changed_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (t_creator, 'task_status', 'Status tugas berubah',
      COALESCE(t_title,'') || ' → ' || NEW.to_status::text,
      '/dashboard/tasks/' || NEW.task_id::text);
  END IF;

  -- notify assignees except actor
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ta.assignee_id, 'task_status', 'Status tugas berubah',
    COALESCE(t_title,'') || ' → ' || NEW.to_status::text,
    '/dashboard/tasks/' || NEW.task_id::text
  FROM public.task_assignments ta
  WHERE ta.task_id = NEW.task_id
    AND ta.assignee_id <> COALESCE(NEW.changed_by, '00000000-0000-0000-0000-000000000000'::uuid)
    AND ta.assignee_id <> COALESCE(t_creator, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_status_change
  AFTER INSERT ON public.task_status_history
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change();
