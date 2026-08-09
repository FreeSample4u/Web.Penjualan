/**
 * supabase-client.js — Inisialisasi klien Supabase.
 * Membutuhkan <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * yang sudah dimuat di dashboard.html/index.html SEBELUM file ini.
 */
let supabaseClient = null;

if (APP_CONFIG.USE_SUPABASE) {
  if (window.supabase && APP_CONFIG.SUPABASE_URL.includes('supabase.co')) {
    supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
  } else {
    console.warn('[SalesBoard] USE_SUPABASE=true tapi SUPABASE_URL/ANON_KEY belum diisi di js/config.js. Fallback ke mode demo.');
    APP_CONFIG.USE_SUPABASE = false;
  }
}
