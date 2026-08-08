# SalesBoard — Dashboard Laporan Penjualan (Enterprise Edition)

Vanilla HTML/CSS/JS — tanpa build tool, tinggal buka `index.html`.

## 🆕 Fitur Baru di Versi Ini

1. **Animasi transisi fade-in** — halus saat halaman pertama dibuka & saat pindah menu (`js/animate.js`).
2. **Multi-role auth** — Owner (akses penuh) vs Kasir (hanya Transaksi).
3. **Form modal (pop-up)** — Tambah Transaksi & Tambah Produk, tanpa reload halaman.
4. **Siap disambungkan ke Supabase** — struktur database + kode CRUD sudah disediakan.
5. **Manajemen stok otomatis** — stok berkurang otomatis setiap transaksi baru.
6. **Notifikasi toast** — konfirmasi simpan & peringatan stok tipis.
7. **Manajemen Akun Kasir** — Owner bisa membuat akun kasir baru dari menu Pengaturan.
8. **Mobile-friendly penuh** — bottom navigation bar di HP, tabel scroll horizontal, modal responsif.
9. **Kolom Waktu & detail transaksi** — double-click baris (Owner) untuk lihat siapa kasir yang mencatat.
10. **Quick Restock** — tambah stok produk lama tanpa mengetik ulang data produk.
11. **Kelola Profil Owner** — ganti nama toko, nama pemilik, dan password dari menu Pengaturan.
12. **Cetak Struk / Nota Digital** — cetak (siap thermal printer) atau unduh sebagai PDF dari detail transaksi.
13. **Laporan Laba Rugi** — kartu Modal Produk (HPP) dan Keuntungan Bersih di Dashboard Owner.

## 📱 Navigasi di Mobile (≤768px)

Sidebar digantikan penuh oleh **bottom navigation bar** (Dashboard, Produk, tombol
`+` mengambang untuk tambah transaksi cepat, Transaksi, Pengaturan) — otomatis
menyesuaikan menu sesuai role, sama seperti sidebar di desktop. Semua tabel
tetap bisa di-scroll horizontal tanpa merusak layout, dan seluruh modal form
otomatis melebar penuh agar nyaman diisi di layar kecil.

## 🧾 Detail Transaksi, Waktu, & Cetak Struk

- Tabel Transaksi kini punya kolom **Waktu** (jam:menit WIB) di samping tanggal.
- **Double-click** pada baris transaksi (khusus Owner) membuka modal detail
  lengkap: siapa kasir yang mencatat, HPP, dan keuntungan transaksi tersebut.
- Dari modal detail, tombol **"🖨️ Cetak Struk"** membuka jendela cetak berformat
  struk kasir (siap untuk printer thermal 58/80mm), dan **"📄 Unduh PDF"**
  menyimpan struk yang sama sebagai file PDF (`js/receipt.js`).

## 📦 Quick Restock

Di halaman Laporan Produk, setiap baris di tabel "Manajemen Produk" punya
tombol 📥 **Restock**. Owner tinggal memasukkan jumlah barang yang baru masuk —
sistem otomatis menjumlahkannya dengan stok lama (`restockProduct()` di
`js/data.js`), lengkap dengan preview "Stok Lama → Stok Baru" sebelum disimpan.

## 👤 Kelola Profil Owner

Menu Pengaturan kini punya form untuk mengubah **Nama Toko** dan **Nama
Pemilik**, serta mengganti password akun Owner (opsional). Nama toko yang
disimpan otomatis dipakai sebagai kop nama pada struk yang dicetak/diunduh.

## 💰 Laporan Laba Rugi Sederhana

Dashboard Owner menampilkan 2 kartu tambahan:
- **Modal Produk (HPP)** — total harga pokok penjualan dari transaksi berstatus Lunas.
- **Keuntungan Bersih** — Total Penjualan (Lunas) dikurangi HPP.

## 📁 Struktur Proyek

