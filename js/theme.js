/**
 * theme.js — toggle tema terang / gelap, disimpan di localStorage
 */
const THEME_KEY = 'sd_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  document.querySelectorAll('.theme-toggle-icon').forEach((el) => {
    el.textContent = theme === 'dark' ? '☀️' : '🌙';
  });

  // Beritahu modul chart.js untuk menggambar ulang dengan warna baru
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
}
