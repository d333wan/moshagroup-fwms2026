import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REPORT_TYPES = ["progress", "completion", "issue"] as const;
const ATT_KINDS = ["photo", "signature", "document"] as const;

const attachmentSchema = z.object({
  storage_path: z.string().min(1).max(500),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().max(120).optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional().nullable(),
  kind: z.enum(ATT_KINDS).default("photo"),
});

const createInput = z.object({
  task_id: z.string().uuid(),
  report_type: z.enum(REPORT_TYPES).default("progress"),
  narrative: z.string().max(4000).optional().nullable(),
  checklist: z
    .array(z.object({ label: z.string().max(200), done: z.boolean() }))
    .default([]),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  attachments: z.array(attachmentSchema).default([]),
});

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("task_reports")
      .insert({
        task_id: data.task_id,
        reported_by: context.userId,
        report_type: data.report_type,
        narrative: data.narrative ?? null,
        checklist: data.checklist,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.attachments.length > 0) {
      const rows = data.attachments.map((a) => ({
        report_id: inserted.id,
        storage_path: a.storage_path,
        file_name: a.file_name,
        mime_type: a.mime_type ?? null,
        size_bytes: a.size_bytes ?? null,
        kind: a.kind,
      }));
      const { error: aErr } = await context.supabase
        .from("task_report_attachments")
        .insert(rows);
      if (aErr) throw new Error(aErr.message);
    }
    return { id: inserted.id as string };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ task_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: reports, error } = await context.supabase
      .from("task_reports")
      .select(
        "id, task_id, reported_by, report_type, narrative, checklist, latitude, longitude, reported_at",
      )
      .eq("task_id", data.task_id)
      .order("reported_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (reports ?? []).map((r) => r.id);
    let atts: any[] = [];
    if (ids.length > 0) {
      const { data: a, error: aErr } = await context.supabase
        .from("task_report_attachments")
        .select("id, report_id, storage_path, file_name, mime_type, kind")
        .in("report_id", ids);
      if (aErr) throw new Error(aErr.message);
      atts = a ?? [];
    }
    const byReport = new Map<string, any[]>();
    for (const a of atts) {
      const arr = byReport.get(a.report_id) ?? [];
      arr.push(a);
      byReport.set(a.report_id, arr);
    }
    return (reports ?? []).map((r) => ({
      ...r,
      attachments: byReport.get(r.id) ?? [],
    }));
  });

export const getSignedAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("task-reports")
      .createSignedUrl(data.path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl as string };
  });

// ---- Print/Export: list reports across tasks with signed URLs ----
const printInput = z.object({
  task_id: z.string().uuid().optional().nullable(),
  types: z.array(z.enum(REPORT_TYPES)).default([...REPORT_TYPES]),
  from: z.string().optional().nullable(),
  to: z.string().optional().nullable(),
});

export const listReportsForPrint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => printInput.parse(d))
  .handler(async ({ data, context }) => {
    const types = data.types.length ? data.types : [...REPORT_TYPES];
    let q = context.supabase
      .from("task_reports")
      .select(
        "id, task_id, reported_by, report_type, narrative, checklist, latitude, longitude, reported_at",
      )
      .in("report_type", types)
      .order("reported_at", { ascending: false });
    if (data.task_id) q = q.eq("task_id", data.task_id);
    if (data.from) q = q.gte("reported_at", data.from);
    if (data.to) q = q.lte("reported_at", data.to);

    const { data: reports, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (reports ?? []) as any[];
    const reportIds = rows.map((r) => r.id);
    const taskIds = Array.from(new Set(rows.map((r) => r.task_id)));
    const reporterIds = Array.from(
      new Set(rows.map((r) => r.reported_by).filter(Boolean)),
    );

    const [attRes, taskRes, profRes] = await Promise.all([
      reportIds.length
        ? context.supabase
            .from("task_report_attachments")
            .select("id, report_id, storage_path, file_name, mime_type, kind")
            .in("report_id", reportIds)
        : Promise.resolve({ data: [], error: null } as any),
      taskIds.length
        ? context.supabase
            .from("tasks")
            .select(
              "id, title, description, priority, status, due_date, location_text",
            )
            .in("id", taskIds)
        : Promise.resolve({ data: [], error: null } as any),
      reporterIds.length
        ? context.supabase
            .from("profiles")
            .select("id, full_name, job_title")
            .in("id", reporterIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (attRes.error) throw new Error(attRes.error.message);
    if (taskRes.error) throw new Error(taskRes.error.message);
    if (profRes.error) throw new Error(profRes.error.message);

    // Sign photo URLs
    const attachments = (attRes.data ?? []) as any[];
    const signed = await Promise.all(
      attachments.map(async (a) => {
        const { data: s } = await context.supabase.storage
          .from("task-reports")
          .createSignedUrl(a.storage_path, 3600);
        return { ...a, url: s?.signedUrl ?? null };
      }),
    );
    const attByReport = new Map<string, any[]>();
    for (const a of signed) {
      const arr = attByReport.get(a.report_id) ?? [];
      arr.push(a);
      attByReport.set(a.report_id, arr);
    }
    const taskById = new Map(
      ((taskRes.data ?? []) as any[]).map((t) => [t.id, t]),
    );
    const profById = new Map(
      ((profRes.data ?? []) as any[]).map((p) => [p.id, p]),
    );

    // Group by task
    const grouped = new Map<string, any>();
    for (const r of rows) {
      const task = taskById.get(r.task_id);
      if (!task) continue;
      if (!grouped.has(r.task_id)) {
        grouped.set(r.task_id, { task, reports: [] });
      }
      grouped.get(r.task_id)!.reports.push({
        ...r,
        reporter: profById.get(r.reported_by) ?? null,
        attachments: attByReport.get(r.id) ?? [],
      });
    }
    return {
      totalReports: rows.length,
      groups: Array.from(grouped.values()),
    };
  });
