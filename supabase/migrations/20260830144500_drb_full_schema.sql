-- DRB Full Application Schema
-- Drops existing tables if they exist to start fresh as per Phase 1

DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS cleaning_tasks CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS party_hall CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles (Staff Roles)
CREATE TABLE profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name text NOT NULL,
    phone text,
    role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'GM', 'FRONT_DESK')),
    status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at timestamptz DEFAULT now()
);

-- 2. Room Types
CREATE TABLE room_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL, -- Standard, Deluxe, Premium, etc.
    description text,
    status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at timestamptz DEFAULT now()
);

-- 3. Rooms
CREATE TABLE rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_number text UNIQUE NOT NULL,
    room_name text,
    room_type_id uuid REFERENCES room_types(id),
    capacity integer NOT NULL CHECK (capacity > 0),
    floor text,
    location text, -- Building A, East Wing, etc.
    price numeric NOT NULL DEFAULT 0,
    amenities jsonb DEFAULT '[]'::jsonb,
    photos jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'OCCUPIED', 'DIRTY', 'CLEANING', 'INSPECTION', 'MAINTENANCE', 'OUT OF SERVICE')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 4. Guests
CREATE TABLE guests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    id_type text,
    id_number text,
    emergency_contact text,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 5. Party Hall
CREATE TABLE party_hall (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL DEFAULT 'DRB Party Hall',
    description text,
    capacity integer NOT NULL DEFAULT 150,
    location text,
    hourly_rate numeric,
    half_day_rate numeric,
    full_day_rate numeric,
    facilities jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at timestamptz DEFAULT now()
);

-- Initialize the single party hall
INSERT INTO party_hall (name, capacity, location, half_day_rate, full_day_rate) 
VALUES ('DRB Party Hall', 150, 'Ground Floor', 15000, 25000);

-- 6. Reservations (Rooms & Hall)
CREATE TABLE reservations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id uuid REFERENCES guests(id),
    resource_type text NOT NULL CHECK (resource_type IN ('ROOM', 'PARTY_HALL')),
    room_id uuid REFERENCES rooms(id), -- Null if Party Hall
    party_hall_id uuid REFERENCES party_hall(id), -- Null if Room
    event_type text, -- For party hall
    number_of_guests integer,
    booking_date date NOT NULL,
    start_time timestamptz,
    end_time timestamptz,
    base_amount numeric NOT NULL DEFAULT 0,
    additional_charges numeric DEFAULT 0,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'OCCUPIED', 'ONGOING', 'COMPLETED', 'CANCELLED')),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 7. Payments
CREATE TABLE payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
    total_amount numeric NOT NULL,
    paid_amount numeric DEFAULT 0,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'COMPLETED', 'FROZEN')),
    payment_method text CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 8. Discounts
CREATE TABLE discounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
    requested_by uuid REFERENCES profiles(id),
    requested_amount numeric NOT NULL,
    approved_amount numeric,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    approved_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

-- 9. Cleaning Tasks
CREATE TABLE cleaning_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    assigned_to uuid REFERENCES profiles(id),
    status text DEFAULT 'DIRTY' CHECK (status IN ('DIRTY', 'CLEANING', 'INSPECTION', 'AVAILABLE')),
    checklist jsonb DEFAULT '{"bed": false, "bathroom": false, "floor": false}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 10. Expenses
CREATE TABLE expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL CHECK (category IN ('Electricity', 'Water', 'Maintenance', 'Cleaning', 'Salaries', 'Supplies', 'Internet', 'Repairs', 'Other')),
    amount numeric NOT NULL,
    description text,
    logged_by uuid REFERENCES profiles(id),
    expense_date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now()
);

-- RLS setup (Example policies for discounts as per business rules)
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admins can update discounts" ON discounts
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );
CREATE POLICY "Everyone can read discounts" ON discounts
    FOR SELECT USING (true);
CREATE POLICY "Everyone can insert discounts" ON discounts
    FOR INSERT WITH CHECK (true);

-- Enable RLS on other tables (allow read/write for authenticated users for now)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Super Admins manage profiles" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read room_types" ON room_types FOR SELECT USING (true);
CREATE POLICY "All manage room_types" ON room_types FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "All manage rooms" ON rooms FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read guests" ON guests FOR SELECT USING (true);
CREATE POLICY "All manage guests" ON guests FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE party_hall ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read party_hall" ON party_hall FOR SELECT USING (true);
CREATE POLICY "All manage party_hall" ON party_hall FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reservations" ON reservations FOR SELECT USING (true);
CREATE POLICY "All manage reservations" ON reservations FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "All manage payments" ON payments FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cleaning_tasks" ON cleaning_tasks FOR SELECT USING (true);
CREATE POLICY "All manage cleaning_tasks" ON cleaning_tasks FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "All manage expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');

-- Function to handle new user signups and default them to SUPER_ADMIN (just for setup)
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'SUPER_ADMIN')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
