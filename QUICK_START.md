# Quick Start Guide - FinTrack Pro

This guide will get you from zero to running in under 5 minutes.

## Prerequisites

- Node.js 20.15+ ([Download](https://nodejs.org/))
- A Supabase account ([Sign up free](https://supabase.com/))
- Git (for cloning the repo)

## Step 1: Clone & Install (1 minute)

```bash
# Clone the repository
cd "d:\Documents\norse\web Applicarion\xPay"

# Install dependencies
npm install
```

## Step 2: Configure Supabase (2 minutes)

### 2.1 Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Name it "fintrack-pro" (or anything you like)
4. Choose a database password
5. Wait for the project to initialize (~1 minute)

### 2.2 Get Your Credentials

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon Public Key** (long string starting with `eyJh...`)

### 2.3 Create Environment File

Create a `.env` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://gjpskjttbvebajgevsmk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcHNranR0YnZlYmFqZ2V2c21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDk2NDEsImV4cCI6MjA4MjIyNTY0MX0.pq79JM9tznS-fzNzEEamovS5UbXomDEGvMklnlJdyyE
GEMINI_API_KEY=AIzaSyAxEpUKMThDWcPaswucTCkZAVPC0wn_Ek8
```

**⚠️ Replace these with your actual values from Supabase!**

## Step 3: Setup Database (1 minute)

### 3.1 Run SQL Setup

1. In Supabase dashboard, go to **Database** → **SQL Editor**
2. Click "New Query"
3. Copy/paste the contents of `supabase-setup.sql` from this project
4. Click "Run" (bottom right)

### 3.2 Verify Setup

```sql
-- Run this query to verify the users table was created:
SELECT * FROM users;

-- Should return empty table (no users yet)
```

## Step 4: Start the App (30 seconds)

```bash
npm run dev
```

The app will start at **http://localhost:3000**

## Step 5: Sign Up & Promote to Admin (1 minute)

### 5.1 Create Your Account

1. Open http://localhost:3000
2. You'll see the login page
3. Click "Sign Up" or create account
4. Enter your email and password
5. Check your email for verification link (optional, depends on Supabase settings)

### 5.2 Promote Yourself to Super Admin

1. Go back to Supabase → **SQL Editor**
2. Run this query (replace with your actual email):

```sql
-- Promote yourself to super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

3. Refresh the app page
4. You should now see all menu items (Scanner, Ledger, Intelligence, Entry)

## 🎉 You're Done!

You should now have full access to:

- **Pulse** (Dashboard) - Overview and recent activity
- **Scanner** - Receipt scanning with AI
- **Ledger** - Transaction search and filtering
- **Intelligence** - AI-powered audit and insights
- **Entry** - New transaction recording

---

## 🐛 Troubleshooting

### "Verifying Access Protocol" Spinner Won't Go Away

**Fix:** You forgot to run the SQL setup. Go back to Step 3.

### "Access Denied" Error

**Fix:** Your user role is 'user' (default). Run the SQL query in Step 5.2 to promote yourself.

### Blank Page

**Fix:** 
1. Open browser DevTools (F12)
2. Look at Console tab for errors
3. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for specific error messages

### Environment Variables Not Working

**Fix:**
1. Make sure `.env` file is in the project root (same folder as `package.json`)
2. Restart the dev server: `Ctrl+C` then `npm run dev`
3. Variables must start with `NEXT_PUBLIC_` for Vite to expose them

---

## 📚 Next Steps

- Read [README.md](README.md) for full project documentation
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Explore the app and create your first transaction!

---

## 🔐 Security Notes

- **Never commit `.env`** - It's already in `.gitignore`
- **Never share your Supabase keys publicly**
- For production, set environment variables in your hosting platform
- Default users get 'user' role - manually promote trusted users to 'admin'/'super_admin'

---

**Need help?** Check the console for errors and refer to the troubleshooting guide.

Happy tracking! 💰📊
