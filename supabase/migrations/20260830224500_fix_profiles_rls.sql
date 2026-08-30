-- Fix Row Level Security policies for profiles table so staff can be read and managed
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.profiles;

CREATE POLICY "Allow all access to profiles" ON public.profiles 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
