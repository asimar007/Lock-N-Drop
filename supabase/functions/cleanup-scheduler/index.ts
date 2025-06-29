/*
  # Database Cleanup Scheduler Edge Function
  
  This edge function handles automated database cleanup:
  - Runs every hour to clean expired data
  - Runs daily to clean ALL transfer data (24-hour reset)
  - Preserves IP tracking data permanently for security
  
  Deploy this function and set up a cron job to call it regularly.
*/

import { createClient } from "@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface CleanupRequest {
  type: "expired" | "daily" | "auto";
  force?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for tracking
    const clientIP =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // Track IP address (for security monitoring)
    try {
      await supabase.rpc("track_user_ip", {
        p_ip_address: clientIP,
        p_user_agent: userAgent,
      });
    } catch (ipError) {
      console.warn("IP tracking failed:", ipError);
    }

    // Parse request
    const { type = "auto", force = false }: CleanupRequest =
      req.method === "POST" ? await req.json() : { type: "auto" };

    let result;
    let message;

    switch (type) {
      case "expired":
        // Cleanup expired data only
        const { data: expiredResult, error: expiredError } = await supabase.rpc(
          "cleanup_expired_data_with_log"
        );

        if (expiredError) throw expiredError;

        result = expiredResult;
        message = `Expired data cleanup completed: ${result} records deleted`;
        break;

      case "daily":
        // Check if daily cleanup should run
        if (!force) {
          const { data: isDue, error: dueError } = await supabase.rpc(
            "is_daily_cleanup_due"
          );

          if (dueError) throw dueError;

          if (!isDue) {
            return new Response(
              JSON.stringify({
                success: true,
                message: "Daily cleanup not due yet (runs every 24 hours)",
                result: 0,
                timestamp: new Date().toISOString(),
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              }
            );
          }
        }

        // Perform daily cleanup (delete ALL transfer data, preserve IPs)
        const { data: dailyResult, error: dailyError } = await supabase.rpc(
          "cleanup_all_data_with_log"
        );

        if (dailyError) throw dailyError;

        result = dailyResult;
        message = `24-hour cleanup completed: ${result} transfer records deleted (IP data preserved)`;
        break;

      case "auto":
        // Automated cleanup - runs both expired and daily if due
        const { data: autoResult, error: autoError } = await supabase.rpc(
          "schedule_cleanup"
        );

        if (autoError) throw autoError;

        result = autoResult;
        message = `Automated cleanup completed: ${result}`;
        break;

      default:
        throw new Error("Invalid cleanup type");
    }

    // Get recent cleanup statistics
    const { data: stats, error: statsError } = await supabase
      .from("cleanup_log")
      .select("cleanup_type, records_deleted, executed_at")
      .order("executed_at", { ascending: false })
      .limit(10);

    if (statsError) throw statsError;

    // Get IP tracking statistics
    const { data: ipStats, error: ipStatsError } = await supabase
      .from("user_ips")
      .select("count(*)")
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message,
        result,
        recentCleanups: stats,
        ipTrackingCount: ipStats?.count || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
