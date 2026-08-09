/**
 * animate.js — Animasi transisi fade-in halus saat website pertama dibuka
 * atau saat berpindah antar menu.
 */
function playFadeIn(container) {
  if (!container) return;
  // Reset animasi (trik reflow) supaya bisa dimainkan ulang tiap kali dipanggil
  container.classList.remove('fade-in-run');
  // eslint-disable-next-line no-unused-expressions
  container.offsetHeight;
  container.classList.add('fade-in-run');

  // Stagger kecil untuk kartu-kartu di dalamnya agar terasa halus & bertahap
  const staggerItems = container.querySelectorAll('[data-animate-item]');
  staggerItems.forEach((el, i) => {
    el.style.animationDelay = `${Math.min(i * 45, 300)}ms`;
    el.classList.remove('fade-in-item');
    void el.offsetHeight;
    el.classList.add('fade-in-item');
  });
}

function initPageEntryAnimation() {
  document.body.classList.add('page-fade-in');
}
