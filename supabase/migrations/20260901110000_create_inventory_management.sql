-- Inventory Management Schema for Hotel DRB
-- Tracks stock of items (water cans, pillows, bedsheets, toiletries, cleaning supplies, etc.)
-- Includes automated expense ledger syncing and discard/damage auditing

create extension if not exists "pgcrypto";

create table if not exists public.inventory_items (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    category text not null default 'General',
    unit text not null default 'units',
    quantity numeric(10, 2) not null default 0,
    min_threshold numeric(10, 2) not null default 5,
    unit_cost numeric(10, 2) not null default 0,
    location text default 'Main Store Room',
    status text not null default 'IN_STOCK',
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.inventory_transactions (
    id text primary key default gen_random_uuid()::text,
    item_id text references public.inventory_items(id) on delete cascade not null,
    type text not null, -- 'PURCHASE' | 'DISCARD' | 'CONSUMED' | 'RETURN' | 'ADJUSTMENT'
    quantity numeric(10, 2) not null,
    unit_price numeric(10, 2) not null default 0,
    total_cost numeric(10, 2) not null default 0,
    reason text,
    sync_to_expenses boolean not null default true,
    expense_id uuid references public.expenses(id) on delete set null,
    performed_by text default 'Staff',
    notes text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for optimal performance
create index if not exists idx_inventory_items_category on public.inventory_items(category);
create index if not exists idx_inventory_items_status on public.inventory_items(status);
create index if not exists idx_inventory_transactions_item_id on public.inventory_transactions(item_id);
create index if not exists idx_inventory_transactions_created_at on public.inventory_transactions(created_at desc);
create index if not exists idx_inventory_transactions_type on public.inventory_transactions(type);

-- Row Level Security
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

drop policy if exists "Allow all access to inventory_items" on public.inventory_items;
create policy "Allow all access to inventory_items" on public.inventory_items for all using (true) with check (true);

drop policy if exists "Allow all access to inventory_transactions" on public.inventory_transactions;
create policy "Allow all access to inventory_transactions" on public.inventory_transactions for all using (true) with check (true);


