-- ============================================
-- MIGRATION: Add Missing Columns to Transactions Table
-- ============================================
-- This script adds missing columns without deleting existing data
-- Run this in Supabase SQL Editor if you want to keep your existing transactions
-- ============================================

-- Add missing columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_mode TEXT;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS secure_id TEXT;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS signature TEXT;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS audit_tag TEXT;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Update payment_mode from type if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'transactions' AND column_name = 'type') THEN
    UPDATE public.transactions SET payment_mode = type WHERE payment_mode IS NULL;
    ALTER TABLE public.transactions DROP COLUMN IF EXISTS type;
  END IF;
END $$;

-- Update source from description if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'transactions' AND column_name = 'description') THEN
    UPDATE public.transactions SET source = description WHERE source IS NULL;
  END IF;
END $$;

-- Set created_by to user_id for existing records
UPDATE public.transactions 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- Make required columns NOT NULL (after populating them)
ALTER TABLE public.transactions 
ALTER COLUMN payment_mode SET NOT NULL;

ALTER TABLE public.transactions 
ALTER COLUMN source SET NOT NULL;

-- Add constraints
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_payment_mode_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_payment_mode_check 
CHECK (payment_mode IN ('cash', 'bank', 'upi', 'card'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_mode ON public.transactions(payment_mode);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_secure_id ON public.transactions(secure_id);

-- Update RLS policies to use created_by instead of user_id
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;

-- Recreate policies with created_by
CREATE POLICY "transactions_insert_own"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "transactions_update_own"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = created_by OR auth.uid() = user_id);

CREATE POLICY "transactions_delete_own"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = user_id);

-- Verify the changes
SELECT 
  'Migration Complete!' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('created_by', 'payment_mode', 'source', 'secure_id', 'signature', 'audit_tag', 'tags')
ORDER BY column_name;
