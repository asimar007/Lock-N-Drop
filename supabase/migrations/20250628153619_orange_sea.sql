/*
  # Fix RLS policies for transfer_sessions table

  1. Security Updates
    - Update the existing UPDATE policy to properly allow anonymous users to update session status
    - Ensure receivers can notify senders when downloads are complete
    - Maintain security by only allowing updates to specific status values

  2. Changes Made
    - Modified the "Creators can update their sessions" policy to work with anonymous access
    - Added proper conditions to allow status updates for download completion
*/

-- Drop the existing problematic UPDATE policy
DROP POLICY IF EXISTS "Creators can update their sessions" ON transfer_sessions;

-- Create a new UPDATE policy that allows anonymous users to update session status
CREATE POLICY "Anyone can update session status"
  ON transfer_sessions
  FOR UPDATE
  TO public
  USING (
    -- Allow updates to sessions that are active (waiting or connected)
    status IN ('waiting', 'connected') 
    AND expires_at > now()
  )
  WITH CHECK (
    -- Only allow updating to specific status values
    status IN ('waiting', 'connected', 'download_complete', 'closed')
  );