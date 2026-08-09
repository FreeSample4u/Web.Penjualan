/**
 * config.js — Konfigurasi aplikasi
 * -----------------------------------------------------------------------
 * >>> UNTUK MENYAMBUNGKAN KE SUPABASE (DATABASE ASLI, MULTI-TOKO) <<<
 * 1. Buat project gratis di https://supabase.com
 * 2. Jalankan SELURUH isi file `supabase-schema.sql` lewat SQL Editor Supabase
 *    (skema ini sudah mendukung banyak toko/pembeli sekaligus, terisolasi
 *    satu sama lain, plus fungsi anti race-condition untuk stok)
 * 3. Salin "Project URL" & "anon public key" dari Settings > API
 * 4. Tempel di bawah, lalu ubah USE_SUPABASE menjadi true
 * 5. Ikuti panduan "CARA ONBOARDING PEMBELI / TOKO BARU" di bagian bawah
 *    file `supabase-schema.sql` setiap kali ada pembeli baru
 *
 * Selama USE_SUPABASE = false, aplikasi berjalan penuh dengan DATA DEMO
 * yang disimpan di localStorage browser (tetap tersimpan walau di-refresh,
 * tapi hanya di browser itu saja / tidak sinkron antar perangkat, dan TIDAK
 * terpisah per toko — cocok untuk demo/testing saja, bukan untuk dijual).
 * -----------------------------------------------------------------------
 */
const APP_CONFIG = {
  USE_SUPABASE: false,

  SUPABASE_URL: 'https://your-project-id.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-public-key',

  // Ambang batas "stok tipis" — di bawah/sama dengan angka ini akan memicu notifikasi
  LOW_STOCK_THRESHOLD: 10,
};
