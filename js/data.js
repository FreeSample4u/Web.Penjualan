/**
 * data.js — Data layer terpadu.
 * Semua bagian aplikasi lain (app.js, table.js, modal.js, charts.js) HANYA
 * boleh memanggil fungsi-fungsi di file ini, tidak pernah mengakses
 * localStorage atau Supabase secara langsung. Dengan begitu, mode demo dan
 * mode Supabase bisa berjalan dengan API yang identik.
 * -----------------------------------------------------------------------
 */

const LS_PRODUCTS = 'sd_demo_products';
const LS_TRANSACTIONS = 'sd_demo_transactions';

/* ---------------------------------------------------------------------
   SEED DATA DEMO (dipakai hanya saat USE_SUPABASE = false dan localStorage
   masih kosong / pertama kali dibuka)
--------------------------------------------------------------------- */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260807);
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

const SEED_PRODUCTS = [
  { name: 'Kemeja Flanel Pria', category: 'Fashion Pria', buyPrice: 110000, sellPrice: 175000, stock: 40 },
  { name: 'Dress Wanita Casual', category: 'Fashion Wanita', buyPrice: 140000, sellPrice: 220000, stock: 25 },
  { name: 'Sepatu Sneakers', category: 'Sepatu', buyPrice: 230000, sellPrice: 350000, stock: 18 },
  { name: 'Tas Ransel Kanvas', category: 'Aksesoris', buyPrice: 170000, sellPrice: 265000, stock: 30 },
  { name: 'Jam Tangan Digital', category: 'Aksesoris', buyPrice: 260000, sellPrice: 410000, stock: 15 },
  { name: 'Headset Bluetooth', category: 'Elektronik', buyPrice: 180000, sellPrice: 285000, stock: 22 },
  { name: 'Powerbank 10000mAh', category: 'Elektronik', buyPrice: 120000, sellPrice: 195000, stock: 8 },
  { name: 'Kaos Polos Premium', category: 'Fashion Pria', buyPrice: 55000, sellPrice: 95000, stock: 60 },
  { name: 'Rok Plisket', category: 'Fashion Wanita', buyPrice: 95000, sellPrice: 150000, stock: 20 },
  { name: 'Sandal Slip-On', category: 'Sepatu', buyPrice: 70000, sellPrice: 120000, stock: 5 },
];

const CUSTOMERS = [
  'Andi Saputra', 'Budi Santoso', 'Citra Dewi', 'Dian Permata', 'Eka Wijaya',
  'Fajar Nugroho', 'Gita Lestari', 'Hendra Kusuma', 'Indah Sari', 'Joko Prasetyo',
];
const PAYMENT_METHODS = ['Tunai', 'Transfer Bank', 'QRIS', 'Kartu Debit/Kredit'];
const STATUSES = ['Lunas', 'Lunas', 'Lunas', 'Pending'];
const SEED_STAFF_NAMES = ['Owner Toko', 'Kasir 1'];

function pad2(n) { return String(n).padStart(2, '0'); }

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (rand() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function seedDemoData() {
  const products = SEED_PRODUCTS.map((p) => ({ id: uid(), ...p }));
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(products));

  const now = new Date('2026-08-07');
  const startWindow = new Date('2026-02-01');
  const transactions = [];
  for (let i = 0; i < 65; i++) {
    const product = pick(products);
    const qty = 1 + Math.floor(rand() * 4);
    const date = new Date(startWindow.getTime() + rand() * (now.getTime() - startWindow.getTime()));
    transactions.push({
      id: uid(),
      trxCode: `TRX-${String(1000 + i)}`,
      date: date.toISOString().slice(0, 10),
      time: `${pad2(8 + Math.floor(rand() * 11))}:${pad2(Math.floor(rand() * 60))}`,
      customer: pick(CUSTOMERS),
      productId: product.id,
      product: product.name,
      category: product.category,
      qty,
      total: product.sellPrice * qty,
      paymentMethod: pick(PAYMENT_METHODS),
      status: pick(STATUSES),
      createdByName: pick(SEED_STAFF_NAMES),
    });
  }
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
}

function loadDemoProducts() {
  if (!localStorage.getItem(LS_PRODUCTS)) seedDemoData();
  return JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
}
function saveDemoProducts(list) { localStorage.setItem(LS_PRODUCTS, JSON.stringify(list)); }

function loadDemoTransactions() {
  if (!localStorage.getItem(LS_TRANSACTIONS)) seedDemoData();
  return JSON.parse(localStorage.getItem(LS_TRANSACTIONS) || '[]');
}
function saveDemoTransactions(list) { localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(list)); }

/* =========================================================================
   API PUBLIK — dipanggil dari seluruh aplikasi
   ========================================================================= */

/** Ambil semua produk. */
async function getProducts() {
  if (APP_CONFIG.USE_SUPABASE) {
    const { data, error } = await supabaseClient.from('products').select('*').order('name');
    if (error) { console.error(error); showToast('Gagal memuat produk dari Supabase', 'error'); return []; }
    return data.map((p) => ({ id: p.id, name: p.name, category: p.category, buyPrice: p.buy_price, sellPrice: p.sell_price, stock: p.stock }));
  }
  return loadDemoProducts();
}

