/*
  # Add file storage tables for simple file transfer

  1. New Tables
    - `file_metadata` - stores file information and encryption keys
    - `file_chunks` - stores encrypted file chunks
  
  2. Security
    - Enable RLS on both tables
    - Allow public access for file transfer functionality
    - Add cleanup policies for expired files
*/

-- File metadata table
CREATE TABLE IF NOT EXISTS file_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  encryption_key text NOT NULL,
  total_chunks integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- File chunks table
CREATE TABLE IF NOT EXISTS file_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text NOT NULL,
  file_id uuid NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_data text NOT NULL, -- base64 encoded encrypted data
  iv text NOT NULL, -- base64 encoded initialization vector
  total_chunks integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;

-- Policies for file_metadata
CREATE POLICY "Anyone can read file metadata"
  ON file_metadata
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert file metadata"
  ON file_metadata
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete file metadata"
  ON file_metadata
  FOR DELETE
  USING (true);

-- Policies for file_chunks
CREATE POLICY "Anyone can read file chunks"
  ON file_chunks
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert file chunks"
  ON file_chunks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete file chunks"
  ON file_chunks
  FOR DELETE
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_metadata_session_code ON file_metadata(session_code);
CREATE INDEX IF NOT EXISTS idx_file_metadata_created_at ON file_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_file_chunks_session_code ON file_chunks(session_code);
CREATE INDEX IF NOT EXISTS idx_file_chunks_chunk_index ON file_chunks(file_id, chunk_index);

-- Function to cleanup old files (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS void AS $$
BEGIN
  DELETE FROM file_metadata 
  WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-old-files', '0 * * * *', 'SELECT cleanup_old_files();');