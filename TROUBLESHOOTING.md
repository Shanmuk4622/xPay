# Troubleshooting Guide - FinTrack Pro

## 🐛 Common Issues & Solutions

### Issue 1: Blank Page / Stuck on "Verifying Access Protocol" Spinner

**Symptoms:**
- Application shows blank white page
- Loading spinner with "VERIFYING ACCESS PROTOCOL..." message appears indefinitely
- Console shows: `Role fetch timed out — defaulting to user`
- Network tab shows: `500 Internal Server Error` from Supabase

**Root Cause:**
The `users` table doesn't exist in your Supabase database, or Row Level Security (RLS) policies are blocking access.

**Solution:**

1. **Create the users table** in Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own record on signup
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

2. **Add your user to the table:**

After signing up/logging in, manually insert your user record:

```sql
-- Replace with your actual user ID from auth.users
INSERT INTO users (id, role, email)
VALUES (
  'your-user-uuid-here',
  'super_admin',  -- or 'admin' or 'user'
  'your-email@example.com'
);
```

3. **Verify the fix:**
- Refresh the app
- The spinner should resolve within 5 seconds
- You should be redirected to the dashboard

---

### Issue 2: React Warnings About Props (whileHover, whileTap, layoutId)

**Symptoms:**
```
React does not recognize the `whileHover` prop on a DOM element.
React does not recognize the `whileTap` prop on a DOM element.
React does not recognize the `layoutId` prop on a DOM element.
```

**Root Cause:**
The app uses a development shim for `framer-motion` that strips animation props to avoid compatibility issues.

**Solution:**
✅ **This is expected behavior in development.** The shim (`shims/framer-motion.tsx`) is configured to filter out these props before they reach the DOM. The warnings are harmless and won't appear in production builds.

**Optional:** To use real framer-motion:
1. Remove the alias from `vite.config.ts`:
   ```typescript
   // Remove this line:
   'framer-motion': path.resolve(__dirname, 'shims/framer-motion.tsx'),
   ```
2. Ensure framer-motion is properly installed:
   ```bash
   npm install framer-motion@latest
   ```

---

### Issue 3: "Element type is invalid" Error in Layout

**Symptoms:**
```
Uncaught Error: Element type is invalid: expected a string (for built-in components) 
or a class/function (for composite components) but got: undefined.
Check the render method of `Layout`.
```

**Root Cause:**
Missing or incorrect imports in the Layout component, typically from `lucide-react` or `framer-motion`.

**Solution:**
✅ **Already fixed!** The updated `framer-motion` shim properly handles all motion components. If you still see this error:

1. Check that all imports in `Layout.tsx` are valid:
   ```typescript
   import { motion, AnimatePresence } from 'framer-motion';
   import { Wallet, LogOut, LayoutDashboard, Search, PlusCircle, Menu, X, Zap, Cpu, Camera, Command } from 'lucide-react';
   ```

2. Clear Vite cache and restart:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

---

### Issue 4: Tailwind CDN Warning in Production

**Symptoms:**
```
cdn.tailwindcss.com should not be used in production. 
To use Tailwind CSS in production, install it as a PostCSS plugin
```

**Root Cause:**
The app was initially using Tailwind CDN via `<script>` tag in `index.html`.

**Solution:**
✅ **Already fixed!** The project now uses:
- Local Tailwind CSS with PostCSS
- `tailwind.config.cjs` for configuration
- `src/index.css` with `@tailwind` directives
- No CDN script tags

To verify:
```bash
# Check index.html - should NOT contain:
# <script src="https://cdn.tailwindcss.com..."></script>

# Should have comment instead:
# <!-- Tailwind CDN removed — using local Tailwind build for production -->
```

---

### Issue 5: Environment Variables Not Loading

**Symptoms:**
- Supabase connection fails
- Console shows: `Supabase URL or Key is missing`
- Auth doesn't work

**Root Cause:**
`.env` file missing or variables not prefixed correctly.

**Solution:**

1. Create `.env` file in project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   GEMINI_API_KEY=your-gemini-key-here
   ```

2. **Important:** Variables must be prefixed with `NEXT_PUBLIC_` to be exposed to the browser (Vite convention for `import.meta.env`).

3. Restart the dev server:
   ```bash
   npm run dev
   ```

4. Verify in browser console:
   ```javascript
   // Should not be undefined:
   console.log(import.meta.env.NEXT_PUBLIC_SUPABASE_URL)
   ```

---

### Issue 6: "Infinite Recursion Detected in Policy for Relation 'users'"

**Symptoms:**
- Console shows: `infinite recursion detected in policy for relation "users"`
- 500 error from Supabase when fetching user role
- App gets stuck on loading spinner or shows "Role fetch timed out"

**Root Cause:**
The RLS (Row Level Security) policies on the `users` table have a circular dependency that causes infinite recursion.

**Solution:**

**Quick Fix** - Run this SQL in Supabase SQL Editor:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Create fixed policies (no recursion)
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

**Or use the provided fix file:**
- Open `fix-rls-policies.sql` from your project
- Copy the entire contents
- Paste into Supabase SQL Editor
- Click "Run"
- Refresh your app

---

### Issue 7: "Cannot read properties of undefined" in AuthContext

**Symptoms:**
- App crashes on mount
- Console shows errors related to `supabase.auth.getSession()`

**Root Cause:**
Supabase client not initialized properly or credentials invalid.

**Solution:**

1. Verify credentials in `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://gjpskjttbvebajgevsmk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. Check `lib/supabase.ts` - ensure fallback values match your actual Supabase project.

3. Test Supabase connection:
   ```javascript
   // In browser console:
   import { supabase } from './lib/supabase';
   const { data } = await supabase.auth.getSession();
   console.log(data);
   ```

---

### Issue 8: Transactions Table 404 Error

**Symptoms:**
- Console shows: `GET .../rest/v1/transactions?select=*... 404 (Not Found)`
- Dashboard fails to load transaction data

**Root Cause:**
The `transactions` table doesn't exist in your Supabase database.

**Solution:**

Run the updated `supabase-setup.sql` file which now includes the transactions table, or run this SQL directly:

```sql
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

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions"
  ON transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
```

---

## 🚀 Quick Checklist

Before reporting an issue, verify:

- [ ] Supabase `users` table exists with correct schema
- [ ] RLS policies are configured on `users` table
- [ ] User record exists in `users` table after signup
- [ ] `.env` file contains correct Supabase credentials
- [ ] Environment variables are prefixed with `NEXT_PUBLIC_`
- [ ] Dev server restarted after `.env` changes
- [ ] Browser console checked for specific errors
- [ ] Network tab shows Supabase requests (not blocked)

---

## 📞 Getting More Help

If issues persist:

1. **Check Supabase logs:** Go to your Supabase Dashboard → Logs → API
2. **Browser DevTools:**
   - Console tab for JavaScript errors
   - Network tab for failed requests
   - Application tab to check localStorage (auth tokens)
3. **Verify versions:**
   ```bash
   node --version  # Should be 20.15+
   npm --version   # Should be 10+
   ```

---

## 🔧 Reset Everything

If nothing works, nuclear option:

```bash
# 1. Clear all caches
rm -rf node_modules
rm -rf .vite
rm -rf dist
rm package-lock.json

# 2. Reinstall
npm install

# 3. Clear browser data
# In Chrome: DevTools → Application → Clear storage → Clear site data

# 4. Restart dev server
npm run dev
```

---

**Last Updated:** December 26, 2025
