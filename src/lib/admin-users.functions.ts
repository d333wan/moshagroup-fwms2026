import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin user-management server functions.
 * All functions require the caller to hold the `super_admin` role.
 * Uses the service-role admin client (loaded inside each handler) for Auth Admin API.
 * Never returns password values, service keys, or raw auth objects.
 */

const ROLE_VALUES = [
  "super_admin",
  "admin",
  "manager",
  "petugas_lapangan",
  "guest",
] as const;
const roleSchema = z.enum(ROLE_VALUES);

async function assertSuperAdmin(context: {
  supabase: any;
  userId: string;
}): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: super_admin role required");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: authList, error: authErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authErr) throw new Error(authErr.message);

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, is_active, must_change_password, locked_at, last_login_at, created_at");
    if (pErr) throw new Error(pErr.message);

    const { data: roleRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    return authList.users.map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? (u.user_metadata?.full_name as string) ?? "",
        roles: rolesByUser.get(u.id) ?? [],
        is_active: p?.is_active ?? true,
        must_change_password: p?.must_change_password ?? false,
        locked_at: p?.locked_at ?? null,
        last_login_at: p?.last_login_at ?? null,
        created_at: p?.created_at ?? u.created_at,
        email_confirmed: Boolean(u.email_confirmed_at),
      };
    });
  });

const createUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: roleSchema,
  is_active: z.boolean().default(true),
  must_change_password: z.boolean().default(true),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createUserInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.role === "super_admin") {
      // Only allow super_admin to create another super_admin — caller is super_admin already
      // (no-op check, kept for readability).
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: data.role,
        is_active: data.is_active,
        must_change_password: data.must_change_password,
      },
    });
    if (error) throw new Error(error.message);
    return { id: created.user?.id ?? null };
  });

const updateProfileInput = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
});

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Safeguard: deactivating self is forbidden
    if (data.is_active === false && data.user_id === context.userId) {
      throw new Error("Anda tidak boleh menonaktifkan akun sendiri.");
    }

    // Safeguard: don't deactivate the last active super_admin
    if (data.is_active === false) {
      const { data: isSA } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", data.user_id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (isSA) {
        const { data: count, error: cErr } = await supabaseAdmin.rpc(
          "count_active_super_admins",
        );
        if (cErr) throw new Error(cErr.message);
        if ((count as number) <= 1) {
          throw new Error(
            "Tidak bisa menonaktifkan super_admin aktif terakhir.",
          );
        }
      }
    }

    const patch: {
      full_name?: string;
      is_active?: boolean;
      must_change_password?: boolean;
      locked_at?: string | null;
    } = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.must_change_password !== undefined)
      patch.must_change_password = data.must_change_password;
    if (data.is_active === false) patch.locked_at = new Date().toISOString();
    if (data.is_active === true) patch.locked_at = null;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const setRoleInput = z.object({
  user_id: z.string().uuid(),
  role: roleSchema,
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => setRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Safeguard: demoting self away from super_admin when last one — block
    if (data.user_id === context.userId && data.role !== "super_admin") {
      const { data: count } = await supabaseAdmin.rpc(
        "count_active_super_admins",
      );
      if ((count as number) <= 1) {
        throw new Error(
          "Anda super_admin aktif terakhir — tidak bisa menurunkan role sendiri.",
        );
      }
    }

    // Replace all existing roles with the single new one (simple single-role model for now)
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (insErr) throw new Error(insErr.message);

    return { ok: true };
  });

const deleteUserInput = z.object({ user_id: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteUserInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("Anda tidak boleh menghapus akun sendiri.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // If target is a super_admin, ensure at least one other active super_admin remains
    const { data: isSA } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.user_id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (isSA) {
      const { data: count } = await supabaseAdmin.rpc(
        "count_active_super_admins",
      );
      if ((count as number) <= 1) {
        throw new Error("Tidak bisa menghapus super_admin aktif terakhir.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const resetPasswordInput = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(8),
  require_change: z.boolean().default(true),
});

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => resetPasswordInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.user_id,
      { password: data.new_password },
    );
    if (error) throw new Error(error.message);
    if (data.require_change) {
      await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", data.user_id);
    }
    return { ok: true };
  });
