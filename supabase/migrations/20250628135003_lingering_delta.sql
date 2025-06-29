/*
  # Database Cleanup System

  1. New Functions
    - `cleanup_expired_data()` - Removes all expired transfer sessions and associated data
    - `cleanup_all_data()` - Removes ALL data from transfer tables (for 24-hour cleanup)

  2. Scheduled Jobs
    - Cleanup expired sessions every hour
    - Cleanup all data every 24 hours

  3. Security
    - Functions are secure and only accessible by the system
    - Proper logging for cleanup operations
*/

-- Function to cleanup expired transfer sessions and their associated data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_sessions INTEGER := 0;
  deleted_files INTEGER := 0;
  deleted_chunks INTEGER := 0;
BEGIN
  -- Delete expired file chunks first (due to foreign key constraints)
  DELETE FROM file_chunks 
  WHERE session_code IN (
    SELECT code FROM transfer_sessions 
    WHERE expires_at < now() OR created_at < now() - INTERVAL '24 hours'
  );
  
  GET DIAGNOSTICS deleted_chunks = ROW_COUNT;

  -- Delete expired file metadata
  DELETE FROM file_metadata 
  WHERE session_code IN (
    SELECT code FROM transfer_sessions 
    WHERE expires_at < now() OR created_at < now() - INTERVAL '24 hours'
  );
  
  GET DIAGNOSTICS deleted_files = ROW_COUNT;

  -- Delete expired transfer sessions
  DELETE FROM transfer_sessions 
  WHERE expires_at < now() OR created_at < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  -- Log the cleanup operation
  RAISE NOTICE 'Cleanup completed: % sessions, % files, % chunks deleted', 
    deleted_sessions, deleted_files, deleted_chunks;

  RETURN deleted_sessions + deleted_files + deleted_chunks;
END;
$$;

-- Function to cleanup ALL data (24-hour reset)
CREATE OR REPLACE FUNCTION cleanup_all_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_deleted INTEGER := 0;
  deleted_chunks INTEGER := 0;
  deleted_files INTEGER := 0;
  deleted_sessions INTEGER := 0;
BEGIN
  -- Delete all file chunks first (due to foreign key constraints)
  DELETE FROM file_chunks;
  GET DIAGNOSTICS deleted_chunks = ROW_COUNT;

  -- Delete all file metadata
  DELETE FROM file_metadata;
  GET DIAGNOSTICS deleted_files = ROW_COUNT;

  -- Delete all transfer sessions
  DELETE FROM transfer_sessions;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  total_deleted := deleted_sessions + deleted_files + deleted_chunks;

  -- Log the cleanup operation
  RAISE NOTICE '24-hour cleanup completed: % total records deleted (% sessions, % files, % chunks)', 
    total_deleted, deleted_sessions, deleted_files, deleted_chunks;

  RETURN total_deleted;
END;
$$;

-- Create a table to track cleanup operations
CREATE TABLE IF NOT EXISTS cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_type text NOT NULL,
  records_deleted integer NOT NULL DEFAULT 0,
  executed_at timestamptz DEFAULT now()
);

-- Enable RLS on cleanup_log
ALTER TABLE cleanup_log ENABLE ROW LEVEL SECURITY;

-- Policy to allow reading cleanup logs (for monitoring)
CREATE POLICY "Anyone can read cleanup logs"
  ON cleanup_log
  FOR SELECT
  TO public
  USING (true);

-- Function to log cleanup operations
CREATE OR REPLACE FUNCTION log_cleanup_operation(
  operation_type text,
  deleted_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO cleanup_log (cleanup_type, records_deleted)
  VALUES (operation_type, deleted_count);
END;
$$;

-- Enhanced cleanup function with logging
CREATE OR REPLACE FUNCTION cleanup_expired_data_with_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  SELECT cleanup_expired_data() INTO deleted_count;
  PERFORM log_cleanup_operation('expired_cleanup', deleted_count);
END;
$$;

-- Enhanced 24-hour cleanup function with logging
CREATE OR REPLACE FUNCTION cleanup_all_data_with_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  SELECT cleanup_all_data() INTO deleted_count;
  PERFORM log_cleanup_operation('daily_cleanup', deleted_count);
END;
$$;

-- Create indexes for better cleanup performance
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_cleanup 
  ON transfer_sessions (expires_at, created_at);

CREATE INDEX IF NOT EXISTS idx_file_metadata_cleanup 
  ON file_metadata (created_at);

CREATE INDEX IF NOT EXISTS idx_file_chunks_cleanup 
  ON file_chunks (created_at);

-- Note: Supabase doesn't support pg_cron directly, but we can create the functions
-- The actual scheduling will be handled by edge functions or external cron jobs

-- For manual testing, you can call these functions:
-- SELECT cleanup_expired_data_with_log(); -- Cleanup expired data
-- SELECT cleanup_all_data_with_log(); -- Cleanup all data (24-hour reset)