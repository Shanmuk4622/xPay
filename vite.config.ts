import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://gjpskjttbvebajgevsmk.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcHNranR0YnZlYmFqZ2V2c21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDk2NDEsImV4cCI6MjA4MjIyNTY0MX0.pq79JM9tznS-fzNzEEamovS5UbXomDEGvMklnlJdyyE'
      ),
      'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(
        env.VITE_GROQ_API_KEY || env.GROQ_API_KEY
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'framer-motion': path.resolve(__dirname, 'shims/framer-motion.tsx'),
        '@google/genai': path.resolve(__dirname, 'shims/groq-ai.ts'),
      },
    },
  };
});
