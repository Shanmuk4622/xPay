
import { createClient } from '@supabase/supabase-js';

// Helper to safely access process.env or return fallback
const getEnv = (key: string, fallback: string) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // process is not defined
  }
  return fallback;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://gjpskjttbvebajgevsmk.supabase.co');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcHNranR0YnZlYmFqZ2V2c21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDk2NDEsImV4cCI6MjA4MjIyNTY0MX0.pq79JM9tznS-fzNzEEamovS5UbXomDEGvMklnlJdyyE');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key is missing. Authentication will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
