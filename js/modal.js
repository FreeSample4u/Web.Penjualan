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
      const { newStock } = await addTransaction({
        trxCode, date, time: new Date().toTimeString().slice(0, 5), customer, productId, qty,
        total: product.sellPrice * qty, paymentMethod, status, createdByName: getUserName(),
      });
      showToast(`Transaksi ${trxCode} berhasil disimpan.`, 'success');
      if (newStock <= APP_CONFIG.LOW_STOCK_THRESHOLD) {
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

function initModals() {
  initModalDismiss();

  document.getElementById('btnAddTransaction')?.addEventListener('click', openAddTransactionModal);
  document.getElementById('btnAddProduct')?.addEventListener('click', openAddProductModal);

  document.getElementById('trxForm')?.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('restockForm')?.addEventListener('submit', handleRestockSubmit);

  document.getElementById('trxProduct')?.addEventListener('change', updateTrxPreview);
  document.getElementById('trxQty')?.addEventListener('input', updateTrxPreview);
  document.getElementById('restockQty')?.addEventListener('input', updateRestockPreview);

  initReceiptButtons();
}

/* =========================================================================
   MODAL: QUICK RESTOCK (Tambah Stok)
   ========================================================================= */
let restockingProduct = null;

function openRestockModal(product) {
  restockingProduct = product;
  document.getElementById('restockForm').reset();
  document.getElementById('restockProductName').textContent = product.name;
  document.getElementById('restockCurrentStock').textContent = product.stock;
  updateRestockPreview();
  openModal('modalRestock');
}

function updateRestockPreview() {
  if (!restockingProduct) return;
  const qtyIn = parseInt(document.getElementById('restockQty').value, 10) || 0;
  document.getElementById('restockNewStock').textContent = restockingProduct.stock + qtyIn;
}

async function handleRestockSubmit(e) {
  e.preventDefault();
  if (!restockingProduct) return;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const qtyIn = parseInt(document.getElementById('restockQty').value, 10);

  if (!qtyIn || qtyIn < 1) { showToast('Masukkan jumlah barang masuk yang valid.', 'warning'); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';
  try {
    const { newStock } = await restockProduct(restockingProduct.id, qtyIn);
    showToast(`Stok "${restockingProduct.name}" berhasil ditambah menjadi ${newStock}.`, 'success');
    closeModal('modalRestock');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Gagal menambah stok.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Stok Masuk';
  }
}

/* =========================================================================
   MODAL: DETAIL TRANSAKSI (Owner, dibuka lewat double-click baris tabel)
   ========================================================================= */
let currentDetailTrx = null;
let currentDetailProduct = null;

async function openTrxDetailModal(trx) {
  currentDetailTrx = trx;
  const products = await getProducts();
  const product = products.find((p) => p.id === trx.productId) || null;
  currentDetailProduct = product;

  const hpp = product ? product.buyPrice * trx.qty : null;
  const profit = product ? trx.total - hpp : null;

  document.getElementById('trxDetailTitle').textContent = `Detail Transaksi — ${trx.trxCode}`;
  document.getElementById('trxDetailBody').innerHTML = `
    <div class="detail-row"><span>Tanggal & Jam</span><strong>${formatDate(trx.date)}, ${trx.time || '-'} WIB</strong></div>
    <div class="detail-row"><span>Dicatat oleh (Kasir)</span><strong>${trx.createdByName || '-'}</strong></div>
    <div class="detail-row"><span>Nama Pelanggan</span><strong>${trx.customer}</strong></div>
    <div class="detail-row"><span>Produk</span><strong>${trx.product}</strong></div>
    <div class="detail-row"><span>Jumlah Unit</span><strong>${trx.qty}</strong></div>
    <div class="detail-row"><span>Metode Pembayaran</span><strong>${trx.paymentMethod || '-'}</strong></div>
    <div class="detail-row"><span>Status</span><strong><span class="status-pill ${trx.status === 'Lunas' ? 'status-lunas' : 'status-pending'}">${trx.status}</span></strong></div>
    <div class="detail-divider"></div>
    <div class="detail-row"><span>Total Penjualan</span><strong>${formatRupiah(trx.total)}</strong></div>
    ${product ? `
    <div class="detail-row"><span>Modal (HPP)</span><strong>${formatRupiah(hpp)}</strong></div>
    <div class="detail-row detail-highlight"><span>Keuntungan Transaksi Ini</span><strong>${formatRupiah(profit)}</strong></div>
    ` : `<div class="detail-row"><span colspan="2" style="color:var(--text-faint);font-size:12px;">Produk sudah dihapus — data HPP tidak tersedia.</span></div>`}
  `;
  openModal('modalTrxDetail');
}

function initReceiptButtons() {
  document.getElementById('btnPrintReceipt')?.addEventListener('click', () => {
    if (currentDetailTrx) printReceipt(currentDetailTrx, currentDetailProduct);
  });
  document.getElementById('btnDownloadReceipt')?.addEventListener('click', () => {
    if (currentDetailTrx) downloadReceiptPDF(currentDetailTrx, currentDetailProduct);
  });
}
