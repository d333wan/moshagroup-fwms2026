import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ limit: z.number().int().min(1).max(100).default(30) })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 30;
    const { data: rows, error } = await context.supabase
      .from("notifications")
      .select("id, type, title, body, link, is_read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const unreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId);
    if (data.ids && data.ids.length > 0) q = q.in("id", data.ids);
    else q = q.eq("is_read", false);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
