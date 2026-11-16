-- ==============================================================================
-- FIX PRODUCT RATINGS RLS POLICIES FOR SUPABASE
-- Run this in Supabase SQL Editor to allow customer ratings to save cleanly
-- ==============================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.product_ratings (
    product_code TEXT NOT NULL,
    voter_id UUID NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_code, voter_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

-- 3. Drop any old or restrictive policies
DROP POLICY IF EXISTS "Allow public submit product ratings" ON public.product_ratings;
DROP POLICY IF EXISTS "Allow public read product ratings" ON public.product_ratings;
DROP POLICY IF EXISTS "Allow public update product ratings" ON public.product_ratings;
DROP POLICY IF EXISTS "Allow public all product ratings" ON public.product_ratings;
DROP POLICY IF EXISTS "Enable all for anon and authenticated" ON public.product_ratings;

-- 4. Create comprehensive policy allowing anon and authenticated to SELECT, INSERT, and UPDATE ratings
CREATE POLICY "Allow public all product ratings" ON public.product_ratings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (rating BETWEEN 1 AND 5);

-- 5. Grant table permissions to anon & authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_ratings TO anon, authenticated;

-- 6. Ensure totals table and summary view permissions
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_rating_totals') THEN
        ALTER TABLE public.product_rating_totals ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read product rating totals" ON public.product_rating_totals;
        CREATE POLICY "Allow public read product rating totals" ON public.product_rating_totals
            FOR SELECT TO anon, authenticated USING (true);
        GRANT ALL ON TABLE public.product_rating_totals TO postgres, service_role;
        GRANT SELECT ON TABLE public.product_rating_totals TO anon, authenticated;
    END IF;
END $$;
