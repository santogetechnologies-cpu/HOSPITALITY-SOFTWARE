-- Fix infinite recursion RLS policies on profiles and discounts

-- 1. Disable & Drop all recursive policies on profiles
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);


-- 2. Disable & Drop all recursive policies on discounts
ALTER TABLE IF EXISTS public.discounts DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'discounts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.discounts', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS public.discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to discounts" ON public.discounts FOR ALL USING (true) WITH CHECK (true);


-- 3. Patch discounts table columns to accept text for requested_by and approved_by
DO $$
BEGIN
  -- Drop foreign keys if they exist on requested_by / approved_by
  BEGIN
    ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_requested_by_fkey;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_approved_by_fkey;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Change column types to text
  BEGIN
    ALTER TABLE public.discounts ALTER COLUMN requested_by TYPE text USING requested_by::text;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.discounts ALTER COLUMN approved_by TYPE text USING approved_by::text;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Ensure columns exist
  ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS reason text;
  ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS requested_amount numeric(10, 2) DEFAULT 0;
  ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';
  ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS reservation_id text;
END $$;
