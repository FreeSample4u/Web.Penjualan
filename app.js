/**
 * app.js — Inisialisasi utama dashboard.html: navigasi berbasis role,
 * ringkasan finansial, manajemen produk, dan orkestrasi refresh data.
 */

const ROLE_MENU = {
  owner: ['dashboard', 'produk', 'transaksi', 'pengaturan'],
  kasir: ['transaksi'],
};

function formatCompactRupiah(n) {
  n = n || 0;
  if (n >= 1000000000) return 'Rp ' + (n / 1000000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1).replace('.0', '') + 'jt';
  return formatRupiah(n);
}

/* --- Ringkasan kartu Dashboard (khusus Owner) --- */
function renderSummary(transactions, products) {
  const totalSales = transactions.reduce((s, t) => s + t.total, 0);
  const totalTrx = transactions.length;
  const avgTrx = totalTrx ? Math.round(totalSales / totalTrx) : 0;

  const pendingTrx = transactions.filter((t) => t.status === 'Pending');
  const pendingTotal = pendingTrx.reduce((s, t) => s + t.total, 0);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const netProfit = transactions.filter((t) => t.status === 'Lunas').reduce((sum, t) => {
    const p = productMap.get(t.productId);
    if (!p) return sum;
    return sum + (p.sellPrice - p.buyPrice) * t.qty;
  }, 0);

  const productCount = {};
  transactions.forEach((t) => { productCount[t.product] = (productCount[t.product] || 0) + t.qty; });
  const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('sumTotalSales').textContent = formatCompactRupiah(totalSales);
  document.getElementById('sumTotalTrx').textContent = totalTrx.toLocaleString('id-ID');
  document.getElementById('sumAvgTrx').textContent = formatCompactRupiah(avgTrx);
  document.getElementById('sumTopProduct').textContent = topProduct ? topProduct[0] : '-';
  document.getElementById('sumTopProductQty').textContent = topProduct ? `${topProduct[1]} unit terjual` : '';

  const netProfitEl = document.getElementById('sumNetProfit');
  if (netProfitEl) netProfitEl.textContent = formatCompactRupiah(netProfit);

  const pendingEl = document.getElementById('sumPending');
  if (pendingEl) pendingEl.textContent = formatCompactRupiah(pendingTotal);
  const pendingCountEl = document.getElementById('sumPendingCount');
  if (pendingCountEl) pendingCountEl.textContent = `${pendingTrx.length} transaksi menunggu`;
}

/* --- Grid box persentase kategori (mini-chart ala ERP, mendampingi grafik utama) --- */
function renderCategoryBoxGrid(transactions) {
  const el = document.getElementById('categoryBoxGrid');
  if (!el) return;
  const data = typeof buildCategorySeries === 'function' ? buildCategorySeries(transactions) : [];

  if (!data.length) {
    el.innerHTML = `<div class="empty-state">Belum ada data penjualan.</div>`;
    return;
  }

  el.innerHTML = data.map((d) => `
    <div class="category-box" data-animate-item style="--box-color:${d.color};">
      <div class="cat-name">${d.label}</div>
      <div class="cat-pct">${d.pct}%</div>
      <div class="cat-meta">${formatCompactRupiah(d.value)}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${d.pct}%"></div></div>
    </div>
  `).join('');
}

function renderRecentTable(transactions) {
  const tbody = document.getElementById('recentTableBody');
  if (!tbody) return;
  const recent = transactions.slice(0, 5);
  tbody.innerHTML = recent.map((t) => `
    <tr>
      <td><strong>${t.trxCode}</strong></td>
      <td>${formatDate(t.date)}</td>
      <td>${t.customer}</td>
      <td>${t.product}</td>
      <td>${formatRupiah(t.total)}</td>
      <td><span class="status-pill ${t.status === 'Lunas' ? 'status-lunas' : 'status-pending'}">${t.status}</span></td>
    </tr>
  `).join('');
}

