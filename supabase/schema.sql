-- PayLedger schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Balances: one row per platform (gcash / maya)
-- ─────────────────────────────────────────────
create table if not exists balances (
  platform text primary key check (platform in ('gcash', 'maya')),
  amount numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into balances (platform, amount) values ('gcash', 0), ('maya', 0)
  on conflict (platform) do nothing;

-- ─────────────────────────────────────────────
-- App settings: commission tiers & fixed fees
-- stored as a single-row key/value jsonb table
-- ─────────────────────────────────────────────
create table if not exists app_settings (
  key text primary key,
  value jsonb not null
);

insert into app_settings (key, value) values
  ('gcash_tiers', '[{"min":1,"max":100,"fee":5},{"min":101,"max":500,"fee":10},{"min":501,"max":1000,"fee":15}]'),
  ('maya_tiers', '[{"min":1,"max":100,"fee":5},{"min":101,"max":500,"fee":10},{"min":501,"max":1000,"fee":15}]'),
  ('maya_fixed_fee', '10'),
  ('maya_load_commission', '5'),
  ('maya_banktransfer_commission', '0')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────
-- Transactions: the history log
-- ─────────────────────────────────────────────
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  platform text not null check (platform in ('gcash', 'maya')),
  type text not null check (type in ('cash_in','cash_out','maya_cash_in','maya_cash_out','load','bank_transfer')),
  amount numeric not null check (amount > 0),
  commission numeric not null default 0,
  net_total numeric not null default 0,
  balance_after numeric,
  reference_no text,
  note text
);

create index if not exists transactions_created_at_idx on transactions (created_at desc);
create index if not exists transactions_platform_idx on transactions (platform);
create index if not exists transactions_type_idx on transactions (type);

-- ─────────────────────────────────────────────
-- Row Level Security
-- This app is protected by a login screen (Supabase Auth), and the tables
-- are only readable/writable by an authenticated (logged-in) user.
-- ─────────────────────────────────────────────
alter table balances enable row level security;
alter table app_settings enable row level security;
alter table transactions enable row level security;

create policy "Authenticated users can read balances" on balances
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can update balances" on balances
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read settings" on app_settings
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can update settings" on app_settings
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read transactions" on transactions
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert transactions" on transactions
  for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can delete transactions" on transactions
  for delete using (auth.role() = 'authenticated');
