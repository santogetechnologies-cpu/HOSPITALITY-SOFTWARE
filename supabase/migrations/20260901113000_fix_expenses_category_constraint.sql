-- Fix any restrictive check constraints on public.expenses table
-- to allow 'Inventory / Supplies' and any custom category

alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses drop constraint if exists expenses_logged_by_fkey;

-- Ensure columns exist and have flexible types
alter table public.expenses alter column category drop default;
alter table public.expenses alter column category set default 'Operational';
alter table public.expenses add column if not exists recorded_by text default 'System';
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists amount numeric(10, 2) default 0;

-- Ensure RLS allows read and write for all
alter table public.expenses enable row level security;
drop policy if exists "Allow all access to expenses" on public.expenses;
create policy "Allow all access to expenses" on public.expenses for all using (true) with check (true);
