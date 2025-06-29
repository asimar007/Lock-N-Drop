import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for configuration
console.log("Supabase Configuration:");
console.log("URL configured:", !!supabaseUrl);
console.log("Anon Key configured:", !!supabaseAnonKey);

if (supabaseUrl && supabaseAnonKey) {
  console.log("Supabase URL:", supabaseUrl);
  console.log(
    "Supabase Anon Key (first 20 chars):",
    supabaseAnonKey.substring(0, 20) + "..."
  );
} else {
  console.warn("Supabase not configured - missing environment variables");
  console.warn("Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

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
    console.error("Supabase not configured");
    return false;
  }

  try {
    // Test with a simple query to check connection
    const { data, error } = await supabase
      .from("transfer_sessions")
      .select("count(*)")
      .limit(1);

    if (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }

    console.log("Supabase connection test successful");
    return true;
  } catch (error) {
    console.error("Supabase connection test error:", error);
    return false;
  }
};
