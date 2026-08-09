# SalesBoard — Dashboard Laporan Penjualan (ERP Enterprise Edition)

Vanilla HTML/CSS/JS — tanpa build tool, tinggal buka `index.html`.

## 🆕 Fitur Baru di Versi Ini (ERP Enterprise Edition)

1. **Layout dashboard ala ERP** — grid kartu metrik multi-kolom (Total Penjualan, Jumlah Transaksi, Piutang/Pending, Rata-rata Nilai, Produk Terlaris, Keuntungan Bersih) + kotak grid persentase kontribusi kategori produk yang mendampingi grafik utama.
2. **Sepenuhnya responsif & mobile-friendly** — sidebar berubah jadi hamburger menu di layar sempit, ditambah **navigasi bawah (bottom nav)** untuk akses cepat di HP, dan seluruh tabel bisa digeser horizontal tanpa merusak tata letak.
3. **Kolom Waktu & detail pencatat transaksi** — tabel Transaksi kini menampilkan kolom Waktu (Jam:Menit). Khusus akun **Owner**, klik dua kali (double-click) pada baris transaksi memunculkan modal detail lengkap, termasuk nama Kasir/Penjaga yang mencatatnya, lengkap dengan tombol **Cetak Struk/Nota**.
4. **Quick Restock** — di halaman Laporan Produk, tombol 📥 pada tiap produk membuka modal "Restock / Tambah Stok"; Owner tinggal memasukkan jumlah barang masuk dan sistem otomatis menjumlahkan dengan stok lama.
5. **Kelola Profil Owner** — di menu Pengaturan, Owner bisa mengubah Nama Toko/Pemilik dan password akun Owner miliknya sendiri.
6. **Cetak struk/nota digital** — tombol cetak pada modal detail transaksi menghasilkan struk siap-print yang rapi (format 80mm-friendly).
7. Animasi transisi fade-in — halus saat halaman pertama dibuka & saat pindah menu (`js/animate.js`).
8. Multi-role auth — Owner (akses penuh) vs Kasir (hanya Transaksi).
9. Form modal (pop-up) — Tambah Transaksi & Tambah Produk, tanpa reload halaman.
10. Siap disambungkan ke Supabase (multi-toko) — struktur database + kode CRUD sudah disediakan, termasuk **isolasi data per toko** dan **fungsi atomik anti race-condition** untuk transaksi & restock.
11. Manajemen stok otomatis — stok berkurang otomatis setiap transaksi baru, terjamin akurat walau diakses banyak kasir bersamaan (mode Supabase).
12. Notifikasi toast — konfirmasi simpan & peringatan stok tipis.
13. Manajemen Akun Kasir — mode demo: Owner bisa membuat akun kasir langsung dari menu Pengaturan. Mode Supabase: akun kasir dibuat lewat Supabase Dashboard (lihat panduan di bawah), demi keamanan.

## 🔌 Setup Supabase (untuk jual akses ke banyak toko/pembeli)

Kalau kamu berencana menjual akses SalesBoard ke beberapa pemilik toko berbeda,
**mode demo (localStorage) tidak cocok** karena datanya tidak tersimpan di server
pusat dan tidak terpisah antar toko. Ikuti langkah ini sekali saja:

### A. Setup awal (sekali saja)
1. Daftar gratis di [supabase.com](https://supabase.com) → buat project baru.
2. Buka **SQL Editor** → New query → copy-paste **seluruh isi** file `supabase-schema.sql` → Run.
   File ini membuat tabel `stores`, `profiles`, `products`, `transactions`, plus
   Row Level Security (RLS) yang mengunci data tiap toko agar tidak bisa dilihat toko lain,
   dan 2 fungsi database (`create_transaction`, `restock_product`) yang menjamin
   perhitungan stok tetap akurat walau diakses banyak kasir sekaligus.
3. Buka **Settings > API** → salin **Project URL** dan **anon public key**.
4. Buka `js/config.js`, isi `SUPABASE_URL` & `SUPABASE_ANON_KEY` dengan nilai tadi,
   lalu ubah `USE_SUPABASE: false` menjadi `USE_SUPABASE: true`.

### B. Setiap ada pembeli baru yang sudah bayar
Lakukan 3 langkah ini di Supabase Dashboard (SQL Editor + Authentication):

1. **Buat toko baru** (SQL Editor):
   ```sql
   insert into stores (name) values ('Nama Toko Pembeli') returning id;
   ```
   Salin `id` yang muncul → ini `STORE_ID`.

2. **Buat akun login** (Authentication → Users → Add user): isi email & password
   untuk pemilik toko. Salin **User UID** → ini `USER_ID`.

3. **Hubungkan akun ke toko & role-nya** (SQL Editor):
   ```sql
   insert into profiles (id, full_name, role, store_id) values
     ('USER_ID', 'Nama Pemilik Toko', 'owner', 'STORE_ID');
   ```

Selesai — kirim email & password itu ke pembeli, mereka login dan otomatis
hanya melihat data toko mereka sendiri. Kalau mereka mau tambah akun kasir,
ulangi langkah 2 & 3 dengan `role: 'kasir'` dan `store_id` yang **sama** seperti ownernya.

Detail lengkap & contoh query juga ada sebagai komentar di dalam `supabase-schema.sql`.

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