/* --- Laporan Produk: peringkat & manajemen (CRUD, khusus Owner) --- */
function renderProductReport(transactions, products) {
  const salesMap = {};
  transactions.forEach((t) => {
    if (!salesMap[t.product]) salesMap[t.product] = { name: t.product, category: t.category, qty: 0, total: 0 };
    salesMap[t.product].qty += t.qty;
    salesMap[t.product].total += t.total;
  });
  const ranked = Object.values(salesMap).sort((a, b) => b.total - a.total);
  const maxTotal = ranked[0]?.total || 1;

  const el = document.getElementById('productRankList');
  if (el) {
    el.innerHTML = ranked.length ? ranked.map((p, i) => `
      <div class="rank-item" data-animate-item>
        <div class="rank-num">${i + 1}</div>
        <div class="info">
          <div class="name">${p.name}</div>
          <div class="meta">${p.category} • ${p.qty} unit terjual</div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.round((p.total / maxTotal) * 100)}%"></div></div>
        </div>
        <div class="value">${formatCompactRupiah(p.total)}</div>
      </div>
    `).join('') : `<div class="empty-state">Belum ada data penjualan.</div>`;
  }

  document.getElementById('prodTotalItems').textContent = products.length;
  const bestCat = {};
  transactions.forEach((t) => { bestCat[t.category] = (bestCat[t.category] || 0) + t.total; });
  const topCat = Object.entries(bestCat).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('prodTopCategory').textContent = topCat ? topCat[0] : '-';
  const totalUnits = transactions.reduce((s, t) => s + t.qty, 0);
  document.getElementById('prodTotalUnits').textContent = totalUnits.toLocaleString('id-ID');

  renderProductManagementTable(products);
}

function renderProductManagementTable(products) {
  const tbody = document.getElementById('productMgmtBody');
  if (!tbody) return;

  tbody.innerHTML = products.length ? products.map((p) => `
    <tr data-id="${p.id}">
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${formatRupiah(p.buyPrice)}</td>
      <td>${formatRupiah(p.sellPrice)}</td>
      <td>
        ${p.stock}
        ${p.stock <= APP_CONFIG.LOW_STOCK_THRESHOLD ? '<span class="stock-low-badge">Tipis</span>' : ''}
      </td>
      <td class="action-cell">
        <button class="row-action-btn restock" data-action="restock-product" title="Restock / Tambah Stok">📥</button>
        <button class="row-action-btn edit" data-action="edit-product" title="Edit">✏️</button>
        <button class="row-action-btn delete" data-action="delete-product" title="Hapus">🗑️</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6"><div class="empty-state">Belum ada produk. Klik "+ Tambah Produk Baru".</div></td></tr>`;

  tbody.querySelectorAll('button[data-action="restock-product"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const product = products.find((p) => p.id === id);
      if (product && typeof openRestockModal === 'function') openRestockModal(product);
    });
  });
  tbody.querySelectorAll('button[data-action="edit-product"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const product = products.find((p) => p.id === id);
      if (product) openEditProductModal(product);
    });
  });
  tbody.querySelectorAll('button[data-action="delete-product"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      const product = products.find((p) => p.id === id);
      if (!product) return;
      if (confirm(`Hapus produk "${product.name}"? Riwayat transaksi lama tetap tersimpan.`)) {
        await deleteProduct(id);
        showToast(`Produk "${product.name}" dihapus.`, 'success');
        await refreshAllData();
      }
    });
  });
}

/* --- Peringatan stok tipis saat pertama buka aplikasi --- */
function checkLowStockOnLoad(products) {
  const low = products.filter((p) => p.stock <= APP_CONFIG.LOW_STOCK_THRESHOLD);
  if (low.length) {
    const names = low.slice(0, 3).map((p) => p.name).join(', ');
    showToast(`${low.length} produk stoknya tipis: ${names}${low.length > 3 ? ', ...' : ''}`, 'warning', 7000);
  }
}

