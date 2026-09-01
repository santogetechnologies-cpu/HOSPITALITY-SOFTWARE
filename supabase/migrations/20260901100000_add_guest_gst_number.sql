-- Migration: Add gst_number column to guests and reservations tables
-- Date: 2026-09-01

ALTER TABLE IF EXISTS public.guests 
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

ALTER TABLE IF EXISTS public.reservations 
  ADD COLUMN IF NOT EXISTS gst_number TEXT;
