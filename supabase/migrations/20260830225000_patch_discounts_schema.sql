-- Patch discounts table columns to accept text for requested_by and approved_by
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
END $$;
