-- Migration to update foreign keys with ON DELETE CASCADE / ON DELETE SET NULL safely

-- 1. Ensure foreign key columns match referenced types (UUID)
DO $$ 
BEGIN
  -- discounts.reservation_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discounts' AND column_name='reservation_id') THEN
    ALTER TABLE public.discounts ADD COLUMN reservation_id uuid;
  ELSE
    BEGIN
      ALTER TABLE public.discounts ALTER COLUMN reservation_id TYPE uuid USING reservation_id::uuid;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- payments.reservation_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='reservation_id') THEN
    ALTER TABLE public.payments ADD COLUMN reservation_id uuid;
  ELSE
    BEGIN
      ALTER TABLE public.payments ALTER COLUMN reservation_id TYPE uuid USING reservation_id::uuid;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- reservations.guest_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservations' AND column_name='guest_id') THEN
    ALTER TABLE public.reservations ADD COLUMN guest_id uuid;
  ELSE
    BEGIN
      ALTER TABLE public.reservations ALTER COLUMN guest_id TYPE uuid USING guest_id::uuid;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- reservations.room_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservations' AND column_name='room_id') THEN
    ALTER TABLE public.reservations ADD COLUMN room_id uuid;
  ELSE
    BEGIN
      ALTER TABLE public.reservations ALTER COLUMN room_id TYPE uuid USING room_id::uuid;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- folio_lines.reservation_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='folio_lines') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='folio_lines' AND column_name='reservation_id') THEN
      ALTER TABLE public.folio_lines ADD COLUMN reservation_id uuid;
    ELSE
      BEGIN
        ALTER TABLE public.folio_lines ALTER COLUMN reservation_id TYPE uuid USING reservation_id::uuid;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  -- hk_tasks.room_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hk_tasks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hk_tasks' AND column_name='room_id') THEN
      ALTER TABLE public.hk_tasks ADD COLUMN room_id uuid;
    ELSE
      BEGIN
        ALTER TABLE public.hk_tasks ALTER COLUMN room_id TYPE uuid USING room_id::uuid;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  -- tickets.room_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tickets') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='room_id') THEN
      ALTER TABLE public.tickets ADD COLUMN room_id uuid;
    ELSE
      BEGIN
        ALTER TABLE public.tickets ALTER COLUMN room_id TYPE uuid USING room_id::uuid;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 2. Apply CASCADE / SET NULL foreign key constraints safely
DO $$ 
BEGIN
  -- reservations -> guests
  BEGIN
    ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_guest_id_fkey;
    ALTER TABLE public.reservations ADD CONSTRAINT reservations_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- reservations -> rooms
  BEGIN
    ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_room_id_fkey;
    ALTER TABLE public.reservations ADD CONSTRAINT reservations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- payments -> reservations
  BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_reservation_id_fkey;
    ALTER TABLE public.payments ADD CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- discounts -> reservations
  BEGIN
    ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_reservation_id_fkey;
    ALTER TABLE public.discounts ADD CONSTRAINT discounts_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- folio_lines -> reservations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='folio_lines') THEN
    BEGIN
      ALTER TABLE public.folio_lines DROP CONSTRAINT IF EXISTS folio_lines_reservation_id_fkey;
      ALTER TABLE public.folio_lines ADD CONSTRAINT folio_lines_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- hk_tasks -> rooms
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hk_tasks') THEN
    BEGIN
      ALTER TABLE public.hk_tasks DROP CONSTRAINT IF EXISTS hk_tasks_room_id_fkey;
      ALTER TABLE public.hk_tasks ADD CONSTRAINT hk_tasks_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- tickets -> rooms
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tickets') THEN
    BEGIN
      ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_room_id_fkey;
      ALTER TABLE public.tickets ADD CONSTRAINT tickets_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
