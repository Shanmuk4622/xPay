import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gjpskjttbvebajgevsmk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcHNranR0YnZlYmFqZ2V2c21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDk2NDEsImV4cCI6MjA4MjIyNTY0MX0.pq79JM9tznS-fzNzEEamovS5UbXomDEGvMklnlJdyyE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'xpay-web',
    },
  },
  db: {
    schema: 'public',
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'super_admin' | 'admin' | 'user';
          created_at: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          amount: number;
          payment_mode: 'cash' | 'bank' | 'upi' | 'card';
          source: string;
          reference_id: string | null;
          created_at: string;
          created_by: string | null;
          tags: string[] | null;
        };
      };
    };
  };
};
