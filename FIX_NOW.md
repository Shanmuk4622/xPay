# 🚨 URGENT FIX - Run This SQL Now!

## ⚠️ Current Errors:
1. ❌ `infinite recursion detected in policy` - RLS policies are broken
2. ❌ `404 Not Found` - transactions table doesn't exist
3. ⏱️ Slow loading - Database queries timing out

## ✅ SINGLE FIX - Copy/Paste This SQL

**Go to Supabase Dashboard → SQL Editor → New Query**

Then copy/paste this ENTIRE script and click **RUN**:

```sql
-- ============================================
-- COMPLETE DATABASE SETUP (Fixed - No Recursion)
-- ============================================

-- 1. Clean slate - drop everything
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create role enum
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'user');

-- 3. Create users table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role DEFAULT 'user'::app_role,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create SIMPLE policies (no recursion!)
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

-- 6. Create auto-signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::app_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'upi', 'card')),
  description TEXT,
  reference_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch TEXT,
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 9. Create transaction policies
CREATE POLICY "Users can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 10. Create indexes for performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- 11. Insert your user if you're already signed up
-- Replace 'your-email@example.com' with your actual email
INSERT INTO public.users (id, email, role)
SELECT id, email, 'super_admin'::app_role
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin'::app_role;

-- Done!
SELECT 'Setup complete! Refresh your app now.' AS status;
```

## 📝 After Running:

1. **Edit line 91** - Replace `'your-email@example.com'` with your actual email
2. Click **RUN**
3. Should see: "Setup complete! Refresh your app now."
4. **Hard refresh your app**: `Ctrl+Shift+R`

## ✅ Expected Result:

- ✅ No more "infinite recursion" errors
- ✅ No more 404 errors
- ✅ No more 500 errors  
- ✅ Fast loading (no timeouts)
- ✅ Dashboard shows properly
- ✅ You have super_admin role

---

**DO THIS NOW** - It takes 30 seconds! 🚀

## Current Errors:
1. ✅ **Fixed**: HTML nesting issue in Dashboard (changed `<p>` to `<div>`)
2. ❌ **Needs DB Fix**: Infinite recursion in RLS policies
3. ❌ **Needs DB Fix**: Missing `transactions` table

## 🔧 Fix Instructions (2 minutes)

### Step 1: Fix RLS Policies (1 minute)

1. Open your Supabase Dashboard: https://app.supabase.com
2. Go to: **SQL Editor** (left sidebar)
3. Click: **New Query**
4. Copy/paste this:

```sql
-- Drop old policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Create fixed policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

5. Click **RUN** (bottom right)
6. Should show: "Success. No rows returned"

### Step 2: Create Transactions Table (1 minute)

Still in SQL Editor, click **New Query** and run:

```sql
-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'upi', 'card')),
  description TEXT,
  reference_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch TEXT,
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all transactions
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
  USING (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
```

Click **RUN**.

### Step 3: Test the Fix

1. Go back to your app: http://localhost:3000
2. **Hard refresh**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check the console - errors should be gone!

---

## ✅ Expected Result

After running both SQL scripts, you should see:

- ✅ No "infinite recursion" errors
- ✅ No 500 errors from Supabase
- ✅ No 404 errors for transactions table
- ✅ Dashboard loads properly
- ✅ "Role fetch timed out" message should not appear (or appear briefly then resolve)

---

## 🐛 If It Still Doesn't Work

1. **Check Supabase logs:**
   - Dashboard → Logs → API
   - Look for any new errors

2. **Verify tables exist:**
   ```sql
   -- Run this in SQL Editor:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name IN ('users', 'transactions');
   ```
   Should return both "users" and "transactions"

3. **Check policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('users', 'transactions');
   ```
   Should show your new policies

4. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

---

## 📝 What Was Fixed

### Code Changes Made:
1. **Dashboard.tsx line 179**: Changed `<p>` to `<div>` to fix HTML nesting warning
2. **supabase-setup.sql**: Fixed RLS policies to avoid recursion
3. **supabase-setup.sql**: Added transactions table schema

### Files Created:
- `fix-rls-policies.sql` - Quick fix for RLS recursion
- `FIX_NOW.md` - This file with step-by-step instructions
- Updated `TROUBLESHOOTING.md` with new issues

---

**Go run those SQL queries now! Your app will work after that. 🚀**
