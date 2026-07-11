import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type FieldReportStatus = Database["public"]["Enums"]["field_report_status"];
type FieldWorkStatus = Database["public"]["Enums"]["field_work_status"];
type FieldPhotoType = Database["public"]["Enums"]["field_photo_type"];
type FieldGpsSource = Database["public"]["Enums"]["field_gps_source"];
type FieldPhotoSource = Database["public"]["Enums"]["field_photo_source"];

export const FIELD_REPORT_STATUS_VALUES: [
  FieldReportStatus,
  ...FieldReportStatus[],
] = ["draft", "submitted", "needs_revision", "approved", "rejected"];
export const FIELD_WORK_STATUS_VALUES: [FieldWorkStatus, ...FieldWorkStatus[]] =
  ["not_started", "arrived", "in_progress", "delayed", "completed"];
export const FIELD_PHOTO_TYPE_VALUES: [FieldPhotoType, ...FieldPhotoType[]] = [
  "officer_selfie",
  "location",
  "location_direction",
  "physical_condition",
  "gps_evidence",
  "vehicle",
  "obstacle",
];

export const FIELD_REPORT_STATUS_LABEL: Record<FieldReportStatus, string> = {
  draft: "Draft",
  submitted: "Terkirim",
  needs_revision: "Perlu Revisi",
  approved: "Disetujui",
  rejected: "Ditolak",
};
export const FIELD_WORK_STATUS_LABEL: Record<FieldWorkStatus, string> = {
  not_started: "Belum dimulai",
  arrived: "Tiba di lokasi",
  in_progress: "Sedang dikerjakan",
  delayed: "Tertunda",
  completed: "Selesai",
};

async function isAdminTier(context: {
  supabase: any;
  userId: string;
}): Promise<boolean> {
  const { data } = await context.supabase.rpc("get_user_roles", {
    _user_id: context.userId,
  });
  const roles = (data ?? []) as string[];
  return roles.includes("super_admin") || roles.includes("admin");
}

// ============ Create / Save draft ============
const photoInput = z.object({
  photo_type: z.enum(FIELD_PHOTO_TYPE_VALUES),
  storage_path: z.string().min(1),
  capture_source: z.enum(["camera", "gallery", "upload"]).default("camera"),
  caption: z.string().max(500).optional().nullable(),
  direction_label: z.string().max(20).optional().nullable(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  captured_at: z.string().datetime().optional(),
});

const upsertInput = z.object({
  id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  gps_accuracy: z.number().nonnegative().nullable().optional(),
  gps_source: z.enum(["device", "external"]).default("device"),
  progress_percent: z.number().int().min(0).max(100).default(0),
  work_status: z.enum(FIELD_WORK_STATUS_VALUES).default("not_started"),
  work_description: z.string().max(500).optional().nullable(),
  has_obstacle: z.boolean().default(false),
  obstacle_description: z.string().max(1000).optional().nullable(),
  assistance_needed: z.string().max(500).optional().nullable(),
  vehicle_type: z.string().max(80).optional().nullable(),
  license_plate: z.string().max(30).optional().nullable(),
  vehicle_change_reason: z.string().max(200).optional().nullable(),
  photos: z.array(photoInput).default([]),
  submit: z.boolean().default(false),
});

function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const saveFieldReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    // Load task info for radius + geo
    const { data: task, error: tErr } = await context.supabase
      .from("tasks")
      .select(
        "id, radius_meters, location_id",
      )
      .eq("id", data.task_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!task) throw new Error("Tugas tidak ditemukan");

    let distance: number | null = null;
    let within: boolean | null = null;
    if (task.location_id && data.latitude != null && data.longitude != null) {
      const { data: loc } = await context.supabase
        .from("locations")
        .select("latitude, longitude")
        .eq("id", task.location_id)
        .maybeSingle();
      if (loc && loc.latitude != null && loc.longitude != null) {
        distance = Math.round(
          haversineMeters(
            { lat: loc.latitude as number, lon: loc.longitude as number },
            { lat: data.latitude, lon: data.longitude },
          ),
        );
        within = distance <= (task.radius_meters ?? 100);
      }
    }

    const payload: any = {
      task_id: data.task_id,
      officer_id: context.userId,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      gps_accuracy: data.gps_accuracy ?? null,
      distance_from_target: distance,
      within_radius: within,
      gps_source: data.gps_source,
      progress_percent:
        data.work_status === "completed" ? 100 : data.progress_percent,
      work_status: data.work_status,
      work_description: data.work_description ?? null,
      has_obstacle: data.has_obstacle,
      obstacle_description: data.obstacle_description ?? null,
      assistance_needed: data.assistance_needed ?? null,
      vehicle_type: data.vehicle_type ?? null,
      license_plate: data.license_plate ?? null,
      vehicle_change_reason: data.vehicle_change_reason ?? null,
    };

    if (data.submit) {
      payload.status = "submitted";
      payload.submitted_at = new Date().toISOString();
    }

    let reportId: string;
    if (data.id) {
      const { error } = await context.supabase
        .from("field_reports")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      reportId = data.id;
    } else {
      const { data: ins, error } = await context.supabase
        .from("field_reports")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      reportId = ins.id as string;
    }

    if (data.photos.length > 0) {
      const rows = data.photos.map((p) => ({
        report_id: reportId,
        photo_type: p.photo_type,
        storage_path: p.storage_path,
        capture_source: p.capture_source,
        caption: p.caption ?? null,
        direction_label: p.direction_label ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        captured_at: p.captured_at ?? new Date().toISOString(),
      }));
      const { error: pErr } = await context.supabase
        .from("field_report_photos")
        .insert(rows);
      if (pErr) throw new Error(pErr.message);
    }

    return { id: reportId };
  });

