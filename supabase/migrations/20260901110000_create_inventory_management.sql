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

-- Initial Hotel Inventory Seeds
insert into public.inventory_items (id, name, category, unit, quantity, min_threshold, unit_cost, location, status)
values
    ('inv-001', '20L Drinking Water Can', 'Beverages & Water', 'cans', 18, 5, 80.00, 'Reception & Floor Pantry', 'IN_STOCK'),
    ('inv-002', 'Deluxe Microfiber Pillows', 'Linens & Bedding', 'pieces', 40, 10, 350.00, 'Linen Store Room', 'IN_STOCK'),
    ('inv-003', 'King Size White Bedsheets (300 TC)', 'Linens & Bedding', 'pieces', 65, 15, 650.00, 'Linen Store Room', 'IN_STOCK'),
    ('inv-004', 'Premium Cotton Bath Towels', 'Linens & Bedding', 'pieces', 50, 12, 280.00, 'Housekeeping Closet Floor 1', 'IN_STOCK'),
    ('inv-005', 'Hotel Guest Toiletries Kit', 'Guest Amenities', 'kits', 120, 30, 45.00, 'Main Store Room', 'IN_STOCK'),
    ('inv-006', 'Floor Cleaning Disinfectant (5L)', 'Housekeeping Supplies', 'cans', 8, 3, 420.00, 'Housekeeping Store', 'IN_STOCK'),
    ('inv-007', 'Complimentary Tea & Coffee Sachets Box (100s)', 'Beverages & Water', 'boxes', 12, 4, 380.00, 'Kitchen Store', 'IN_STOCK'),
    ('inv-008', 'LED Room Bulb (9W Warm White)', 'Maintenance & Fixtures', 'pieces', 24, 6, 95.00, 'Maintenance Room', 'IN_STOCK')
on conflict (id) do nothing;
