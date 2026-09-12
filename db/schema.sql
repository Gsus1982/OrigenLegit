-- Esquema Postgres para OrigenLegit (Neon / Vercel Postgres)

create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text,
  brand text,
  supermarket text,
  product_url text,
  last_checked_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_products_barcode on products (barcode);
create index if not exists idx_products_supermarket on products (supermarket);

create table if not exists product_origins (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  source text not null,
  raw_text text,
  country_code text,
  confidence numeric not null,
  verdict text not null,
  created_at timestamptz default now()
);

create index if not exists idx_origins_product on product_origins (product_id);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  barcode text,
  final_verdict text,
  created_at timestamptz default now()
);

create or replace view product_verdicts as
select
  p.id as product_id,
  p.barcode,
  p.name,
  p.brand,
  p.supermarket,
  o.verdict,
  o.country_code,
  o.confidence,
  o.source,
  o.raw_text,
  o.created_at as evidence_at
from products p
join lateral (
  select * from product_origins po
  where po.product_id = p.id
  order by po.confidence desc, po.created_at desc
  limit 1
) o on true;
