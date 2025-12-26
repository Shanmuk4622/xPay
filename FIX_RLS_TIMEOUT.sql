-- ============================================
-- FIX: RLS Policy Blocking Role Fetch
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "users_select_own" ON public.users;

-- Create a more permissive policy that allows authenticated users to read all users
CREATE POLICY "users_select_authenticated"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users';
