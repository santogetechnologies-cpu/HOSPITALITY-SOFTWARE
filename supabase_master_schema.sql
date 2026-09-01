-- ==============================================================================
-- DRB HOTEL PROPERTY MANAGEMENT SYSTEM - COMPLETE MASTER DATABASE SCHEMA
-- ==============================================================================
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- It is safe to run multiple times (idempotent) and will create/repair all tables.
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 2. CREATE ALL 12 CORE DATABASE TABLES
-- ==========================================

-- Table 1: Rooms
create table if not exists public.rooms (
    id text primary key default uuid_generate_v4()::text,
    room_number text not null unique,
    room_name text,
    room_type_id text,
    floor text default '1',
    price numeric(10, 2) not null default 0,
    capacity integer not null default 2,
    status text default 'AVAILABLE',
    amenities text[] default '{}',
    photos text[] default '{}',
    is_active boolean default true,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 2: Guests
create table if not exists public.guests (
    id text primary key default uuid_generate_v4()::text,
    name text not null,
    email text,
    phone text,
    country text,
    address text,
    id_type text,
    id_number text,
    gst_number text,
    last_stay date default current_date,
    stays integer default 0,
    spend numeric(10, 2) default 0,
    type text default 'Individual',
    vip boolean default false,
    preferences text[] default '{}',
    notes text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 3: Party Hall (Banquet Facility)
create table if not exists public.party_hall (
    id text primary key default uuid_generate_v4()::text,
    name text not null default 'Grand Ballroom & Party Hall',
    capacity integer not null default 150,
    hourly_rate numeric(10, 2) not null default 5000,
    status text default 'AVAILABLE',
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 4: Reservations (Room & Party Hall Bookings)
create table if not exists public.reservations (
    id text primary key default ('RES-' || upper(substr(md5(random()::text), 1, 6))),
    guest_id text references public.guests(id) on delete set null,
    room_id text references public.rooms(id) on delete set null,
    party_hall_id text references public.party_hall(id) on delete set null,
    resource_type text not null default 'ROOM',
    event_type text,
    number_of_guests integer default 1,
    booking_date date not null default current_date,
    start_time text default '14:00:00',
    end_time text default '14:00:00',
    base_amount numeric(10, 2) not null default 0,
    additional_charges numeric(10, 2) default 0,
    status text not null default 'CONFIRMED',
    notes text,
    gst_number text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 5: Payments (Folios & Settlements)
create table if not exists public.payments (
    id text primary key default uuid_generate_v4()::text,
    reservation_id text references public.reservations(id) on delete cascade,
    total_amount numeric(10, 2) not null default 0,
    paid_amount numeric(10, 2) not null default 0,
    status text not null default 'PENDING',
    payment_method text default 'CASH',
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 6: Discounts (Folio Adjustments & Approvals)
create table if not exists public.discounts (
    id text primary key default uuid_generate_v4()::text,
    reservation_id text references public.reservations(id) on delete cascade,
    requested_amount numeric(10, 2) not null default 0,
    reason text not null,
    status text not null default 'PENDING',
    requested_by text default 'Staff',
    approved_by text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 7: Expenses (Petty Cash & Daily Payouts)
create table if not exists public.expenses (
    id text primary key default uuid_generate_v4()::text,
    amount numeric(10, 2) not null default 0,
    category text not null default 'Operational',
    description text not null,
    receipt_url text,
    recorded_by text default 'System',
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 8: Staff Profiles (User Directory & Roles)
create table if not exists public.profiles (
    id text primary key,
    name text not null,
    phone text,
    role text not null default 'FRONT_DESK',
    status text not null default 'ACTIVE',
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 9: Housekeeping Tasks (hk_tasks)
create table if not exists public.hk_tasks (
    id text primary key default uuid_generate_v4()::text,
    room_id text references public.rooms(id) on delete cascade,
    room_type text,
    checkout text,
    kind text default 'Departure Clean',
    assignee text default 'Unassigned',
    stage text not null default 'Dirty',
    priority text default 'Normal',
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 10: Maintenance Tickets (Complaints & Repairs)
create table if not exists public.tickets (
    id text primary key default ('MT-' || upper(substr(md5(random()::text), 1, 6))),
    room_id text references public.rooms(id) on delete set null,
    issue text not null,
    priority text default 'Medium',
    status text default 'Open',
    assignee text default 'Unassigned',
    raised timestamptz default timezone('utc'::text, now()) not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 11: Notifications (System Alerts)
create table if not exists public.notifications (
    id text primary key default uuid_generate_v4()::text,
    icon text,
    title text not null,
    body text not null,
    time text default 'Just now',
    type text default 'general',
    read boolean default false,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Table 12: Folio Lines (Itemized Room & Service Charges)
create table if not exists public.folio_lines (
    id text primary key default uuid_generate_v4()::text,
    reservation_id text references public.reservations(id) on delete cascade,
    date date not null default current_date,
    description text not null,
    category text default 'Room',
    amount numeric(10, 2) not null default 0,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. ENSURE COLUMNS EXIST (SELF-HEALING)
-- ==========================================
alter table public.rooms add column if not exists room_number text;
alter table public.rooms add column if not exists room_name text;
alter table public.rooms add column if not exists floor text default '1';
alter table public.rooms add column if not exists price numeric(10, 2) default 0;
alter table public.rooms add column if not exists status text default 'AVAILABLE';

alter table public.reservations add column if not exists resource_type text default 'ROOM';
alter table public.reservations add column if not exists party_hall_id text;
alter table public.reservations add column if not exists event_type text;
alter table public.reservations add column if not exists booking_date date default current_date;
alter table public.reservations add column if not exists start_time text default '14:00:00';
alter table public.reservations add column if not exists end_time text default '11:00:00';

alter table public.payments add column if not exists total_amount numeric(10, 2) default 0;
alter table public.payments add column if not exists paid_amount numeric(10, 2) default 0;
alter table public.payments add column if not exists status text default 'PENDING';
alter table public.payments add column if not exists payment_method text default 'CASH';

alter table public.discounts add column if not exists requested_amount numeric(10, 2) default 0;
alter table public.discounts add column if not exists reason text;
alter table public.discounts add column if not exists status text default 'PENDING';

alter table public.expenses add column if not exists amount numeric(10, 2) default 0;
alter table public.expenses add column if not exists category text default 'Operational';
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists recorded_by text default 'System';

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text default 'FRONT_DESK';
alter table public.profiles add column if not exists status text default 'ACTIVE';

-- ==========================================
-- 4. ENABLE ROW LEVEL SECURITY & OPEN POLICIES
-- ==========================================
alter table public.rooms enable row level security;
alter table public.guests enable row level security;
alter table public.party_hall enable row level security;
alter table public.reservations enable row level security;
alter table public.payments enable row level security;
alter table public.discounts enable row level security;
alter table public.expenses enable row level security;
alter table public.profiles enable row level security;
alter table public.hk_tasks enable row level security;
alter table public.tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.folio_lines enable row level security;

-- Drop old policies to prevent duplicates and recreate clean full-access policies
drop policy if exists "Allow all access to rooms" on public.rooms;
create policy "Allow all access to rooms" on public.rooms for all using (true) with check (true);

drop policy if exists "Allow all access to guests" on public.guests;
create policy "Allow all access to guests" on public.guests for all using (true) with check (true);

drop policy if exists "Allow all access to party_hall" on public.party_hall;
create policy "Allow all access to party_hall" on public.party_hall for all using (true) with check (true);

drop policy if exists "Allow all access to reservations" on public.reservations;
create policy "Allow all access to reservations" on public.reservations for all using (true) with check (true);

drop policy if exists "Allow all access to payments" on public.payments;
create policy "Allow all access to payments" on public.payments for all using (true) with check (true);

drop policy if exists "Allow all access to discounts" on public.discounts;
create policy "Allow all access to discounts" on public.discounts for all using (true) with check (true);

drop policy if exists "Allow all access to expenses" on public.expenses;
create policy "Allow all access to expenses" on public.expenses for all using (true) with check (true);

drop policy if exists "Allow all access to profiles" on public.profiles;
create policy "Allow all access to profiles" on public.profiles for all using (true) with check (true);

drop policy if exists "Allow all access to hk_tasks" on public.hk_tasks;
create policy "Allow all access to hk_tasks" on public.hk_tasks for all using (true) with check (true);

drop policy if exists "Allow all access to tickets" on public.tickets;
create policy "Allow all access to tickets" on public.tickets for all using (true) with check (true);

drop policy if exists "Allow all access to notifications" on public.notifications;
create policy "Allow all access to notifications" on public.notifications for all using (true) with check (true);

drop policy if exists "Allow all access to folio_lines" on public.folio_lines;
create policy "Allow all access to folio_lines" on public.folio_lines for all using (true) with check (true);

-- ==========================================
-- 5. INITIAL STARTER SEED DATA
-- ==========================================
-- Starter Seeds
insert into public.party_hall (id, name, capacity, hourly_rate, status)
values ('a0000000-0000-0000-0000-000000000001', 'Grand Ballroom & Party Hall', 200, 7500.00, 'ACTIVE')
on conflict (id) do nothing;
