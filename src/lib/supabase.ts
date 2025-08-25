import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create client if environment variables are available
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // We don't need user authentication for this app
        },
      })
    : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Test connection function
export const testSupabaseConnection = async () => {
  if (!supabase) {
    return false;
  }

  try {
    // Test with a simple query to check connection
    const { error } = await supabase
      .from("transfer_sessions")
      .select("count(*)")
      .limit(1);

    if (error) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