/* --- Manajemen Akun Kasir (menu Pengaturan, khusus Owner) --- */
function renderKasirAccounts() {
  const list = document.getElementById('kasirAccountList');
  if (!list) return;

  if (APP_CONFIG.USE_SUPABASE) {
    list.innerHTML = `<div class="empty-state" style="text-align:left;padding:14px 4px;">
      Mode Supabase aktif — akun kasir baru dibuat lewat <strong>Supabase Dashboard &gt; Authentication &gt; Add user</strong>,
      lalu dihubungkan ke toko ini lewat tabel <code>profiles</code> (role: <code>kasir</code>, store_id sama dengan toko ini).
      Lihat panduan di <code>supabase-schema.sql</code>.
    </div>`;
    return;
  }

  const accounts = listKasirAccounts();
  list.innerHTML = accounts.length ? accounts.map((u) => `
    <div class="settings-row">
      <div class="txt"><strong>${u.name}</strong><span>Username: ${u.username}</span></div>
      <button class="btn" data-username="${u.username}" style="color:var(--danger);border-color:var(--danger);">Hapus</button>
    </div>
  `).join('') : `<div class="empty-state">Belum ada akun kasir tambahan.</div>`;

  list.querySelectorAll('button[data-username]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeKasirAccount(btn.dataset.username);
      showToast('Akun kasir dihapus.', 'success');
      renderKasirAccounts();
    });
  });
}

function initKasirForm() {
  const form = document.getElementById('kasirForm');
  if (!form) return;

  if (APP_CONFIG.USE_SUPABASE) {
    form.classList.add('hidden'); // form manual dinonaktifkan di mode Supabase (lihat renderKasirAccounts)
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('kasirName').value.trim();
    const username = document.getElementById('kasirUsername').value.trim();
    const password = document.getElementById('kasirPassword').value;
    if (!name || !username || !password) { showToast('Lengkapi semua field.', 'warning'); return; }
    try {
      addKasirAccount(username, password, name);
      showToast(`Akun kasir "${name}" berhasil dibuat.`, 'success');
      form.reset();
      renderKasirAccounts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/* --- Navigasi antar-view --- */
function initNav() {
  const links = document.querySelectorAll('.nav-link, .bottom-nav-link');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
}

function switchView(target) {
  document.querySelectorAll('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === target));
  document.querySelectorAll('.bottom-nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === target));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const viewEl = document.getElementById('view-' + target);
  viewEl?.classList.add('active');

  const activeLink = document.querySelector(`.nav-link[data-view="${target}"]`);
  document.getElementById('pageTitle').textContent = activeLink?.dataset.title || target;

  playFadeIn(viewEl);
  closeSidebarMobile();
}

/* --- Terapkan pembatasan menu sesuai role --- */
function applyRoleRestrictions() {
  const role = getUserRole();
  const allowed = ROLE_MENU[role] || ['transaksi'];

  document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
    if (!allowed.includes(link.dataset.view)) link.classList.add('hidden');
  });
  document.querySelectorAll('.bottom-nav-link[data-view]').forEach((link) => {
    if (!allowed.includes(link.dataset.view)) link.classList.add('hidden');
  });

  // Tombol "+ Tambah Produk" & akses harga beli/profit hanya untuk Owner
  document.querySelectorAll('.owner-only').forEach((el) => {
    el.classList.toggle('hidden', role !== 'owner');
  });

  document.getElementById('roleBadge').textContent = role === 'owner' ? 'Owner' : 'Kasir';
  document.getElementById('roleBadge').className = `role-badge role-${role}`;
  const acctRoleEl = document.getElementById('acctRole');
  if (acctRoleEl) acctRoleEl.textContent = role === 'owner' ? 'Owner / Pemilik' : 'Kasir / Penjaga';

  // Kasir langsung diarahkan ke menu Transaksi (tidak punya Dashboard finansial)
  const defaultView = allowed.includes('dashboard') ? 'dashboard' : allowed[0];
  switchView(defaultView);
}

function openSidebarMobile() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}
function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
function initSidebarToggle() {
  document.getElementById('hamburgerBtn')?.addEventListener('click', openSidebarMobile);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebarMobile);
}

/* --- Pengaturan: tema & logout --- */
function initSettings() {
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.addEventListener('click', () => { applyTheme(btn.dataset.theme); syncThemeButtons(); });
  });
  syncThemeButtons();

  document.getElementById('logoutBtn')?.addEventListener('click', () => { if (confirm('Yakin ingin keluar?')) logoutUser(); });
  document.getElementById('logoutBtnSidebar')?.addEventListener('click', () => { if (confirm('Yakin ingin keluar?')) logoutUser(); });

  initKasirForm();
  initOwnerProfileForm();
}

