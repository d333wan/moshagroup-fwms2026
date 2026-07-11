import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("locations")
      .select(
        "id, name, address, city, province, postal_code, latitude, longitude, category, is_active, created_at, pic, notes, photos",
      )
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });


export const getLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("locations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Lokasi tidak ditemukan");
    return row as any;
  });

const upsertInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(200),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  category: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const upsertLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh manager+");
    const payload: any = { ...data };
    if (!payload.id) {
      payload.created_by = context.userId;
      delete payload.id;
      const { data: ins, error } = await context.supabase
        .from("locations")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: ins.id as string };
    }
    const { id, ...patch } = payload;
    const { error } = await context.supabase
      .from("locations")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isManagerTier(context)))
      throw new Error("Forbidden: butuh manager+");
    const { error } = await context.supabase
      .from("locations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
