import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Allow GET requests (Vercel cron sends GET)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase credentials not configured",
        timestamp: new Date().toISOString(),
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Perform a simple database operation to keep it active
    const { data, error } = await supabase
      .from("transfer_sessions")
      .select("id")
      .limit(1);

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
