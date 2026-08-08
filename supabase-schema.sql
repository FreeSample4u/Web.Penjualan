-- =========================================================================
-- SalesBoard — Skema Database Supabase (PostgreSQL)
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor > New query
-- =========================================================================

-- 1. Tabel PROFILES — menyimpan role setiap user (terhubung ke auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  store_name text default 'Toko Saya',
  role text not null check (role in ('owner', 'kasir')),
  created_at timestamptz default now()
);

-- 2. Tabel PRODUCTS
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  buy_price numeric not null default 0,
  sell_price numeric not null default 0,
  stock int not null default 0,
  created_at timestamptz default now()
);

-- 3. Tabel TRANSACTIONS
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  trx_code text not null,
  trx_date date not null default current_date,
  trx_time text not null default to_char(now(), 'HH24:MI'),
  customer text not null,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  category text,
  qty int not null,
  total numeric not null,
  payment_method text not null default 'Tunai',
  status text not null default 'Lunas' check (status in ('Lunas', 'Pending')),
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz default now()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) — batasi akses sesuai role
-- =========================================================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;

-- PROFILES: setiap user hanya boleh baca profilnya sendiri
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

-- PROFILES: setiap user boleh update profilnya sendiri (nama, nama toko)
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- PRODUCTS: semua user login boleh SELECT (lihat stok/harga jual untuk transaksi)
create policy "products_select_all" on products
  for select using (auth.role() = 'authenticated');

-- PRODUCTS: hanya OWNER yang boleh INSERT/UPDATE/DELETE
create policy "products_write_owner" on products
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- TRANSACTIONS: semua user login boleh SELECT & INSERT (kasir input transaksi)
create policy "transactions_select_all" on transactions
  for select using (auth.role() = 'authenticated');

create policy "transactions_insert_all" on transactions
  for insert with check (auth.role() = 'authenticated');

-- TRANSACTIONS: hanya OWNER yang boleh UPDATE/DELETE (koreksi/hapus data)
create policy "transactions_update_owner" on transactions
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "transactions_delete_owner" on transactions
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- =========================================================================
-- CARA MEMBUAT AKUN OWNER & KASIR
-- =========================================================================
-- 1. Buka Supabase Dashboard > Authentication > Users > Add user
--    Buat 2 user, misal: owner@toko.com dan kasir1@toko.com (isi password)
-- 2. Salin User UID masing-masing, lalu jalankan (ganti UID & nama sesuai):
--
--    insert into profiles (id, full_name, role) values
--      ('UID-OWNER-DI-SINI', 'Pemilik Toko', 'owner'),
--      ('UID-KASIR-DI-SINI', 'Kasir 1', 'kasir');
--
-- 3. Selesai — login di aplikasi memakai email & password tersebut.

-- =========================================================================
-- (OPSIONAL) Data contoh produk
-- =========================================================================
insert into products (name, category, buy_price, sell_price, stock) values
  ('Kemeja Flanel Pria', 'Fashion Pria', 110000, 175000, 40),
  ('Dress Wanita Casual', 'Fashion Wanita', 140000, 220000, 25),
  ('Sepatu Sneakers', 'Sepatu', 230000, 350000, 18),
  ('Tas Ransel Kanvas', 'Aksesoris', 170000, 265000, 30),
  ('Jam Tangan Digital', 'Aksesoris', 260000, 410000, 15),
  ('Headset Bluetooth', 'Elektronik', 180000, 285000, 22),
  ('Powerbank 10000mAh', 'Elektronik', 120000, 195000, 8),
  ('Kaos Polos Premium', 'Fashion Pria', 55000, 95000, 60),
  ('Rok Plisket', 'Fashion Wanita', 95000, 150000, 20),
  ('Sandal Slip-On', 'Sepatu', 70000, 120000, 5);
