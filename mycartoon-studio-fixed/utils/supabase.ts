import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase public URL or Anon Key is missing. Check your .env file and Vercel environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
