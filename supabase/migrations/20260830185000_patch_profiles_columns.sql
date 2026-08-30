-- Migration to add email and pin to profiles table
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists pin text;
