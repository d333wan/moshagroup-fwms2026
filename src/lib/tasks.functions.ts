import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type TaskPriority = Database["public"]["Enums"]["task_priority"];
type TaskStatus = Database["public"]["Enums"]["task_status"];

const PRIORITY_VALUES: [TaskPriority, ...TaskPriority[]] = [
  "low",
  "medium",
  "high",
  "urgent",
];
const STATUS_VALUES: [TaskStatus, ...TaskStatus[]] = [
  "draft",
  "assigned",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

const prioritySchema = z.enum(PRIORITY_VALUES);
const statusSchema = z.enum(STATUS_VALUES);

async function isManagerTier(context: {
  supabase: any;
  userId: string;
}): Promise<boolean> {
  const { data, error } = await context.supabase.rpc("get_user_roles", {
    _user_id: context.userId,
  });
  if (error) return false;
  const roles = (data ?? []) as string[];
  return (
    roles.includes("super_admin") ||
    roles.includes("admin") ||
    roles.includes("manager")
  );
}

// -------- list tasks --------
const listInput = z
  .object({
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    assigneeId: z.string().uuid().optional(),
    search: z.string().trim().optional(),
  })
  .optional();

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("tasks")
      .select(
        "id, title, description, priority, status, due_date, location_text, created_by, created_at, updated_at, task_assignments(assignee_id)",
      )
      .order("created_at", { ascending: false });

    if (data?.status) q = q.eq("status", data.status);
    if (data?.priority) q = q.eq("priority", data.priority);
    if (data?.search) q = q.ilike("title", `%${data.search}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let items = (rows ?? []) as any[];
    if (data?.assigneeId) {
      items = items.filter((t) =>
        (t.task_assignments ?? []).some(
          (a: any) => a.assignee_id === data.assigneeId,
        ),
      );
    }
    return items.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string | null) ?? null,
      priority: t.priority as TaskPriority,
      status: t.status as TaskStatus,
      due_date: (t.due_date as string | null) ?? null,
      location_text: (t.location_text as string | null) ?? null,
      created_by: t.created_by as string,
      created_at: t.created_at as string,
      updated_at: t.updated_at as string,
      assignee_ids: ((t.task_assignments ?? []) as any[]).map(
        (a) => a.assignee_id as string,
      ),
    }));
  });

// -------- get task detail --------
const idInput = z.object({ id: z.string().uuid() });

export const getTask = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: task, error } = await context.supabase
      .from("tasks")
      .select(
        "id, title, description, priority, status, due_date, location_text, created_by, created_at, updated_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!task) throw new Error("Tugas tidak ditemukan");

    const [{ data: assigns, error: aErr }, { data: history, error: hErr }] =
      await Promise.all([
        context.supabase
          .from("task_assignments")
          .select("assignee_id, assigned_at, assigned_by")
          .eq("task_id", data.id),
        context.supabase
          .from("task_status_history")
          .select("id, from_status, to_status, changed_by, changed_at, note")
          .eq("task_id", data.id)
          .order("changed_at", { ascending: false }),
      ]);
    if (aErr) throw new Error(aErr.message);
    if (hErr) throw new Error(hErr.message);

    return {
      task: task as any,
      assignments: (assigns ?? []) as any[],
      history: (history ?? []) as any[],
    };
  });

// -------- create task --------
const createInput = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(4000).optional().nullable(),
  priority: prioritySchema.default("medium"),
  status: statusSchema.default("draft"),
  due_date: z.string().datetime().optional().nullable(),
  location_text: z.string().max(500).optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  assignee_ids: z.array(z.string().uuid()).default([]),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh peran manager atau lebih tinggi");

    const initialStatus: TaskStatus =
      data.assignee_ids.length > 0 && data.status === "draft"
        ? "assigned"
        : data.status;

    const { data: inserted, error } = await context.supabase
      .from("tasks")
      .insert({
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: initialStatus,
        due_date: data.due_date ?? null,
        location_text: data.location_text ?? null,
        location_id: data.location_id ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.assignee_ids.length > 0) {
      const rows = data.assignee_ids.map((uid) => ({
        task_id: inserted.id,
        assignee_id: uid,
        assigned_by: context.userId,
      }));
      const { error: aErr } = await context.supabase
        .from("task_assignments")
        .insert(rows);
      if (aErr) throw new Error(aErr.message);
    }
    return { id: inserted.id as string };
  });

// -------- update task --------
const updateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    priority: prioritySchema.optional(),
    due_date: z.string().datetime().nullable().optional(),
    location_text: z.string().max(500).nullable().optional(),
  }),
});

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh peran manager atau lebih tinggi");
    const { error } = await context.supabase
      .from("tasks")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- delete task --------
export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh peran manager atau lebih tinggi");
    const { error } = await context.supabase
      .from("tasks")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- assign task --------
const assignInput = z.object({
  task_id: z.string().uuid(),
  assignee_ids: z.array(z.string().uuid()),
});

export const assignTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assignInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh peran manager atau lebih tinggi");

    const { error: delErr } = await context.supabase
      .from("task_assignments")
      .delete()
      .eq("task_id", data.task_id);
    if (delErr) throw new Error(delErr.message);

    if (data.assignee_ids.length > 0) {
      const rows = data.assignee_ids.map((uid) => ({
        task_id: data.task_id,
        assignee_id: uid,
        assigned_by: context.userId,
      }));
      const { error: insErr } = await context.supabase
        .from("task_assignments")
        .insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true };
  });

// -------- change status --------
const statusChangeInput = z.object({
  id: z.string().uuid(),
  to_status: statusSchema,
  note: z.string().max(500).optional(),
});

export const changeTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => statusChangeInput.parse(d))
  .handler(async ({ data, context }) => {
    // RLS already restricts to manager+ or assignee; extra safety:
    const { error } = await context.supabase
      .from("tasks")
      .update({ status: data.to_status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.note && data.note.trim().length > 0) {
      // Add explanatory note as a separate history entry
      await context.supabase.from("task_status_history").insert({
        task_id: data.id,
        from_status: data.to_status,
        to_status: data.to_status,
        changed_by: context.userId,
        note: data.note,
      });
    }
    return { ok: true };
  });

// -------- list assignable users --------
export const listAssignableUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc(
      "list_assignable_users",
    );
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const ids = rows.map((r) => r.user_id);
    let profileById = new Map<string, any>();
    if (ids.length > 0) {
      const { data: pRows } = await context.supabase
        .from("profiles")
        .select("id, phone, job_title")
        .in("id", ids);
      profileById = new Map(
        ((pRows ?? []) as any[]).map((p) => [p.id, p]),
      );
    }
    return rows.map((r) => {
      const p = profileById.get(r.user_id);
      return {
        user_id: r.user_id as string,
        full_name: (r.full_name as string | null) ?? "",
        role: r.role as string,
        phone: (p?.phone as string | null) ?? null,
        job_title: (p?.job_title as string | null) ?? null,
      };
    });
  });

// -------- list assignments for print report --------
const printInput = z.object({
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  from: z.string().optional().nullable(),
  to: z.string().optional().nullable(),
});

export const listAssignmentsForPrint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => printInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("tasks")
      .select(
        "id, title, priority, status, due_date, location_text, location_id, created_by, created_at",
      )
      .order("created_at", { ascending: false });

    if (data?.status) q = q.eq("status", data.status);
    if (data?.priority) q = q.eq("priority", data.priority);
    if (data?.from) q = q.gte("created_at", data.from);
    if (data?.to) q = q.lte("created_at", data.to);

    const { data: tasks, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (tasks ?? []) as any[];

    const taskIds = rows.map((t) => t.id);
    const locationIds = Array.from(
      new Set(rows.map((t) => t.location_id).filter(Boolean)),
    );

    const [assignRes, locRes] = await Promise.all([
      taskIds.length
        ? context.supabase
            .from("task_assignments")
            .select("task_id, assignee_id")
            .in("task_id", taskIds)
        : Promise.resolve({ data: [], error: null } as any),
      locationIds.length
        ? context.supabase
            .from("locations")
            .select("id, name, address, city, province, latitude, longitude")
            .in("id", locationIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (assignRes.error) throw new Error(assignRes.error.message);
    if (locRes.error) throw new Error(locRes.error.message);

    const assignments = (assignRes.data ?? []) as any[];
    const assigneeIds = Array.from(
      new Set(assignments.map((a) => a.assignee_id).filter(Boolean)),
    );
    let profileById = new Map<string, any>();
    if (assigneeIds.length > 0) {
      const { data: pRows, error: pErr } = await context.supabase
        .from("profiles")
        .select("id, full_name, job_title, phone")
        .in("id", assigneeIds);
      if (pErr) throw new Error(pErr.message);
      profileById = new Map(
        ((pRows ?? []) as any[]).map((p) => [p.id, p]),
      );
    }

    const locById = new Map(
      ((locRes.data ?? []) as any[]).map((l) => [l.id, l]),
    );
    const assignsByTask = new Map<string, any[]>();
    for (const a of assignments) {
      const arr = assignsByTask.get(a.task_id) ?? [];
      const profile = profileById.get(a.assignee_id);
      arr.push({
        assignee_id: a.assignee_id,
        full_name: profile?.full_name ?? "",
        job_title: profile?.job_title ?? null,
        phone: profile?.phone ?? null,
      });
      assignsByTask.set(a.task_id, arr);
    }

    return rows.map((t) => {
      const loc = t.location_id ? locById.get(t.location_id) : null;
      return {
        id: t.id as string,
        title: t.title as string,
        priority: t.priority as TaskPriority,
        status: t.status as TaskStatus,
        due_date: (t.due_date as string | null) ?? null,
        created_at: t.created_at as string,
        location_text: (t.location_text as string | null) ?? null,
        location: loc
          ? {
              name: loc.name as string,
              address: (loc.address as string | null) ?? null,
              city: (loc.city as string | null) ?? null,
              province: (loc.province as string | null) ?? null,
              latitude: (loc.latitude as number | null) ?? null,
              longitude: (loc.longitude as number | null) ?? null,
            }
          : null,
        assignees: assignsByTask.get(t.id) ?? [],
      };
    });
  });
