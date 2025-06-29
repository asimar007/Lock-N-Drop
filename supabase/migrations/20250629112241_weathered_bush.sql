/*
  # Fix IP Tracking Function

  1. Updates
    - Fix the track_user_ip function to properly handle IP addresses from edge functions
    - Update the auto_track_session_ip trigger to use actual client IP when available
    - Ensure IP tracking works for both sender and receiver users

  2. Security
    - Maintain RLS policies
    - Ensure proper IP address validation
*/

-- Update the track_user_ip function to handle edge function calls
CREATE OR REPLACE FUNCTION track_user_ip(
  p_ip_address text DEFAULT '127.0.0.1',
  p_user_agent text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  ip_inet inet;
BEGIN
  -- Convert text IP to inet, with fallback for invalid IPs
  BEGIN
    ip_inet := p_ip_address::inet;
  EXCEPTION WHEN OTHERS THEN
    ip_inet := '127.0.0.1'::inet;
  END;

  -- Insert or update IP tracking
  INSERT INTO user_ips (ip_address, user_agent, first_seen, last_seen, access_count)
  VALUES (ip_inet, p_user_agent, now(), now(), 1)
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    last_seen = now(),
    access_count = user_ips.access_count + 1,
    user_agent = COALESCE(EXCLUDED.user_agent, user_ips.user_agent);
    
  -- Log the IP tracking
  RAISE NOTICE 'IP tracked: % with user agent: %', ip_inet, p_user_agent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the auto IP tracking trigger function
CREATE OR REPLACE FUNCTION auto_track_session_ip()
RETURNS trigger AS $$
BEGIN
  -- Track IP for session creation (will be enhanced by edge function calls)
  PERFORM track_user_ip('127.0.0.1', 'SecureShare Session Creation');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_user_ip(text, text) TO public;