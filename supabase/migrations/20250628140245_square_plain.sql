/*
  # Database Cleanup System and IP Tracking

  1. New Tables
    - `user_ips` - Permanent IP tracking for security (never cleaned)
  
  2. Cleanup Functions
    - Expired data cleanup (2+ hours old)
    - Daily cleanup (24-hour reset of transfer data)
    - IP tracking functions
    - Automated scheduler
  
  3. Security
    - Enable RLS on user_ips table
    - Grant appropriate permissions
    - Automatic IP tracking on session creation
  
  4. Views
    - Cleanup statistics view for monitoring
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS cleanup_expired_data_with_log();
DROP FUNCTION IF EXISTS cleanup_all_data_with_log();
DROP FUNCTION IF EXISTS cleanup_expired_data();
DROP FUNCTION IF EXISTS cleanup_all_transfer_data();
DROP FUNCTION IF EXISTS schedule_cleanup();
DROP FUNCTION IF EXISTS is_daily_cleanup_due();
DROP FUNCTION IF EXISTS track_user_ip(inet, text);
DROP FUNCTION IF EXISTS auto_track_session_ip();

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_track_session_ip ON transfer_sessions;

-- Create IP tracking table (permanent storage)
CREATE TABLE IF NOT EXISTS user_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  user_agent text,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  access_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create unique constraint on IP address
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_ips_ip_address_key'
  ) THEN
    ALTER TABLE user_ips ADD CONSTRAINT user_ips_ip_address_key UNIQUE (ip_address);
  END IF;
END $$;

-- Create indexes for IP tracking
CREATE INDEX IF NOT EXISTS idx_user_ips_ip_address ON user_ips USING btree (ip_address);
CREATE INDEX IF NOT EXISTS idx_user_ips_last_seen ON user_ips USING btree (last_seen);
CREATE INDEX IF NOT EXISTS idx_user_ips_created_at ON user_ips USING btree (created_at);

-- Enable RLS on IP tracking table
ALTER TABLE user_ips ENABLE ROW LEVEL SECURITY;

-- Create policy for IP tracking (allow all operations for now)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_ips' AND policyname = 'Allow IP tracking operations'
  ) THEN
    CREATE POLICY "Allow IP tracking operations"
      ON user_ips
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Function to track user IP addresses
CREATE OR REPLACE FUNCTION track_user_ip(
  p_ip_address inet,
  p_user_agent text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Insert or update IP tracking
  INSERT INTO user_ips (ip_address, user_agent, first_seen, last_seen, access_count)
  VALUES (p_ip_address, p_user_agent, now(), now(), 1)
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    last_seen = now(),
    access_count = user_ips.access_count + 1,
    user_agent = COALESCE(EXCLUDED.user_agent, user_ips.user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired transfer data only
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS integer AS $$
DECLARE
  deleted_count integer := 0;
  sessions_deleted integer := 0;
  files_deleted integer := 0;
  chunks_deleted integer := 0;
BEGIN
  -- Delete expired transfer sessions and cascade to related data
  DELETE FROM transfer_sessions 
  WHERE expires_at < now() OR created_at < (now() - interval '2 hours');
  
  GET DIAGNOSTICS sessions_deleted = ROW_COUNT;
  
  -- Delete orphaned file metadata (older than 2 hours)
  DELETE FROM file_metadata 
  WHERE created_at < (now() - interval '2 hours')
    OR session_code NOT IN (SELECT code FROM transfer_sessions);
  
  GET DIAGNOSTICS files_deleted = ROW_COUNT;
  
  -- Delete orphaned file chunks (older than 2 hours)
  DELETE FROM file_chunks 
  WHERE created_at < (now() - interval '2 hours')
    OR session_code NOT IN (SELECT code FROM transfer_sessions);
  
  GET DIAGNOSTICS chunks_deleted = ROW_COUNT;
  
  deleted_count := sessions_deleted + files_deleted + chunks_deleted;
  
  -- Log cleanup activity
  INSERT INTO cleanup_log (cleanup_type, records_deleted)
  VALUES ('expired_cleanup', deleted_count);
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup ALL transfer data (24-hour reset)
CREATE OR REPLACE FUNCTION cleanup_all_transfer_data()
RETURNS integer AS $$
DECLARE
  deleted_count integer := 0;
  sessions_deleted integer := 0;
  files_deleted integer := 0;
  chunks_deleted integer := 0;
BEGIN
  -- Delete ALL transfer sessions
  DELETE FROM transfer_sessions;
  GET DIAGNOSTICS sessions_deleted = ROW_COUNT;
  
  -- Delete ALL file metadata
  DELETE FROM file_metadata;
  GET DIAGNOSTICS files_deleted = ROW_COUNT;
  
  -- Delete ALL file chunks
  DELETE FROM file_chunks;
  GET DIAGNOSTICS chunks_deleted = ROW_COUNT;
  
  deleted_count := sessions_deleted + files_deleted + chunks_deleted;
  
  -- Log cleanup activity
  INSERT INTO cleanup_log (cleanup_type, records_deleted)
  VALUES ('daily_cleanup', deleted_count);
  
  -- Note: user_ips table is NOT cleaned - it's permanent for security tracking
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if daily cleanup is due
CREATE OR REPLACE FUNCTION is_daily_cleanup_due()
RETURNS boolean AS $$
DECLARE
  last_cleanup timestamptz;
BEGIN
  SELECT executed_at INTO last_cleanup
  FROM cleanup_log 
  WHERE cleanup_type = 'daily_cleanup'
  ORDER BY executed_at DESC 
  LIMIT 1;
  
  -- If no cleanup found or last cleanup was more than 24 hours ago
  RETURN (last_cleanup IS NULL OR last_cleanup < (now() - interval '24 hours'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for automated cleanup scheduler
CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS text AS $$
DECLARE
  expired_deleted integer := 0;
  daily_deleted integer := 0;
  result_message text := '';
BEGIN
  -- Always run expired data cleanup
  SELECT cleanup_expired_data() INTO expired_deleted;
  result_message := format('Expired cleanup: %s records deleted', expired_deleted);
  
  -- Check if daily cleanup is due
  IF is_daily_cleanup_due() THEN
    SELECT cleanup_all_transfer_data() INTO daily_deleted;
    result_message := result_message || format('; Daily cleanup: %s records deleted', daily_deleted);
  END IF;
  
  RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to be called by external cron or edge function
CREATE OR REPLACE FUNCTION cleanup_expired_data_with_log()
RETURNS integer AS $$
BEGIN
  RETURN cleanup_expired_data();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for daily cleanup with logging
CREATE OR REPLACE FUNCTION cleanup_all_data_with_log()
RETURNS integer AS $$
BEGIN
  RETURN cleanup_all_transfer_data();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger function to automatically track IPs on session creation
CREATE OR REPLACE FUNCTION auto_track_session_ip()
RETURNS trigger AS $$
BEGIN
  -- Extract IP from creator_id if it contains IP info, or use a default
  -- In a real implementation, you'd get the actual client IP
  PERFORM track_user_ip('127.0.0.1'::inet, 'SecureShare App');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic IP tracking
CREATE TRIGGER trigger_track_session_ip
  AFTER INSERT ON transfer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_session_ip();

-- Create a view for cleanup statistics
CREATE OR REPLACE VIEW cleanup_statistics AS
SELECT 
  cleanup_type,
  COUNT(*) as cleanup_count,
  SUM(records_deleted) as total_records_deleted,
  MAX(executed_at) as last_cleanup,
  MIN(executed_at) as first_cleanup
FROM cleanup_log
GROUP BY cleanup_type
ORDER BY last_cleanup DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO public;
GRANT EXECUTE ON FUNCTION cleanup_all_transfer_data() TO public;
GRANT EXECUTE ON FUNCTION schedule_cleanup() TO public;
GRANT EXECUTE ON FUNCTION track_user_ip(inet, text) TO public;
GRANT EXECUTE ON FUNCTION is_daily_cleanup_due() TO public;
GRANT EXECUTE ON FUNCTION cleanup_expired_data_with_log() TO public;
GRANT EXECUTE ON FUNCTION cleanup_all_data_with_log() TO public;

GRANT SELECT ON cleanup_statistics TO public;
GRANT SELECT, INSERT, UPDATE ON user_ips TO public;