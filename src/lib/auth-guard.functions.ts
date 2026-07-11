import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.object({ email: z.string().email().max(255) });

export const checkAccountLocked = createServerFn({ method: "POST" })
  .inputValidator((data) => emailSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("check_account_locked", { _email: data.email });
    if (error) return { locked: false };
    return { locked: Boolean(result) };
  });

export const recordFailedLogin = createServerFn({ method: "POST" })
  .inputValidator((data) => emailSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("record_failed_login", { _email: data.email });
    if (error) return null;
    return result as {
      attempts?: number;
      locked?: boolean;
      is_super_admin?: boolean;
      exists?: boolean;
    } | null;
  });
