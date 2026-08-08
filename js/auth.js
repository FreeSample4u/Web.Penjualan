/**
 * auth.js — Autentikasi & manajemen role (Owner / Kasir).
 * -----------------------------------------------------------------------
 * MODE DEMO (default, USE_SUPABASE=false): akun tersimpan di localStorage,
 * termasuk akun kasir tambahan yang dibuat Owner lewat menu Pengaturan.
 *
 * MODE SUPABASE (USE_SUPABASE=true): login memakai Supabase Auth
 * (email + password), role diambil dari tabel `profiles`.
 * -----------------------------------------------------------------------
 */

const SESSION_KEY = 'sd_is_logged_in';
const SESSION_NAME_KEY = 'sd_user_name';
const SESSION_ROLE_KEY = 'sd_user_role';
const LS_EXTRA_USERS = 'sd_extra_users'; // akun kasir tambahan (mode demo)
const LS_OWNER_OVERRIDE = 'sd_owner_override'; // perubahan profil/password Owner (mode demo)
const LS_STORE_NAME = 'sd_store_name';

const DEFAULT_DEMO_USERS = [
  { username: 'owner', password: 'owner123', role: 'owner', name: 'Owner Toko' },
  { username: 'kasir', password: 'kasir123', role: 'kasir', name: 'Kasir 1' },
];

function getDemoUsers() {
  const extra = JSON.parse(localStorage.getItem(LS_EXTRA_USERS) || '[]');
  const override = JSON.parse(localStorage.getItem(LS_OWNER_OVERRIDE) || 'null');
  const defaults = DEFAULT_DEMO_USERS.map((u) => (u.username === 'owner' && override ? { ...u, ...override } : u));
  return [...defaults, ...extra];
}

function getStoreName() {
  return localStorage.getItem(LS_STORE_NAME) || 'Toko Saya';
}

/** Menambah akun kasir baru — hanya dipanggil dari menu Pengaturan (Owner). */
function addKasirAccount(username, password, name) {
  const extra = JSON.parse(localStorage.getItem(LS_EXTRA_USERS) || '[]');
  if (getDemoUsers().some((u) => u.username === username)) {
    throw new Error('Username sudah dipakai.');
  }
  extra.push({ username, password, role: 'kasir', name });
  localStorage.setItem(LS_EXTRA_USERS, JSON.stringify(extra));
}

function listKasirAccounts() {
  return JSON.parse(localStorage.getItem(LS_EXTRA_USERS) || '[]');
}

function removeKasirAccount(username) {
  const extra = JSON.parse(localStorage.getItem(LS_EXTRA_USERS) || '[]').filter((u) => u.username !== username);
  localStorage.setItem(LS_EXTRA_USERS, JSON.stringify(extra));
}

/* --- Login --- */
async function attemptLogin(identifier, password) {
  if (APP_CONFIG.USE_SUPABASE) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: identifier, password });
    if (error) return { ok: false, message: 'Email atau password salah.' };

    const { data: profile, error: profErr } = await supabaseClient
      .from('profiles').select('full_name, role, store_name').eq('id', data.user.id).single();
    if (profErr || !profile) return { ok: false, message: 'Akun ini belum memiliki profil/role. Hubungi Owner.' };

    setSession(profile.full_name, profile.role);
    if (profile.store_name) localStorage.setItem(LS_STORE_NAME, profile.store_name);
    return { ok: true };
  }

  const user = getDemoUsers().find((u) => u.username === identifier.trim() && u.password === password);
  if (!user) return { ok: false, message: 'Username atau password salah.' };
  setSession(user.name, user.role);
  return { ok: true };
}

function setSession(name, role) {
  localStorage.setItem(SESSION_KEY, 'true');
  localStorage.setItem(SESSION_NAME_KEY, name);
  localStorage.setItem(SESSION_ROLE_KEY, role);
}

async function logoutUser() {
  if (APP_CONFIG.USE_SUPABASE) {
    try { await supabaseClient.auth.signOut(); } catch (e) { /* noop */ }
  }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_NAME_KEY);
  localStorage.removeItem(SESSION_ROLE_KEY);
  window.location.href = 'index.html';
}

function isLoggedIn() { return localStorage.getItem(SESSION_KEY) === 'true'; }
function getUserName() { return localStorage.getItem(SESSION_NAME_KEY) || 'User'; }
function getUserRole() { return localStorage.getItem(SESSION_ROLE_KEY) || 'kasir'; }
function isOwner() { return getUserRole() === 'owner'; }

/**
 * Perbarui profil Owner: nama pemilik, nama toko, dan (opsional) password baru.
 * Dipanggil dari form "Kelola Profil Owner" di menu Pengaturan.
 */
async function updateOwnerProfile({ fullName, storeName, newPassword }) {
  if (APP_CONFIG.USE_SUPABASE) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Sesi tidak ditemukan, silakan login ulang.');

    const { error: profErr } = await supabaseClient
      .from('profiles').update({ full_name: fullName, store_name: storeName }).eq('id', user.id);
    if (profErr) throw profErr;

    if (newPassword) {
      const { error: pwErr } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (pwErr) throw pwErr;
    }
  } else {
    const override = JSON.parse(localStorage.getItem(LS_OWNER_OVERRIDE) || '{}');
    override.name = fullName;
    if (newPassword) override.password = newPassword;
    localStorage.setItem(LS_OWNER_OVERRIDE, JSON.stringify(override));
    localStorage.setItem(LS_STORE_NAME, storeName);
  }

  localStorage.setItem(SESSION_NAME_KEY, fullName);
  localStorage.setItem(LS_STORE_NAME, storeName);
}

function requireAuth() {
  if (!isLoggedIn()) window.location.href = 'index.html';
}

/* --- Handler form login (index.html) --- */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  if (isLoggedIn()) { window.location.href = 'dashboard.html'; return; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memeriksa...';

    const result = await attemptLogin(username, password);

    if (result.ok) {
      window.location.href = 'dashboard.html';
    } else {
      errorEl.textContent = result.message;
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
    }
  });
}
