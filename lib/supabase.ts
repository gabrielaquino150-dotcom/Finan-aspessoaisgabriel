import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid URLs/strings to avoid constructor crash
const isValidConfig = 
  typeof supabaseUrl === 'string' && 
  supabaseUrl.startsWith('http') && 
  typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.length > 0;

if (!isValidConfig) {
  console.warn('Supabase credentials missing or invalid. Check your environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). LocalStorage fallback will be used.');
}

// Use placeholders if invalid to prevent the app from crashing on startup
export const supabase = isValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-key');
