-- ==============================================================================
-- Migration: Group Bookings, Split Payments & Salary Advance Expenses
-- ==============================================================================

-- 1. Create Group Bookings Table
create table if not exists public.group_bookings (
    id text primary key default ('GRP-' || upper(substr(md5(random()::text), 1, 6))),
    name text not null,
    contact_name text,
    contact_phone text,
    contact_email text,
    payer_type text not null default 'LAST_ROOM',
    custom_payer_room_id text,
    status text not null default 'ACTIVE',
    notes text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Add group linkage to Reservations table
alter table public.reservations add column if not exists group_id text references public.group_bookings(id) on delete set null;
alter table public.reservations add column if not exists transferred_amount numeric(10, 2) default 0;
alter table public.reservations add column if not exists transferred_from text;

-- 3. Create Payment Splits Table
create table if not exists public.payment_splits (
    id text primary key default uuid_generate_v4()::text,
    payment_id text references public.payments(id) on delete cascade,
    reservation_id text references public.reservations(id) on delete cascade,
    method text not null default 'CASH',
    amount numeric(10, 2) not null default 0,
    reference_note text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS and Open Policies
alter table public.group_bookings enable row level security;
alter table public.payment_splits enable row level security;

drop policy if exists "Allow all access to group_bookings" on public.group_bookings;
create policy "Allow all access to group_bookings" on public.group_bookings for all using (true) with check (true);

drop policy if exists "Allow all access to payment_splits" on public.payment_splits;
create policy "Allow all access to payment_splits" on public.payment_splits for all using (true) with check (true);
