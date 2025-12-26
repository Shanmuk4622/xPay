-- ============================================
-- QUICK FIX FOR 403 ERROR
-- ============================================
-- Run this if you're getting 403 errors on transactions
-- This fixes RLS policies WITHOUT deleting any data
-- ============================================

-- Drop existing transaction policies
DROP POLICY IF EXISTS "transactions_select_all" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Allow update for own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow delete for own transactions" ON public.transactions;

-- Make sure RLS is enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- SELECT: All authenticated users can view all transactions
CREATE POLICY "transactions_select"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Authenticated users can insert if user_id matches their id
CREATE POLICY "transactions_insert"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own transactions
CREATE POLICY "transactions_update"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Users can delete their own transactions
CREATE POLICY "transactions_delete"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- ALSO: Make sure user exists in users table
-- ============================================
-- Create user record for any auth users missing from users table
INSERT INTO public.users (id, email, role)
SELECT id, email, 'user'::app_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GRANT permissions to be safe
-- ============================================
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- ============================================
-- VERIFY: Run these to check
-- ============================================
-- Check your policies:
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'transactions';

-- Check if your user exists:
-- SELECT * FROM public.users WHERE id = auth.uid();
