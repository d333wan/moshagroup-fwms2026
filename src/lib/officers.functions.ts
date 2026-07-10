import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUS_VALUES = ["available", "on_duty", "off_duty", "leave"] as const;
const statusSchema = z.enum(STATUS_VALUES);

async function isManagerTier(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("get_user_roles", {
    _user_id: context.userId,
  });
  const roles = (data ?? []) as string[];
  return (
    roles.includes("super_admin") ||
    roles.includes("admin") ||
    roles.includes("manager")
  );
}

/**
 * List all field officers with profile & role info (for manager+).
 * Petugas can list only themselves via listMyOfficerProfile.
 */
export const listOfficers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh manager+");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, phone, job_title, employee_id, is_active, avatar_url",
      );
    if (pErr) throw new Error(pErr.message);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["petugas_lapangan", "guest", "manager"]);
    if (rErr) throw new Error(rErr.message);

    const roleByUser = new Map<string, string>();
    for (const r of roles ?? []) roleByUser.set(r.user_id, r.role);

    const officerIds = Array.from(roleByUser.keys());
    if (officerIds.length === 0) return [];

    const { data: officers, error: oErr } = await supabaseAdmin
      .from("field_officers")
      .select("user_id, department, skills, base_location_id, status, notes")
      .in("user_id", officerIds);
    if (oErr) throw new Error(oErr.message);
    const byUser = new Map((officers ?? []).map((o) => [o.user_id, o]));

    return (profiles ?? [])
      .filter((p) => roleByUser.has(p.id))
      .map((p) => {
        const o = byUser.get(p.id);
        return {
          user_id: p.id,
          full_name: p.full_name ?? "",
          phone: p.phone ?? null,
          job_title: p.job_title ?? null,
          employee_id: p.employee_id ?? null,
          is_active: p.is_active,
          avatar_url: p.avatar_url ?? null,
          role: roleByUser.get(p.id) ?? "guest",
          department: o?.department ?? null,
          skills: (o?.skills ?? []) as string[],
          base_location_id: o?.base_location_id ?? null,
          status: (o?.status ?? "available") as string,
          notes: o?.notes ?? null,
        };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  });

export const getOfficer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const canManage = await isManagerTier(context);
    if (!canManage && data.user_id !== context.userId)
      throw new Error("Forbidden");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: p, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, phone, job_title, employee_id, is_active, avatar_url",
      )
      .eq("id", data.user_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!p) throw new Error("Profil tidak ditemukan");
    const { data: o } = await supabaseAdmin
      .from("field_officers")
      .select("user_id, department, skills, base_location_id, status, notes")
      .eq("user_id", data.user_id)
      .maybeSingle();
    return {
      profile: p as any,
      officer: (o ?? null) as any,
    };
  });

const upsertInput = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  job_title: z.string().max(120).nullable().optional(),
  employee_id: z.string().max(50).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  skills: z.array(z.string().max(60)).optional(),
  base_location_id: z.string().uuid().nullable().optional(),
  status: statusSchema.optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const upsertOfficer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const canManage = await isManagerTier(context);
    const isSelf = data.user_id === context.userId;
    if (!canManage && !isSelf) throw new Error("Forbidden");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Profile updates
    const profilePatch: any = {};
    if (data.full_name !== undefined) profilePatch.full_name = data.full_name;
    if (data.phone !== undefined) profilePatch.phone = data.phone;
    if (data.job_title !== undefined) profilePatch.job_title = data.job_title;
    if (data.employee_id !== undefined)
      profilePatch.employee_id = data.employee_id;
    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch)
        .eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }

    // Field officer row (upsert)
    const officerPatch: any = { user_id: data.user_id };
    if (data.department !== undefined) officerPatch.department = data.department;
    if (data.skills !== undefined) officerPatch.skills = data.skills;
    if (data.base_location_id !== undefined)
      officerPatch.base_location_id = data.base_location_id;
    if (data.status !== undefined) officerPatch.status = data.status;
    if (data.notes !== undefined) officerPatch.notes = data.notes;

    const { error: oErr } = await supabaseAdmin
      .from("field_officers")
      .upsert(officerPatch, { onConflict: "user_id" });
    if (oErr) throw new Error(oErr.message);
    return { ok: true };
  });

export const updateMyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: statusSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("field_officers")
      .upsert(
        { user_id: context.userId, status: data.status },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
