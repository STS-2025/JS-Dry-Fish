-- =========================================================================
-- SQL MIGRATION: Add All Product Fields as Individual Columns to 'products' table
-- =========================================================================
-- Run this in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- This adds all fields from the Add New Product form to public.products,
-- and automatically populates them from existing product_json data.
-- =========================================================================

-- 1. Add all product fields as individual columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_ta TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS img TEXT,
  ADD COLUMN IF NOT EXISTS base_price_250g NUMERIC,
  ADD COLUMN IF NOT EXISTS base_mrp_250g NUMERIC,
  ADD COLUMN IF NOT EXISTS stock NUMERIC,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bone_type TEXT,
  ADD COLUMN IF NOT EXISTS salt TEXT,
  ADD COLUMN IF NOT EXISTS desc_en TEXT,
  ADD COLUMN IF NOT EXISTS desc_ta TEXT,
  ADD COLUMN IF NOT EXISTS available_packs JSONB,
  ADD COLUMN IF NOT EXISTS pack_prices JSONB,
  ADD COLUMN IF NOT EXISTS pack_mrp_prices JSONB;

-- 2. Populate columns for all existing product rows from product_json (using jsonb for 100% type safety)
UPDATE public.products
SET
  name_en = COALESCE(name_en, (product_json::jsonb->>'nameEn')),
  name_ta = COALESCE(name_ta, (product_json::jsonb->>'nameTa')),
  category = COALESCE(category, (product_json::jsonb->>'category')),
  img = COALESCE(img, (product_json::jsonb->>'img')),
  base_price_250g = COALESCE(
    base_price_250g, 
    NULLIF(product_json::jsonb->>'basePrice250g', '')::numeric, 
    NULLIF(product_json::jsonb->>'packPrice', '')::numeric
  ),
  base_mrp_250g = COALESCE(
    base_mrp_250g, 
    NULLIF(product_json::jsonb->>'baseMrp250g', '')::numeric, 
    NULLIF(product_json::jsonb->>'packMrpPrice', '')::numeric
  ),
  stock = COALESCE(
    stock, 
    NULLIF(product_json::jsonb->>'stock', '')::numeric
  ),
  rating = COALESCE(
    rating, 
    NULLIF(product_json::jsonb->>'rating', '')::numeric, 
    0
  ),
  reviews = COALESCE(
    reviews, 
    NULLIF(product_json::jsonb->>'reviews', '')::int, 
    0
  ),
  bone_type = COALESCE(bone_type, (product_json::jsonb->>'boneType')),
  salt = COALESCE(salt, (product_json::jsonb->>'salt')),
  desc_en = COALESCE(desc_en, (product_json::jsonb->>'descEn')),
  desc_ta = COALESCE(desc_ta, (product_json::jsonb->>'descTa')),
  available_packs = COALESCE(available_packs, (product_json::jsonb->'availablePacks')),
  pack_prices = COALESCE(pack_prices, (product_json::jsonb->'packPrices')),
  pack_mrp_prices = COALESCE(pack_mrp_prices, (product_json::jsonb->'packMrpPrices'))
WHERE product_json IS NOT NULL;

-- 3. Verify RLS policy allows admin and public reads
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to active products" ON public.products;
CREATE POLICY "Allow public read access to active products"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin full access to products" ON public.products;
CREATE POLICY "Allow admin full access to products"
ON public.products FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON public.products TO anon, authenticated;
