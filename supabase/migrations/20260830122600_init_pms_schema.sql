-- 1. Enable UUID Extension (usually enabled by default in Supabase)
create extension if not exists "uuid-ossp";

-- ==========================================
-- TABLES DEFINITION
-- ==========================================

-- Guests Table
create table if not exists public.guests (
    id text primary key,
    name text not null,
    email text,
    phone text,
    country text,
    last_stay date,
    stays integer default 0,
    spend numeric(10, 2) default 0,
    type text check (type in ('Individual', 'Corporate', 'Travel Agent')),
    vip boolean default false,
    preferences text[],
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rooms Table
create table if not exists public.rooms (
    id text primary key,
    number text not null unique,
    floor integer not null,
    floor_name text,
    type text not null,
    bed text,
    max_guests integer default 2,
    rate numeric(10, 2) not null,
    status text check (status in ('vacant-clean', 'occupied', 'vacant-dirty', 'cleaning', 'ooo', 'oos', 'reserved', 'maintenance')),
    hk_status text check (hk_status in ('Clean', 'Dirty', 'In Progress', 'Inspected')),
    amenities text[],
    view text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reservations Table
create table if not exists public.reservations (
    id text primary key,
    guest_id text references public.guests(id) on delete restrict,
    room_id text references public.rooms(id) on delete restrict,
    arrival date not null,
    departure date not null,
    nights integer not null,
    adults integer default 1,
    rate_plan text,
    source text,
    amount numeric(10, 2) default 0,
    paid numeric(10, 2) default 0,
    payment_status text check (payment_status in ('Paid', 'Partial', 'Pending')),
    status text check (status in ('Confirmed', 'Tentative', 'Checked In', 'Checked Out', 'Cancelled', 'No Show', 'Waitlist')),
    eta text,
    vip boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Housekeeping Tasks (hk_tasks)
create table if not exists public.hk_tasks (
    id text primary key,
    room_id text references public.rooms(id) on delete cascade,
    room_type text,
    checkout text,
    kind text check (kind in ('Departure Clean', 'Deep Clean', 'Stayover', 'Turndown')),
    assignee text,
    stage text check (stage in ('Dirty', 'Assigned', 'Cleaning', 'Inspection', 'Ready')),
    priority text check (priority in ('High', 'Normal')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Staff Table
create table if not exists public.staff (
    id text primary key,
    name text not null,
    department text,
    role text,
    shift text check (shift in ('Morning', 'Evening', 'Night', 'Off')),
    attendance text check (attendance in ('Present', 'Absent', 'On Leave')),
    tasks integer default 0,
    done integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Folio Lines Table
create table if not exists public.folio_lines (
    id text primary key,
    date date not null,
    description text not null,
    category text check (category in ('Room', 'F&B', 'Laundry', 'Minibar', 'Tax', 'Discount', 'Payment')),
    amount numeric(10, 2) not null,
    reservation_id text references public.reservations(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Maintenance Tickets
create table if not exists public.tickets (
    id text primary key,
    room_id text references public.rooms(id) on delete cascade,
    issue text not null,
    priority text check (priority in ('High', 'Medium', 'Low')),
    status text check (status in ('Open', 'In Progress', 'Resolved')),
    assignee text,
    raised timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table if not exists public.notifications (
    id text primary key,
    icon text,
    title text not null,
    body text not null,
    time text,
    type text check (type in ('booking', 'housekeeping', 'payment', 'vip', 'maintenance', 'ota')),
    read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
alter table public.guests enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.hk_tasks enable row level security;
alter table public.staff enable row level security;
alter table public.folio_lines enable row level security;
alter table public.tickets enable row level security;
alter table public.notifications enable row level security;

-- Create blanket policies for authenticated users
create policy "Allow full access to authenticated users on guests" on public.guests for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on rooms" on public.rooms for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on reservations" on public.reservations for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on hk_tasks" on public.hk_tasks for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on staff" on public.staff for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on folio_lines" on public.folio_lines for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on tickets" on public.tickets for all to authenticated using (true) with check (true);
create policy "Allow full access to authenticated users on notifications" on public.notifications for all to authenticated using (true) with check (true);


-- ==========================================
-- INDEXES (Performance Best Practices)
-- ==========================================

create index if not exists idx_reservations_guest_id on public.reservations(guest_id);
create index if not exists idx_reservations_room_id on public.reservations(room_id);
create index if not exists idx_hk_tasks_room_id on public.hk_tasks(room_id);
create index if not exists idx_folio_lines_reservation_id on public.folio_lines(reservation_id);
create index if not exists idx_tickets_room_id on public.tickets(room_id);
