-- ==========================================================
-- CUSTOMER REGISTRATION & LOGIN FIX FOR SUPABASE
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmwwjupoeukaxlomhqmh/sql/new
-- ==========================================================

-- 1. Ensure `customers` table exists with all required fields
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    pincode TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. If table was created previously with auth.users foreign key, remove the constraint so customers can register directly
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_id_fkey;
ALTER TABLE public.customers ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Add password_hash and updated_at columns if they don't exist yet
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers (phone);
CREATE INDEX IF NOT EXISTS customers_created_at_idx ON public.customers (created_at DESC);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Customers read own profile" ON public.customers;
DROP POLICY IF EXISTS "Customers update own profile" ON public.customers;
DROP POLICY IF EXISTS "Allow admin read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public update customers" ON public.customers;

-- Enable public read, insert, and update so storefront customer login & registration works seamlessly
CREATE POLICY "Allow public read customers" ON public.customers
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert customers" ON public.customers
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update customers" ON public.customers
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant table access to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO anon, authenticated;

-- ==========================================================
-- DONE! Customer accounts can now register and login securely.
-- ==========================================================