/* --- Kelola Profil Owner: ubah nama toko/pemilik & password --- */
function initOwnerProfileForm() {
  const form = document.getElementById('ownerProfileForm');
  if (!form) return;

  const nameInput = document.getElementById('ownerProfileName');
  if (nameInput && typeof getOwnerProfile === 'function') {
    nameInput.value = getOwnerProfile().name;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = nameInput.value.trim();
    const newPassword = document.getElementById('ownerProfilePassword').value;
    const confirmPassword = document.getElementById('ownerProfilePasswordConfirm').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!newName) { showToast('Nama toko/pemilik tidak boleh kosong.', 'warning'); return; }
    if (newPassword && newPassword.length < 6) { showToast('Password baru minimal 6 karakter.', 'warning'); return; }
    if (newPassword && newPassword !== confirmPassword) { showToast('Konfirmasi password tidak cocok.', 'warning'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
      await updateOwnerProfile(newName, newPassword || null);
      showToast('Profil Owner berhasil diperbarui.', 'success');
      document.getElementById('ownerProfilePassword').value = '';
      document.getElementById('ownerProfilePasswordConfirm').value = '';

      // Sinkronkan tampilan nama di sidebar/topbar jika sedang login sebagai Owner
      const uName = getUserName();
      document.getElementById('userNameLabel').textContent = uName;
      document.getElementById('userInitial').textContent = uName.charAt(0).toUpperCase();
      document.getElementById('userInitial2').textContent = uName.charAt(0).toUpperCase();
      const acctNameEl = document.getElementById('acctName');
      if (acctNameEl) acctNameEl.textContent = uName;
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui profil.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan Perubahan Profil';
    }
  });
}
function syncThemeButtons() {
  const current = document.documentElement.getAttribute('data-theme');
  document.querySelectorAll('.theme-option').forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === current));
}

/* --- Refresh terpusat: dipanggil ulang setiap kali ada perubahan data --- */
async function refreshAllData() {
  const [transactions, products] = await Promise.all([getTransactions(), getProducts()]);
  window.__lastTransactions = transactions;
  window.__lastProducts = products;

  renderSummary(transactions, products);
  renderCharts(transactions);
  renderCategoryBoxGrid(transactions);
  renderRecentTable(transactions);
  renderProductReport(transactions, products);
  initTable(transactions);
}

/* --- Init --- */
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  initTheme();
  initPageEntryAnimation();
  initSidebarToggle();
  initNav();
  initSettings();
  initExportButtons();
  initModals();

  const uName = getUserName();
  document.getElementById('userNameLabel').textContent = uName;
  document.getElementById('userInitial').textContent = uName.charAt(0).toUpperCase();
  document.getElementById('userInitial2').textContent = uName.charAt(0).toUpperCase();
  const acctNameEl = document.getElementById('acctName');
  if (acctNameEl) acctNameEl.textContent = uName;

  applyRoleRestrictions();
  renderKasirAccounts();

  await refreshAllData();
  checkLowStockOnLoad(window.__lastProducts);

  // Animasi fade-in halaman pertama kali dibuka
  playFadeIn(document.querySelector('.view.active'));
});
