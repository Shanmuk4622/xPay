-- ============================================
-- COMPLETE FIX: Clean up all policies and recreate properly
-- ============================================

-- 1. Drop ALL existing SELECT policies on users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_select_all" ON public.users;

-- 2. Create ONE clean policy that allows all authenticated users to read all users
CREATE POLICY "users_can_read_all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Verify the user exists in public.users
-- Add all auth users to public.users if missing
INSERT INTO public.users (id, email, role)
SELECT id, email, 'super_admin'::app_role
FROM auth.users
ON CONFLICT (id) DO UPDATE SET role = 'super_admin'::app_role;

-- 4. Verify everything is working
SELECT 
  'Policy Setup Complete' as status,
  (SELECT count(*) FROM public.users) as total_users,
  (SELECT count(*) FROM pg_policies WHERE tablename = 'users' AND cmd = 'SELECT') as select_policies;

-- 5. Test the query that AuthContext uses
SELECT role FROM public.users WHERE id IN (SELECT id FROM auth.users LIMIT 1);
