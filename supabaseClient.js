const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV;

// supabaseClient.js
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
