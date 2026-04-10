import { createClient } from '@supabase/supabase-js';

// Priority: LocalStorage (Manual Config) > Environment Variables
const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('MY_SAMSAT_SUPABASE_URL');
  const localKey = localStorage.getItem('MY_SAMSAT_SUPABASE_ANON_KEY');
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

  return {
    url: localUrl || envUrl,
    key: localKey || envKey
  };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = Boolean(
  config.url && 
  config.key && 
  config.url !== 'https://your-project.supabase.co' &&
  !config.url.includes('placeholder')
);

export const supabase = createClient(
  config.url || 'https://placeholder.supabase.co',
  config.key || 'placeholder'
);

export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('MY_SAMSAT_SUPABASE_URL', url);
  localStorage.setItem('MY_SAMSAT_SUPABASE_ANON_KEY', key);
  window.location.reload(); // Reload to apply new config
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('MY_SAMSAT_SUPABASE_URL');
  localStorage.removeItem('MY_SAMSAT_SUPABASE_ANON_KEY');
  window.location.reload();
};
