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
