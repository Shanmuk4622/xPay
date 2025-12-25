-- ============================================
-- QUICK FIX: Remove Infinite Recursion in RLS Policies
-- ============================================
-- Run this in Supabase SQL Editor if you already ran the old setup
-- This will fix the "infinite recursion detected in policy" error

-- 1. Drop the users table if it exists (to start fresh)
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Drop the enum type if it exists
DROP TYPE IF EXISTS app_role CASCADE;

-- 3. Create the role enum type
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'user');

-- 4. Create users table with proper schema
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role DEFAULT 'user'::app_role,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create fixed policies (no recursion)
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::app_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Verify setup
SELECT 'Setup complete!' AS status;
