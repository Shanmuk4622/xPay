-- ============================================
-- FINTRACK PRO - COMPLETE DATABASE SETUP
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- Go to: Dashboard → SQL Editor → New Query
-- Paste this entire file and click "Run"
-- ============================================

-- ============================================
-- STEP 1: CLEAN UP (Drop everything first)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
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
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;

-- ============================================
-- STEP 2: CREATE ROLE TYPE
-- ============================================
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'user');

-- ============================================
-- STEP 3: CREATE USERS TABLE
-- ============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role DEFAULT 'user'::app_role NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE USERS POLICIES
-- ============================================
-- Users can read their own profile
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 5: CREATE AUTO-SIGNUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::app_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 6: CREATE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  source TEXT,
  payment_mode TEXT DEFAULT 'cash',
  reference_id TEXT,
  branch TEXT,
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: CREATE TRANSACTIONS POLICIES
-- ============================================

-- IMPORTANT: These policies use user_id column

-- Anyone authenticated can SELECT all transactions
CREATE POLICY "transactions_select_all"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

-- Anyone authenticated can INSERT their own transactions
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own transactions
CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own transactions
CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: CREATE INDEXES
-- ============================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_source ON public.transactions(source);

-- ============================================
-- STEP 9: CREATE EXISTING USERS RECORDS
-- ============================================
-- This creates user records for any auth.users that don't have one
INSERT INTO public.users (id, email, role)
SELECT id, email, 'user'::app_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 10: GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.transactions TO anon, authenticated;

-- ============================================
-- DONE! VERIFICATION QUERIES (Optional)
-- ============================================
-- Run these to verify setup:

-- Check users table:
-- SELECT * FROM public.users;

-- Check policies:
-- SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('users', 'transactions');

-- Test insert (replace with your actual user id):
-- INSERT INTO transactions (user_id, amount, source, metadata) 
-- VALUES (auth.uid(), 100, 'Test', '{"type": "expense", "category": "test"}'::jsonb);

-- ============================================
-- MAKE YOURSELF ADMIN (Run separately after signup)
-- ============================================
-- Replace 'your-email@example.com' with your email:
-- 
-- UPDATE public.users 
-- SET role = 'super_admin' 
-- WHERE email = 'your-email@example.com';