/** Tambah produk baru. */
async function addProduct(product) {
  if (APP_CONFIG.USE_SUPABASE) {
    const { error } = await supabaseClient.from('products').insert({
      name: product.name, category: product.category, buy_price: product.buyPrice, sell_price: product.sellPrice, stock: product.stock,
    });
    if (error) { console.error(error); throw error; }
    return;
  }
  const list = loadDemoProducts();
  list.push({ id: uid(), ...product });
  saveDemoProducts(list);
}

/** Perbarui sebagian data produk (patch), termasuk untuk pengurangan stok otomatis. */
async function updateProduct(id, patch) {
  if (APP_CONFIG.USE_SUPABASE) {
    const dbPatch = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.buyPrice !== undefined) dbPatch.buy_price = patch.buyPrice;
    if (patch.sellPrice !== undefined) dbPatch.sell_price = patch.sellPrice;
    if (patch.stock !== undefined) dbPatch.stock = patch.stock;
    const { error } = await supabaseClient.from('products').update(dbPatch).eq('id', id);
    if (error) { console.error(error); throw error; }
    return;
  }
  const list = loadDemoProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx > -1) { list[idx] = { ...list[idx], ...patch }; saveDemoProducts(list); }
}

/** Hapus produk. */
async function deleteProduct(id) {
  if (APP_CONFIG.USE_SUPABASE) {
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) { console.error(error); throw error; }
    return;
  }
  saveDemoProducts(loadDemoProducts().filter((p) => p.id !== id));
}

/** Ambil semua transaksi (terbaru dahulu). */
async function getTransactions() {
  if (APP_CONFIG.USE_SUPABASE) {
    const { data, error } = await supabaseClient.from('transactions').select('*').order('trx_date', { ascending: false });
    if (error) { console.error(error); showToast('Gagal memuat transaksi dari Supabase', 'error'); return []; }
    return data.map((t) => ({
      id: t.id, trxCode: t.trx_code, date: t.trx_date, time: t.trx_time, customer: t.customer, productId: t.product_id,
      product: t.product_name, category: t.category, qty: t.qty, total: t.total,
      paymentMethod: t.payment_method, status: t.status, createdByName: t.created_by_name,
    }));
  }
  return loadDemoTransactions();
}

/**
 * Tambah transaksi baru DAN otomatis mengurangi stok produk terkait.
 * Melempar error jika stok tidak mencukupi.
 */
async function addTransaction(trx) {
  const products = await getProducts();
  const product = products.find((p) => p.id === trx.productId);
  if (!product) throw new Error('Produk tidak ditemukan.');
  if (product.stock < trx.qty) throw new Error(`Stok tidak cukup. Sisa stok "${product.name}": ${product.stock}.`);

  const newStock = product.stock - trx.qty;

  if (APP_CONFIG.USE_SUPABASE) {
    const { error: trxError } = await supabaseClient.from('transactions').insert({
      trx_code: trx.trxCode, trx_date: trx.date, trx_time: trx.time, customer: trx.customer, product_id: trx.productId,
      product_name: product.name, category: product.category, qty: trx.qty, total: trx.total,
      payment_method: trx.paymentMethod, status: trx.status, created_by_name: trx.createdByName,
    });
    if (trxError) { console.error(trxError); throw trxError; }
  } else {
    const list = loadDemoTransactions();
    list.unshift({ id: uid(), ...trx, product: product.name, category: product.category });
    saveDemoTransactions(list);
  }

  // Kurangi stok otomatis (berlaku untuk kedua mode lewat updateProduct)
  await updateProduct(trx.productId, { stock: newStock });

  return { newStock, product };
}

/** Perbarui transaksi (dipakai fitur edit, khusus Owner). */
async function updateTransaction(id, patch) {
  if (APP_CONFIG.USE_SUPABASE) {
    const dbPatch = {};
    if (patch.customer !== undefined) dbPatch.customer = patch.customer;
    if (patch.qty !== undefined) dbPatch.qty = patch.qty;
    if (patch.total !== undefined) dbPatch.total = patch.total;
    if (patch.paymentMethod !== undefined) dbPatch.payment_method = patch.paymentMethod;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    const { error } = await supabaseClient.from('transactions').update(dbPatch).eq('id', id);
    if (error) { console.error(error); throw error; }
    return;
  }
  const list = loadDemoTransactions();
  const idx = list.findIndex((t) => t.id === id);
  if (idx > -1) { list[idx] = { ...list[idx], ...patch }; saveDemoTransactions(list); }
}

/** Hapus transaksi (khusus Owner). */
async function deleteTransaction(id) {
  if (APP_CONFIG.USE_SUPABASE) {
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) { console.error(error); throw error; }
    return;
  }
  saveDemoTransactions(loadDemoTransactions().filter((t) => t.id !== id));
}

/** Generator kode transaksi baru yang unik & mudah dibaca, mis. TRX-1042. */
async function generateTrxCode() {
  const list = await getTransactions();
  const nums = list.map((t) => parseInt((t.trxCode || '').replace('TRX-', ''), 10)).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `TRX-${next}`;
}

/**
 * Restock — tambah stok produk yang sudah ada (stok lama + jumlah masuk).
 * Dipakai oleh modal "Restock / Tambah Stok" di halaman Laporan Produk.
 */
async function restockProduct(productId, qtyIn) {
  const products = await getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) throw new Error('Produk tidak ditemukan.');
  const newStock = product.stock + qtyIn;
  await updateProduct(productId, { stock: newStock });
  return { product, newStock };
}