```
sales-dashboard/
├── index.html               # Login (Owner / Kasir)
├── dashboard.html            # Aplikasi utama (4 view + 2 modal)
├── supabase-schema.sql        # Skema SQL siap-pakai untuk Supabase
├── css/style.css               # Semua styling, tema, animasi, modal, toast
└── js/
    ├── config.js                 # ⚙️ Flag USE_SUPABASE + kredensial
    ├── supabase-client.js          # Inisialisasi klien Supabase
    ├── data.js                      # Data layer terpadu (CRUD produk & transaksi)
    ├── auth.js                       # Login & role (Owner/Kasir)
    ├── theme.js                       # Toggle tema
    ├── toast.js                        # Notifikasi toast
    ├── animate.js                       # Animasi fade-in
    ├── charts.js                         # Line & pie chart
    ├── table.js                           # Tabel transaksi + Edit/Hapus (Owner)
    ├── export.js                           # Ekspor PDF & Excel
    ├── modal.js                             # Logika form pop-up
    └── app.js                                # Orkestrasi utama & role-based nav
```

## ▶️ Cara Menjalankan (Mode Demo — Tanpa Setup)

Cukup buka `index.html` di browser. Semua data (produk, transaksi, akun kasir
tambahan) tersimpan otomatis di **localStorage** browser kamu.

**Akun demo:**
| Role  | Username | Password  | Akses |
|-------|----------|-----------|-------|
| Owner | `owner`  | `owner123`| Dashboard, Laporan Produk, Transaksi, Pengaturan |
| Kasir | `kasir`  | `kasir123`| Hanya Transaksi (Input & Daftar) |

Owner bisa membuat akun kasir tambahan dari menu **Pengaturan > Manajemen Akun Kasir**.

> ⚠️ Catatan: pembatasan menu untuk Kasir di mode demo ini bersifat **UI-level**
> (menu disembunyikan di tampilan). Untuk keamanan yang sesungguhnya
> (mencegah akses lewat cara lain, bukan cuma disembunyikan), gunakan mode
> Supabase di bawah — di sana pembatasan ditegakkan di level database lewat
> **Row Level Security (RLS)**, bukan cuma disembunyikan di tampilan.

## 🔌 Menyambungkan ke Supabase (Database Sungguhan, Gratis)

Supabase dipilih karena gratis, berbasis PostgreSQL, dan punya Auth + RLS bawaan
yang pas untuk kebutuhan role Owner/Kasir.

### Langkah Setup

