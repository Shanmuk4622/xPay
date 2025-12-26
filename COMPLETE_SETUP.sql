-- ============================================
-- FINTRACK PRO - COMPLETE DATABASE SETUP
-- ============================================
-- This script completely resets and rebuilds your database
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: DELETE EVERYTHING (Clean Slate)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;

-- STEP 2: CREATE ROLE TYPE
-- ============================================
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'user');

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

-- STEP 4: ENABLE ROW LEVEL SECURITY ON USERS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- STEP 5: CREATE USERS POLICIES (Simple - No Recursion!)
-- ============================================

-- Allow users to read their own profile ONLY
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- STEP 6: CREATE AUTO-SIGNUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::app_role);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- STEP 7: CREATE SIGNUP TRIGGER
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 8: CREATE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(15, 2) NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'bank', 'upi', 'card')),
  source TEXT NOT NULL,
  reference_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  secure_id TEXT,
  signature TEXT,
  audit_tag TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STEP 9: ENABLE ROW LEVEL SECURITY ON TRANSACTIONS
-- ============================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- STEP 10: CREATE TRANSACTIONS POLICIES
-- ============================================

-- Allow all authenticated users to view all transactions
CREATE POLICY "transactions_select_all"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create transactions
CREATE POLICY "transactions_insert_own"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own transactions
CREATE POLICY "transactions_update_own"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Allow users to delete their own transactions
CREATE POLICY "transactions_delete_own"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- STEP 11: CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_payment_mode ON public.transactions(payment_mode);
CREATE INDEX idx_transactions_source ON public.transactions(source);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_secure_id ON public.transactions(secure_id);

-- STEP 12: INSERT YOUR ADMIN USER
-- ============================================
-- IMPORTANT: Replace 'your-email@example.com' with your actual email!

DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get your user ID from auth.users
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = 'your-email@example.com'; -- CHANGE THIS!

  -- If user exists, insert or update their role
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.users (id, email, role)
    VALUES (user_uuid, 'your-email@example.com', 'super_admin'::app_role)
    ON CONFLICT (id) 
    DO UPDATE SET role = 'super_admin'::app_role;
    
    RAISE NOTICE 'User promoted to super_admin successfully!';
  ELSE
    RAISE NOTICE 'User not found. Sign up first, then run this script again.';
  END IF;
END $$;

-- STEP 13: VERIFY SETUP
-- ============================================
SELECT 
  'Setup Complete!' as status,
  (SELECT COUNT(*) FROM public.users) as total_users,
  (SELECT COUNT(*) FROM public.transactions) as total_transactions;

-- ============================================
-- DONE! 
-- ============================================
-- Next steps:
-- 1. If you haven't signed up yet, go to your app and sign up
-- 2. Come back here and change 'your-email@example.com' on line 164
-- 3. Run this script again to promote yourself to super_admin
-- 4. Refresh your app - everything should work!
-- ============================================
