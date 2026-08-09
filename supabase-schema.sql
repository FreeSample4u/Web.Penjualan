-- =========================================================================
-- SalesBoard — Skema Database Supabase (PostgreSQL) — Edisi Multi-Toko
-- Jalankan SELURUH file ini di: Supabase Dashboard > SQL Editor > New query
-- =========================================================================
-- Skema ini mendukung BANYAK TOKO dalam satu project Supabase yang sama.
-- Setiap toko (pembeli) punya data produk & transaksi yang TERPISAH TOTAL
-- dari toko lain, walau berbagi 1 database. Cocok untuk model bisnis:
-- kamu jual akses SalesBoard ke beberapa pemilik toko berbeda.
-- =========================================================================

-- 0. Tabel STORES — satu baris = satu toko/pembeli
create table if not exists stores (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- 1. Tabel PROFILES — role & toko setiap user (terhubung ke auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('owner', 'kasir')),
  store_id uuid references stores(id) on delete cascade,
  created_at timestamptz default now()
);

-- 2. Tabel PRODUCTS
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references stores(id) on delete cascade not null,
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
  store_id uuid references stores(id) on delete cascade not null,
  trx_code text not null,
  trx_date date not null default current_date,
  trx_time text default '--:--',
  customer text not null,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  category text,
  qty int not null,
  total numeric not null,
  payment_method text not null default 'Tunai',
  status text not null default 'Lunas' check (status in ('Lunas', 'Pending')),
  cashier_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- =========================================================================
-- HELPER: ambil store_id / role milik user yang sedang login
-- (dipakai di RLS & RPC di bawah)
-- =========================================================================
create or replace function current_store_id()
returns uuid
language sql
security definer
stable
as $$
  select store_id from profiles where id = auth.uid();
$$;

create or replace function current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) — isolasi data per toko + batasi akses per role
-- =========================================================================
alter table stores enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;

-- PROFILES: setiap user hanya boleh baca profilnya sendiri
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

-- STORES: user hanya boleh lihat data toko miliknya sendiri
create policy "stores_select_own" on stores
  for select using (id = current_store_id());

-- PRODUCTS: user hanya boleh lihat produk milik TOKONYA SENDIRI
create policy "products_select_own_store" on products
  for select using (store_id = current_store_id());

-- PRODUCTS: hanya OWNER (di toko yang sama) yang boleh INSERT/UPDATE/DELETE
create policy "products_write_owner" on products
  for all using (
    store_id = current_store_id() and current_user_role() = 'owner'
  )
  with check (
    store_id = current_store_id() and current_user_role() = 'owner'
  );

-- TRANSACTIONS: user hanya boleh lihat transaksi milik TOKONYA SENDIRI
create policy "transactions_select_own_store" on transactions
  for select using (store_id = current_store_id());

-- TRANSACTIONS: insert manual (fallback) tetap dibatasi ke toko sendiri
-- (jalur utama adalah RPC create_transaction di bawah, yang lebih aman)
create policy "transactions_insert_own_store" on transactions
  for insert with check (store_id = current_store_id());

-- TRANSACTIONS: hanya OWNER yang boleh UPDATE/DELETE (koreksi/hapus data)
create policy "transactions_update_owner" on transactions
  for update using (
    store_id = current_store_id() and current_user_role() = 'owner'
  );

create policy "transactions_delete_owner" on transactions
  for delete using (
    store_id = current_store_id() and current_user_role() = 'owner'
  );

-- =========================================================================
-- RPC: create_transaction — transaksi baru + kurangi stok SECARA ATOMIK
-- =========================================================================
-- Memakai row lock (FOR UPDATE) supaya kalau 2 kasir input transaksi produk
-- yang sama di detik yang sama persis, stok tetap terhitung benar (anti
-- race-condition), tidak seperti model baca-lalu-tulis biasa.
create or replace function create_transaction(
  p_trx_code text,
  p_trx_date date,
  p_trx_time text,
  p_customer text,
  p_product_id uuid,
  p_qty int,
  p_payment_method text,
  p_status text,
  p_cashier_name text
) returns transactions
language plpgsql
security definer
as $$
declare
  v_store_id uuid := current_store_id();
  v_product products%rowtype;
  v_trx transactions%rowtype;
