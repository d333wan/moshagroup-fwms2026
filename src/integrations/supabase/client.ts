import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * Browser Supabase client for the external FWMS project.
 * Uses publishable (anon) key only — RLS applies.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "https://pkxnbazymwetrtckgikg.supabase.co",
  supabaseKey ?? "missing-publishable-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
