/**
 * modal.js — Form pop-up: Tambah/Edit Transaksi & Tambah/Edit Produk.
 * Mengurus validasi, pengurangan stok otomatis, dan notifikasi toast.
 */

/* ---------- Util modal umum ---------- */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.classList.add('modal-open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.classList.remove('modal-open');
}
function initModalDismiss() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach((m) => closeModal(m.id));
    }
  });
}

/* =========================================================================
   MODAL: TAMBAH / EDIT TRANSAKSI
   ========================================================================= */
let editingTrxId = null;
let cachedProducts = [];

async function populateProductSelect() {
  cachedProducts = await getProducts();
  const select = document.getElementById('trxProduct');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih produk --</option>' + cachedProducts.map((p) => `
    <option value="${p.id}" data-price="${p.sellPrice}" data-stock="${p.stock}">
      ${p.name} (stok: ${p.stock}) — ${formatRupiah(p.sellPrice)}
    </option>
  `).join('');
  updateTrxPreview();
}

function updateTrxPreview() {
  const select = document.getElementById('trxProduct');
  const qtyInput = document.getElementById('trxQty');
  const preview = document.getElementById('trxTotalPreview');
  const opt = select?.selectedOptions[0];
  if (!opt || !opt.value) { preview.textContent = 'Rp 0'; qtyInput.max = ''; return; }

  const price = parseInt(opt.dataset.price, 10);
  const stock = parseInt(opt.dataset.stock, 10);
  qtyInput.max = stock;
  const qty = Math.max(1, Math.min(parseInt(qtyInput.value || '1', 10), stock || 1));
  preview.textContent = formatRupiah(price * qty);

  const stockWarn = document.getElementById('trxStockWarn');
  if (stockWarn) {
    stockWarn.textContent = stock <= APP_CONFIG.LOW_STOCK_THRESHOLD ? `⚠️ Stok tersisa tinggal ${stock}` : '';
  }
}

function openAddTransactionModal() {
  editingTrxId = null;
  document.getElementById('trxModalTitle').textContent = 'Tambah Transaksi Baru';
  document.getElementById('trxForm').reset();
  document.getElementById('trxProduct').disabled = false;
  document.getElementById('trxDate').value = new Date().toISOString().slice(0, 10);
  populateProductSelect();
  openModal('modalTransaksi');
}

async function openEditTransactionModal(trx) {
  editingTrxId = trx.id;
  document.getElementById('trxModalTitle').textContent = `Edit Transaksi — ${trx.trxCode}`;
  await populateProductSelect();
  document.getElementById('trxProduct').value = trx.productId || '';
  document.getElementById('trxProduct').disabled = true; // ganti produk = hindari kompleksitas ulang-stok
  document.getElementById('trxQty').value = trx.qty;
  document.getElementById('trxCustomer').value = trx.customer;
  document.getElementById('trxPayment').value = trx.paymentMethod || 'Tunai';
  document.getElementById('trxStatus').value = trx.status;
  document.getElementById('trxDate').value = trx.date;
  updateTrxPreview();
  openModal('modalTransaksi');
}

async function handleTransactionSubmit(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const productId = document.getElementById('trxProduct').value;
  const qty = parseInt(document.getElementById('trxQty').value, 10);
  const customer = document.getElementById('trxCustomer').value.trim();
  const paymentMethod = document.getElementById('trxPayment').value;
  const status = document.getElementById('trxStatus').value;
  const date = document.getElementById('trxDate').value;

  if (!productId || !qty || qty < 1 || !customer || !date) {
    showToast('Lengkapi semua field dengan benar.', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';

  try {
    if (editingTrxId) {
      const product = cachedProducts.find((p) => p.id === productId);
      await updateTransaction(editingTrxId, {
        customer, qty, total: (product?.sellPrice || 0) * qty, paymentMethod, status,
      });
      showToast('Transaksi berhasil diperbarui.', 'success');
    } else {
      const product = cachedProducts.find((p) => p.id === productId);
      const trxCode = await generateTrxCode();
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { newStock } = await addTransaction({
        trxCode, date, time, customer, productId, qty, total: product.sellPrice * qty, paymentMethod, status,
        cashierName: getUserName(),
      });
      showToast(`Transaksi ${trxCode} berhasil disimpan.`, 'success');
      if (newStock !== null && newStock <= APP_CONFIG.LOW_STOCK_THRESHOLD) {
        showToast(`Stok "${product.name}" tinggal ${newStock} — segera restock!`, 'warning', 6000);
      }
    }
    closeModal('modalTransaksi');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan transaksi.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Transaksi';
  }
}

/* =========================================================================
   MODAL: TAMBAH / EDIT PRODUK
   ========================================================================= */
let editingProductId = null;

function openAddProductModal() {
  editingProductId = null;
  document.getElementById('prodModalTitle').textContent = 'Tambah Produk Baru';
  document.getElementById('productForm').reset();
  openModal('modalProduk');
}

function openEditProductModal(product) {
  editingProductId = product.id;
  document.getElementById('prodModalTitle').textContent = `Edit Produk — ${product.name}`;
  document.getElementById('prodName').value = product.name;
  document.getElementById('prodCategory').value = product.category;
  document.getElementById('prodBuyPrice').value = product.buyPrice;
  document.getElementById('prodSellPrice').value = product.sellPrice;
  document.getElementById('prodStock').value = product.stock;
  openModal('modalProduk');
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value.trim();
  const buyPrice = parseFloat(document.getElementById('prodBuyPrice').value);
  const sellPrice = parseFloat(document.getElementById('prodSellPrice').value);
  const stock = parseInt(document.getElementById('prodStock').value, 10);

  if (!name || !category || isNaN(buyPrice) || isNaN(sellPrice) || isNaN(stock)) {
    showToast('Lengkapi semua field dengan benar.', 'warning');
    return;
  }
  if (sellPrice < buyPrice) {
    showToast('Harga jual sebaiknya lebih tinggi dari harga beli.', 'warning');
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';

  try {
    if (editingProductId) {
      await updateProduct(editingProductId, { name, category, buyPrice, sellPrice, stock });
      showToast('Produk berhasil diperbarui.', 'success');
    } else {
      await addProduct({ name, category, buyPrice, sellPrice, stock });
      showToast('Produk baru berhasil ditambahkan.', 'success');
    }
    closeModal('modalProduk');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan produk.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Produk';
  }
}

/* =========================================================================
   MODAL: RESTOCK / TAMBAH STOK (Laporan Produk, khusus Owner)
   ========================================================================= */
let restockingProductId = null;

function openRestockModal(product) {
  restockingProductId = product.id;
  document.getElementById('restockProductName').textContent = product.name;
  document.getElementById('restockProductCategory').textContent = product.category;
  document.getElementById('restockCurrentStock').textContent = product.stock;
  document.getElementById('restockQty').value = '';
  document.getElementById('restockNewTotal').textContent = product.stock;
  openModal('modalRestock');
}

function updateRestockPreview() {
  const current = parseInt(document.getElementById('restockCurrentStock').textContent, 10) || 0;
  const added = parseInt(document.getElementById('restockQty').value, 10) || 0;
  document.getElementById('restockNewTotal').textContent = current + added;
}

async function handleRestockSubmit(e) {
  e.preventDefault();
  if (!restockingProductId) return;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const addedQty = parseInt(document.getElementById('restockQty').value, 10);

  if (!addedQty || addedQty < 1) {
    showToast('Masukkan jumlah barang masuk yang valid.', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';

  try {
    const { oldStock, newStock, product } = await restockProduct(restockingProductId, addedQty);
    showToast(`Stok "${product.name}" berhasil ditambah: ${oldStock} + ${addedQty} = ${newStock}.`, 'success');
    closeModal('modalRestock');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Gagal menambah stok.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Restock';
  }
}

/* =========================================================================
   MODAL: DETAIL TRANSAKSI (khusus Owner — dipicu dobel-klik baris tabel)
   ========================================================================= */
let currentDetailTrx = null;

function openTrxDetailModal(trx) {
  currentDetailTrx = trx;
  document.getElementById('trxDetailTitle').textContent = `Detail Transaksi — ${trx.trxCode}`;

  const rows = [
    ['ID Transaksi', trx.trxCode],
    ['Tanggal', formatDate(trx.date)],
    ['Waktu', trx.time || '--:--'],
    ['Nama Pelanggan', trx.customer],
    ['Produk', trx.product],
    ['Kategori', trx.category || '-'],
    ['Jumlah Unit', `${trx.qty} unit`],
    ['Metode Pembayaran', trx.paymentMethod || '-'],
    ['Status', trx.status],
  ];

  const listEl = document.getElementById('trxDetailList');
  listEl.innerHTML = `
    <div class="trx-detail-highlight">🧑‍💼 Dicatat oleh: ${trx.cashierName || 'Tidak diketahui'}</div>
    ${rows.map(([k, v]) => `
      <div class="trx-detail-row"><span class="k">${k}</span><span class="v">${v}</span></div>
    `).join('')}
    <div class="trx-detail-row">
      <span class="k">Total Harga</span>
      <span class="v total">${formatRupiah(trx.total)}</span>
    </div>
  `;

  openModal('modalTrxDetail');
}

/** Cetak struk/nota digital untuk transaksi yang sedang ditampilkan di modal detail. */
function printCurrentReceipt() {
  if (!currentDetailTrx) return;
  const t = currentDetailTrx;
  const storeName = getOwnerProfile().name || 'SalesBoard';

  document.getElementById('receiptPrintArea').innerHTML = `
    <div class="receipt-box">
      <div class="r-header">
        <div class="store">${storeName}</div>
        <div class="tagline">Struk / Nota Penjualan</div>
      </div>
      <div class="r-row"><span>No. Transaksi</span><span>${t.trxCode}</span></div>
      <div class="r-row"><span>Tanggal</span><span>${formatDate(t.date)}</span></div>
      <div class="r-row"><span>Waktu</span><span>${t.time || '--:--'}</span></div>
      <div class="r-row"><span>Kasir</span><span>${t.cashierName || '-'}</span></div>
      <div class="r-row"><span>Pelanggan</span><span>${t.customer}</span></div>
      <div class="r-divider"></div>
      <div class="r-row"><span>${t.product}</span><span></span></div>
      <div class="r-row"><span>${t.qty} x ${formatRupiah(t.total / t.qty)}</span><span>${formatRupiah(t.total)}</span></div>
      <div class="r-divider"></div>
      <div class="r-total"><span>TOTAL</span><span>${formatRupiah(t.total)}</span></div>
      <div class="r-row" style="margin-top:6px;"><span>Metode Bayar</span><span>${t.paymentMethod || '-'}</span></div>
      <div class="r-row"><span>Status</span><span>${t.status}</span></div>
      <div class="r-footer">Terima kasih atas pembelian Anda 🙏<br/>Dicetak lewat SalesBoard</div>
    </div>
  `;

  window.print();
}

function initModals() {
  initModalDismiss();

  document.getElementById('btnAddTransaction')?.addEventListener('click', openAddTransactionModal);
  document.getElementById('btnAddProduct')?.addEventListener('click', openAddProductModal);

  document.getElementById('trxForm')?.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);

  document.getElementById('trxProduct')?.addEventListener('change', updateTrxPreview);
  document.getElementById('trxQty')?.addEventListener('input', updateTrxPreview);

  document.getElementById('restockForm')?.addEventListener('submit', handleRestockSubmit);
  document.getElementById('restockQty')?.addEventListener('input', updateRestockPreview);

  document.getElementById('printReceiptBtn')?.addEventListener('click', printCurrentReceipt);
}