// ============ List (my reports) ============
export const listMyFieldReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("field_reports")
      .select(
        "id, report_number, task_id, status, work_status, progress_percent, has_obstacle, within_radius, report_date, report_time, submitted_at, created_at",
      )
      .eq("officer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const taskIds = Array.from(new Set(rows.map((r) => r.task_id)));
    let taskById = new Map<string, any>();
    if (taskIds.length) {
      const { data: ts } = await context.supabase
        .from("tasks")
        .select("id, title, location_text")
        .in("id", taskIds);
      taskById = new Map(((ts ?? []) as any[]).map((t) => [t.id, t]));
    }
    return rows.map((r) => ({
      ...r,
      task: taskById.get(r.task_id) ?? null,
    }));
  });

// ============ List (admin) ============
const listAdminInput = z
  .object({
    status: z.enum(FIELD_REPORT_STATUS_VALUES).optional(),
    only_obstacle: z.boolean().optional(),
    only_outside_radius: z.boolean().optional(),
    from: z.string().optional().nullable(),
    to: z.string().optional().nullable(),
  })
  .optional();

export const listFieldReportsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listAdminInput.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("field_reports")
      .select(
        "id, report_number, task_id, officer_id, status, work_status, progress_percent, has_obstacle, within_radius, report_date, report_time, submitted_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data?.status) q = q.eq("status", data.status);
    if (data?.only_obstacle) q = q.eq("has_obstacle", true);
    if (data?.only_outside_radius) q = q.eq("within_radius", false);
    if (data?.from) q = q.gte("report_date", data.from);
    if (data?.to) q = q.lte("report_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const taskIds = Array.from(new Set(list.map((r) => r.task_id)));
    const officerIds = Array.from(new Set(list.map((r) => r.officer_id)));
    const [tRes, pRes] = await Promise.all([
      taskIds.length
        ? context.supabase
            .from("tasks")
            .select("id, title, location_text")
            .in("id", taskIds)
        : Promise.resolve({ data: [], error: null } as any),
      officerIds.length
        ? context.supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", officerIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (tRes.error) throw new Error(tRes.error.message);
    if (pRes.error) throw new Error(pRes.error.message);
    const taskById = new Map(((tRes.data ?? []) as any[]).map((t) => [t.id, t]));
    const officerById = new Map(
      ((pRes.data ?? []) as any[]).map((p) => [p.id, p]),
    );
    return list.map((r) => ({
      ...r,
      task: taskById.get(r.task_id) ?? null,
      officer: officerById.get(r.officer_id) ?? null,
    }));
  });

// ============ Get detail ============
const idInput = z.object({ id: z.string().uuid() });

export const getFieldReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: report, error } = await context.supabase
      .from("field_reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Laporan tidak ditemukan");

    const [
      { data: photos, error: pErr },
      { data: comments, error: cErr },
      { data: task, error: tErr },
      { data: officer, error: oErr },
    ] = await Promise.all([
      context.supabase
        .from("field_report_photos")
        .select("*")
        .eq("report_id", data.id)
        .order("captured_at", { ascending: true }),
      context.supabase
        .from("field_report_comments")
        .select("id, sender_id, message, created_at")
        .eq("report_id", data.id)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("tasks")
        .select(
          "id, title, description, location_text, location_id, radius_meters, supervisor_company_name, supervisor_person_name, supervisor_job_title, supervisor_phone, supervisor_whatsapp, emergency_contact_primary, emergency_contact_secondary, default_vehicle_type, default_license_plate, photo_direction_mode",
        )
        .eq("id", report.task_id)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("id, full_name, phone, job_title, avatar_url")
        .eq("id", report.officer_id)
        .maybeSingle(),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (cErr) throw new Error(cErr.message);
    if (tErr) throw new Error(tErr.message);
    if (oErr) throw new Error(oErr.message);

    // Sign photo URLs (short-lived)
    const signedPhotos = await Promise.all(
      ((photos ?? []) as any[]).map(async (ph) => {
        const { data: s } = await context.supabase.storage
          .from("field-reports")
          .createSignedUrl(ph.storage_path, 3600);
        return { ...ph, url: s?.signedUrl ?? null };
      }),
    );

    // Sender profiles
    const senderIds = Array.from(
      new Set(((comments ?? []) as any[]).map((c) => c.sender_id)),
    );
    let senderById = new Map<string, any>();
    if (senderIds.length) {
      const { data: sp } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);
      senderById = new Map(((sp ?? []) as any[]).map((p) => [p.id, p]));
    }

    let locationDetail: any = null;
    if (task?.location_id) {
      const { data: loc } = await context.supabase
        .from("locations")
        .select("id, name, address, city, province, latitude, longitude, pic_name, pic_phone")
        .eq("id", task.location_id)
        .maybeSingle();
      locationDetail = loc;
    }

    return {
      report: report as any,
      photos: signedPhotos,
      comments: ((comments ?? []) as any[]).map((c) => ({
        ...c,
        sender: senderById.get(c.sender_id) ?? null,
      })),
      task,
      officer,
      location: locationDetail,
    };
  });

