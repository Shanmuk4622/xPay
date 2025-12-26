-- ============================================
-- MIGRATION: Convert to Personal Finance Tracker Schema
-- ============================================
-- This script adds the columns needed for a personal finance tracker
-- Run this in Supabase SQL Editor
-- ============================================

-- Add 'category' column for transaction categories
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

-- Add 'type' column for income/expense (if it doesn't exist or was removed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' AND column_name = 'type') THEN
    ALTER TABLE public.transactions ADD COLUMN type TEXT DEFAULT 'expense';
  END IF;
END $$;

-- Add 'description' column (if it doesn't exist)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add 'date' column for transaction date
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Update the type column constraint to allow income/expense
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense'));

-- Update category column constraint  
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_category_check CHECK (category IN (
  'food', 'transport', 'shopping', 'entertainment', 'bills', 
  'health', 'education', 'salary', 'investment', 'freelance', 'gift', 'other'
));

-- Set default values for existing records
UPDATE public.transactions SET category = 'other' WHERE category IS NULL;
UPDATE public.transactions SET type = 'expense' WHERE type IS NULL;
UPDATE public.transactions SET date = COALESCE(created_at::date, CURRENT_DATE) WHERE date IS NULL;

-- Refresh the schema cache (important!)
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Verify the changes
-- ============================================
-- Run this to check: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions';