begin
  if v_store_id is null then
    raise exception 'Akun ini belum terdaftar di toko manapun. Hubungi admin.';
  end if;
  if p_qty is null or p_qty < 1 then
    raise exception 'Jumlah unit tidak valid.';
  end if;

  -- kunci baris produk supaya tidak ada transaksi lain yang baca stok
  -- lama secara bersamaan (mencegah stok minus akibat race-condition)
  select * into v_product from products
    where id = p_product_id and store_id = v_store_id
    for update;

  if not found then
    raise exception 'Produk tidak ditemukan di toko ini.';
  end if;
  if v_product.stock < p_qty then
    raise exception 'Stok tidak cukup. Sisa stok "%": %', v_product.name, v_product.stock;
  end if;

  update products set stock = stock - p_qty where id = p_product_id;

  insert into transactions (
    store_id, trx_code, trx_date, trx_time, customer, product_id, product_name,
    category, qty, total, payment_method, status, cashier_name, created_by
  ) values (
    v_store_id, p_trx_code, p_trx_date, p_trx_time, p_customer, p_product_id, v_product.name,
    v_product.category, p_qty, v_product.sell_price * p_qty, p_payment_method, p_status,
    p_cashier_name, auth.uid()
  ) returning * into v_trx;

  return v_trx;
end;
$$;

-- =========================================================================
-- RPC: restock_product — tambah stok SECARA ATOMIK (stok lama + masuk baru)
-- =========================================================================
create or replace function restock_product(
  p_product_id uuid,
  p_added_qty int
) returns products
language plpgsql
security definer
as $$
declare
  v_store_id uuid := current_store_id();
  v_role text := current_user_role();
  v_product products%rowtype;
begin
  if v_role is distinct from 'owner' then
    raise exception 'Hanya Owner yang boleh melakukan restock.';
  end if;
  if p_added_qty is null or p_added_qty < 1 then
    raise exception 'Jumlah stok masuk harus lebih dari 0.';
  end if;

  select * into v_product from products
    where id = p_product_id and store_id = v_store_id
    for update;

  if not found then
    raise exception 'Produk tidak ditemukan di toko ini.';
  end if;

  update products set stock = stock + p_added_qty where id = p_product_id;

  select * into v_product from products where id = p_product_id;
  return v_product;
end;
$$;

-- =========================================================================
-- CARA ONBOARDING PEMBELI / TOKO BARU (dijalankan MANUAL oleh kamu)
-- =========================================================================
-- Setiap ada pembeli baru yang sudah bayar, lakukan 3 langkah ini:
--
-- LANGKAH 1 — Buat toko baru (SQL Editor):
--   insert into stores (name) values ('Nama Toko Pembeli') returning id;
--   -> salin "id" (uuid) yang muncul, sebut saja STORE_ID
--
-- LANGKAH 2 — Buat akun login (Authentication > Users > Add user):
--   Isi email & password untuk pemilik toko tsb.
--   -> salin "User UID" yang muncul, sebut saja USER_ID
--
-- LANGKAH 3 — Hubungkan akun ke toko & tentukan rolenya (SQL Editor):
--   insert into profiles (id, full_name, role, store_id) values
--     ('USER_ID', 'Nama Pemilik Toko', 'owner', 'STORE_ID');
--
-- Kalau toko itu juga mau bikin akun kasir tambahan, ulangi LANGKAH 2 & 3
-- dengan role 'kasir' dan STORE_ID yang SAMA seperti ownernya.
--
-- Selesai — pembeli tinggal login pakai email & password yang kamu buatkan,
-- dan otomatis hanya melihat data toko miliknya sendiri.

-- =========================================================================
-- (OPSIONAL) Data contoh produk — jalankan setelah toko contoh dibuat,
-- ganti 'STORE_ID_DI_SINI' dengan id toko yang ingin diisi data contoh
-- =========================================================================
-- insert into products (store_id, name, category, buy_price, sell_price, stock) values
--   ('STORE_ID_DI_SINI', 'Kemeja Flanel Pria', 'Fashion Pria', 110000, 175000, 40),
--   ('STORE_ID_DI_SINI', 'Dress Wanita Casual', 'Fashion Wanita', 140000, 220000, 25),
--   ('STORE_ID_DI_SINI', 'Sepatu Sneakers', 'Sepatu', 230000, 350000, 18);
