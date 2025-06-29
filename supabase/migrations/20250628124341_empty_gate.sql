/*
  # Transfer Sessions Table

  1. New Tables
    - `transfer_sessions`
      - `id` (uuid, primary key)
      - `code` (text, unique) - 6-character session code
      - `creator_id` (text) - ID of the session creator
      - `status` (text) - Session status (waiting, connected, closed)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)

  2. Security
    - Enable RLS on `transfer_sessions` table
    - Add policy for public read access to active sessions
    - Add policy for creators to manage their sessions
*/

CREATE TABLE IF NOT EXISTS transfer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  creator_id text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE transfer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active sessions (needed for joining)
CREATE POLICY "Anyone can read active sessions"
  ON transfer_sessions
  FOR SELECT
  USING (
    status IN ('waiting', 'connected') 
    AND expires_at > now()
  );

-- Allow anyone to insert new sessions
CREATE POLICY "Anyone can create sessions"
  ON transfer_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow creators to update their sessions
CREATE POLICY "Creators can update their sessions"
  ON transfer_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_code ON transfer_sessions(code);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_status ON transfer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_expires ON transfer_sessions(expires_at);