1. **Buat project** di [supabase.com](https://supabase.com) (gratis, tanpa kartu kredit).
2. **Jalankan skema** — buka *SQL Editor* di dashboard Supabase, salin-tempel
   seluruh isi file `supabase-schema.sql` dari proyek ini, lalu klik *Run*.
   Ini akan membuat tabel `profiles`, `products`, `transactions`, mengaktifkan
   Row Level Security, dan mengisi 10 produk contoh.
3. **Buat akun user** — buka *Authentication > Users > Add user*, buat minimal
   2 akun (misal `owner@toko.com` dan `kasir1@toko.com`), isi password.
4. **Hubungkan role ke akun** — salin `User UID` masing-masing akun dari
   halaman Users, lalu jalankan di SQL Editor:
   ```sql
   insert into profiles (id, full_name, role) values
     ('UID-OWNER-DI-SINI', 'Pemilik Toko', 'owner'),
     ('UID-KASIR-DI-SINI', 'Kasir 1', 'kasir');
   ```
5. **Ambil kredensial API** — buka *Settings > API*, salin **Project URL**
   dan **anon public key**.
6. **Edit `js/config.js`**:
   ```js
   const APP_CONFIG = {
     USE_SUPABASE: true,
     SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
     SUPABASE_ANON_KEY: 'ey...anon-key-panjang...',
     LOW_STOCK_THRESHOLD: 10,
   };
   ```
7. Selesai — refresh `index.html`, login pakai **email** (bukan username lagi)
   dan password yang dibuat di langkah 3. Semua data kini tersimpan permanen
   di Supabase dan sinkron di perangkat mana pun.

### Kenapa data.js bisa "gonta-ganti" backend tanpa mengubah file lain?

Semua bagian aplikasi (`app.js`, `table.js`, `modal.js`, `charts.js`) hanya
memanggil fungsi dari `data.js` (`getProducts()`, `addTransaction()`, dst).
Di dalam `data.js`, tiap fungsi mengecek `APP_CONFIG.USE_SUPABASE` — kalau
`true` ia memanggil Supabase, kalau `false` ia memakai localStorage. Jadi
kamu bisa berpindah mode kapan saja hanya dengan mengubah satu baris di
`config.js`, tanpa menyentuh file lain.

## 🧾 Manajemen Stok Otomatis

Saat transaksi baru disimpan lewat modal **"+ Tambah Transaksi Baru"**:
1. Sistem mengecek stok produk yang dipilih — jika kurang dari jumlah unit
   yang diminta, transaksi ditolak dengan pesan error.
2. Jika cukup, transaksi disimpan dan stok produk dikurangi otomatis
   (`updateProduct()` di `data.js`).
3. Jika stok tersisa ≤ `LOW_STOCK_THRESHOLD` (default 10, bisa diubah di
   `config.js`), muncul toast peringatan "stok tipis".
4. Setiap kali dashboard dibuka, sistem otomatis mengecek semua produk dan
   memberi notifikasi jika ada yang stoknya tipis.

## 🔐 Sistem Role (Owner vs Kasir)

| Menu / Fitur                        | Owner | Kasir |
|--------------------------------------|:-----:|:-----:|
| Dashboard (total penjualan, profit)   | ✅ | ❌ |
| Laporan Produk (harga beli, CRUD)      | ✅ | ❌ |
| Transaksi (lihat & tambah)              | ✅ | ✅ |
| Edit/Hapus transaksi                     | ✅ | ❌ |
| Pengaturan & Manajemen Akun Kasir          | ✅ | ❌ |

Diatur di `js/app.js` lewat objek `ROLE_MENU`, dan di mode Supabase juga
ditegakkan ulang di level database lewat kebijakan RLS pada
`supabase-schema.sql` (misal: hanya role `owner` yang boleh `UPDATE`/`DELETE`
tabel `products` dan `transactions`).

## 📤 Ekspor Data

Tombol **Ekspor PDF** (jsPDF + autotable) dan **Ekspor Excel** (SheetJS) ada
di halaman Transaksi, mengikuti hasil pencarian/filter yang sedang aktif.

## 🎨 Animasi & Tema

- Fade-in halus saat pertama membuka web (`body.page-fade-in`) dan setiap
  pindah menu (`playFadeIn()` di `js/animate.js`), termasuk efek stagger
  ringan pada kartu-kartu (`data-animate-item`).
- Dark/Light mode tersimpan di localStorage, toggle di topbar atau menu
  Pengaturan.
- Menghormati preferensi `prefers-reduced-motion` pengguna.

## 🧩 Kustomisasi Lanjutan

| Ingin mengubah...                  | Edit di...                              |
|--------------------------------------|-------------------------------------------|
| Ambang batas "stok tipis"              | `js/config.js` → `LOW_STOCK_THRESHOLD`    |
| Role & menu yang diizinkan               | `js/app.js` → `ROLE_MENU`                  |
| Field form transaksi/produk                | `dashboard.html` (modal) + `js/modal.js`     |
| Kebijakan akses database (RLS)               | `supabase-schema.sql`                          |
| Kredensial demo (mode localStorage)            | `js/auth.js` → `DEFAULT_DEMO_USERS`             |

## ⚠️ Batasan yang Perlu Diketahui

- Mode demo (localStorage) **tidak sinkron** antar perangkat/browser — cocok
  untuk uji coba, bukan produksi. Gunakan mode Supabase untuk data yang
  sungguhan tersimpan bersama.
- Password akun kasir di mode demo tersimpan polos di localStorage —
  jangan pakai password sungguhan, dan jangan andalkan mode ini untuk data
  sensitif. Mode Supabase memakai hashing password bawaan Supabase Auth,
  jauh lebih aman.
