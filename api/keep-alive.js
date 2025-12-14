import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Allow GET requests (Vercel cron sends GET)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify the request is from Vercel Cron
  const cronSecret =
    req.headers["x-vercel-cron-secret"] ||
    req.headers.authorization?.replace("Bearer ", "");

  // Use process.env.CRON_SECRET if available
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // robustly check for env vars (Vercel vs Vite prefixes)
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials missing");
      return res.status(500).json({
        error: "Supabase credentials not configured",
        timestamp: new Date().toISOString(),
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Perform a lightweight database operation to keep it active
    // Using count with head: true is lighter than selecting actual data
    // and often bypasses some RLS issues if we just check existence
    const { error } = await supabase
      .from("transfer_sessions")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Supabase ping failed:", error);
      return res.status(500).json({
        error: "Database ping failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    console.log("Supabase keep-alive ping successful");
    return res.status(200).json({
      success: true,
      message: "Database pinged successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keep-alive error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
