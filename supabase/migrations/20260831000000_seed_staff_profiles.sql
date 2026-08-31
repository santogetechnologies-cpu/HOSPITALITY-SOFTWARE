-- Ensure profiles table has proper schema and permissions, and seed default staff profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS pin text;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'FRONT_DESK';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE';

-- Drop foreign key to auth.users so staff roster can be managed independently
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop any restrictive check constraints on profiles table
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Make sure RLS is open for profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Allow all access to profiles" ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert initial staff roster using valid UUIDs if not already present
INSERT INTO public.profiles (id, name, email, phone, role, status, pin)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'DRB Hotel Admin', 'drbhoteladmin@drb.com', '+91 98765 00001', 'SUPER_ADMIN', 'ACTIVE', 'admin123'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Rajesh Sharma', 'gm@drbhotel.com', '+91 98765 43210', 'GM', 'ACTIVE', 'gm2026'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Priya Sharma', 'priya.desk@drbhotel.com', '+91 98765 43211', 'FRONT_DESK', 'ACTIVE', 'desk101'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'Amit Verma', 'amit.desk@drbhotel.com', '+91 98765 43212', 'FRONT_DESK', 'ACTIVE', 'desk102'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Sunita Mehra', 'sunita.hk@drbhotel.com', '+91 98765 43213', 'FRONT_DESK', 'ACTIVE', 'hk103'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Karan Patel', 'karan.patel@drbhotel.com', '+91 98765 43214', 'FRONT_DESK', 'INACTIVE', 'karan2026')
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  pin = EXCLUDED.pin;
