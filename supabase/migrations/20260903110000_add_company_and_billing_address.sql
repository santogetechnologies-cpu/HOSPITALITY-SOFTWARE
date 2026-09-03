-- Migration: Add company_name, address, and gst_number columns to guests and reservations tables
-- Date: 2026-09-03

ALTER TABLE IF EXISTS public.guests 
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

ALTER TABLE IF EXISTS public.reservations 
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;
