-- Migration to add optional columns to guests table if they do not already exist
alter table public.guests add column if not exists country text default 'India';
alter table public.guests add column if not exists last_stay text;
alter table public.guests add column if not exists stays integer default 0;
alter table public.guests add column if not exists spend numeric(10, 2) default 0;
alter table public.guests add column if not exists type text default 'Individual';
alter table public.guests add column if not exists vip boolean default false;
alter table public.guests add column if not exists preferences jsonb default '[]'::jsonb;
