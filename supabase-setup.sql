-- FinTrack Pro - Supabase Database Setup
-- Run this in your Supabase SQL Editor (Database → SQL Editor)

-- ============================================
-- 1. CREATE ROLE ENUM TYPE
-- ============================================
-- Create custom enum type for user roles
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'user');

-- ============================================
-- 2. CREATE USERS TABLE
-- ============================================
-- This table stores user roles and links to Supabase auth
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role DEFAULT 'user'::app_role,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own record
CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. CREATE TRIGGER FOR AUTO USER CREATION
-- ============================================
-- This function automatically creates a user record when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::app_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs the function above
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. CREATE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'upi', 'card')),
  description TEXT,
  reference_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all transactions (adjust based on your needs)
CREATE POLICY "Users can view transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create transactions
CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ============================================
-- 7. INSERT YOUR FIRST ADMIN USER (OPTIONAL)
-- ============================================
-- After signing up through the app, promote yourself to super_admin
-- Replace 'your-email@example.com' with your actual email

-- First, find your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then update your role (replace UUID with your actual ID from above):
-- UPDATE users SET role = 'super_admin' WHERE id = 'your-user-uuid-here';

-- Example:
-- UPDATE users SET role = 'super_admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- ============================================
-- 8. VERIFY SETUP
-- ============================================
-- Check if everything is configured correctly

-- List all users with roles:
-- SELECT u.id, u.email, u.role, u.created_at 
-- FROM users u
-- ORDER BY u.created_at DESC;

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'users';

-- ============================================
-- NOTES
-- ============================================
-- 
-- DEFAULT ROLES:
-- - user: Regular user, can view dashboard
-- - admin: Can manage transactions, search, scan receipts
-- - super_admin: Full access including AI audit
--
-- SECURITY:
-- - All users are created with 'user' role by default
-- - You must manually promote users to 'admin' or 'super_admin'
-- - RLS ensures users can only read/update their own records
-- - Only service role can modify other users' data
--
-- TROUBLESHOOTING:
-- - If role fetch returns 500: Run step 1 (create users table)
-- - If role fetch times out: Check RLS policies (step 3)
-- - If no users appear: Check trigger is enabled (step 5)
--
-- ============================================

-- 🎉 Setup complete! 
-- Now sign up through your app and you'll automatically get a user record.