// ============ Verify (admin) ============
const verifyInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "needs_revision"]),
  note: z.string().max(1000).optional().nullable(),
});

export const verifyFieldReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => verifyInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdminTier(context)))
      throw new Error("Forbidden: butuh peran admin");
    const status: FieldReportStatus =
      data.action === "approve"
        ? "approved"
        : data.action === "reject"
          ? "rejected"
          : "needs_revision";
    const { error } = await context.supabase
      .from("field_reports")
      .update({
        status,
        verified_at: new Date().toISOString(),
        verified_by: context.userId,
        verification_note: data.note ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.note && data.note.trim().length > 0) {
      await context.supabase.from("field_report_comments").insert({
        report_id: data.id,
        sender_id: context.userId,
        message: data.note,
      });
    }
    return { ok: true, status };
  });

// ============ Comment ============
const commentInput = z.object({
  report_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export const addFieldReportComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => commentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("field_report_comments")
      .insert({
        report_id: data.report_id,
        sender_id: context.userId,
        message: data.message,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Delete photo ============
export const deleteFieldReportPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    // fetch storage path first for cleanup
    const { data: ph } = await context.supabase
      .from("field_report_photos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (ph?.storage_path) {
      await context.supabase.storage
        .from("field-reports")
        .remove([ph.storage_path]);
    }
    const { error } = await context.supabase
      .from("field_report_photos")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
