-- ============================================
-- QUICK FIX: Populate public.users from auth.users
-- ============================================
-- Run this in Supabase SQL Editor to add your existing users
-- ============================================

-- Add all existing auth users to public.users
INSERT INTO public.users (id, email, role)
SELECT 
  id, 
  email, 
  'super_admin'::app_role  -- Change to 'admin' or 'user' if you prefer
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin'::app_role;

-- Verify it worked
SELECT 
  u.id,
  u.email,
  u.role,
  u.created_at
FROM public.users u
ORDER BY u.created_at DESC;

-- You should see your user(s) listed above with super_admin role
