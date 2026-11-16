-- ==========================================================
-- FIX ORDERS RLS & PERMISSIONS IN SUPABASE
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmwwjupoeukaxlomhqmh/sql/new
-- ==========================================================

-- 1. Ensure `orders` table has public permissions for storefront customer checkout & order tracking
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO anon, authenticated;

-- 2. Clean existing restrictive policies on orders
DROP POLICY IF EXISTS "Allow public insert on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin read on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin update on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow customers read own orders" ON public.orders;

-- 3. Enable read/insert so customer order history and placement work across all domains (InfinityFree, custom domains, localhost)
CREATE POLICY "Allow public insert on orders" ON public.orders
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public read on orders" ON public.orders
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public update on orders" ON public.orders
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);
