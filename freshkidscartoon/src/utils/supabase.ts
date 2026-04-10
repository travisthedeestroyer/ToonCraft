import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';

// If credentials are missing, we export a proxy that logs a warning instead of crashing
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        console.warn(`Supabase call to "${String(prop)}" failed: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.`);
        return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
      }
    });
