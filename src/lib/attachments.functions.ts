import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Generic attachment helpers for three buckets/tables:
 * - task-attachments  → public.task_attachments (scope by task_id)
 * - location-attachments → public.location_attachments (scope by location_id)
 * - field-report-docs → public.field_report_documents (scope by report_id)
 *
 * The physical file is uploaded from the browser (RLS on storage.objects
 * requires the first path segment to be the uploader user id). These
 * server fns handle DB row insert/list/sign/delete.
 */

type Scope = "task" | "location" | "report";

const TABLE: Record<Scope, string> = {
  task: "task_attachments",
  location: "location_attachments",
  report: "field_report_documents",
};
const BUCKET: Record<Scope, string> = {
  task: "task-attachments",
  location: "location-attachments",
  report: "field-report-docs",
};
const FK: Record<Scope, string> = {
  task: "task_id",
  location: "location_id",
  report: "report_id",
};

const scopeSchema = z.enum(["task", "location", "report"]);

// -------- list --------
const listInput = z.object({
  scope: scopeSchema,
  parent_id: z.string().uuid(),
});

export const listAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as any;
    const { data: rows, error } = await supa
      .from(TABLE[data.scope])
      .select("*")
      .eq(FK[data.scope], data.parent_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    // sign urls
    const signed = await Promise.all(
      list.map(async (r) => {
        const { data: s } = await supa.storage
          .from(BUCKET[data.scope])
          .createSignedUrl(r.storage_path, 3600);
        return { ...r, url: s?.signedUrl ?? null };
      }),
    );
    return signed;
  });

// -------- register (after browser upload) --------
const createInput = z.object({
  scope: scopeSchema,
  parent_id: z.string().uuid(),
  kind: z.enum(["surat_tugas", "other"]).optional(),
  filename: z.string().min(1).max(255),
  storage_path: z.string().min(1).max(1024),
  mime_type: z.string().max(120).optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional().nullable(),
});

export const createAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as any;
    // Enforce max 4 PDFs per field report at server side too
    if (data.scope === "report") {
      const { count } = await supa
        .from(TABLE[data.scope])
        .select("id", { count: "exact", head: true })
        .eq(FK[data.scope], data.parent_id);
      if ((count ?? 0) >= 4) throw new Error("Maksimal 4 dokumen per laporan");
    }
    const row: any = {
      [FK[data.scope]]: data.parent_id,
      filename: data.filename,
      storage_path: data.storage_path,
      mime_type: data.mime_type ?? null,
      size_bytes: data.size_bytes ?? null,
      uploaded_by: context.userId,
    };
    if (data.scope !== "report") row.kind = data.kind ?? "other";
    const { data: ins, error } = await supa
      .from(TABLE[data.scope])
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id as string };
  });

// -------- delete --------
const deleteInput = z.object({
  scope: scopeSchema,
  id: z.string().uuid(),
});

export const deleteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as any;
    const { data: row } = await supa
      .from(TABLE[data.scope])
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await supa.storage.from(BUCKET[data.scope]).remove([row.storage_path]);
    }
    const { error } = await supa
      .from(TABLE[data.scope])
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- combined list for a task (task + linked location) --------
const taskCombinedInput = z.object({ task_id: z.string().uuid() });

export const listTaskDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => taskCombinedInput.parse(d))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as any;
    const { data: task } = await supa
      .from("tasks")
      .select("id, location_id")
      .eq("id", data.task_id)
      .maybeSingle();
    if (!task) throw new Error("Tugas tidak ditemukan");

    const [tRes, lRes] = await Promise.all([
      supa
        .from("task_attachments")
        .select("*")
        .eq("task_id", data.task_id)
        .order("created_at", { ascending: false }),
      task.location_id
        ? supa
            .from("location_attachments")
            .select("*")
            .eq("location_id", task.location_id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (tRes.error) throw new Error(tRes.error.message);
    if (lRes.error) throw new Error(lRes.error.message);

    const signAll = async (bucket: string, rows: any[]) =>
      Promise.all(
        rows.map(async (r) => {
          const { data: s } = await supa.storage
            .from(bucket)
            .createSignedUrl(r.storage_path, 3600);
          return { ...r, url: s?.signedUrl ?? null };
        }),
      );

    return {
      task: await signAll("task-attachments", (tRes.data ?? []) as any[]),
      location: await signAll("location-attachments", (lRes.data ?? []) as any[]),
    };
  });
