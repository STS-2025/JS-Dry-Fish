-- ============================================================================
-- Wholesale & Commercial Bulk Quote Requests Table & Permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wholesale_requests (
  id TEXT PRIMARY KEY,
  business_name TEXT,
  phone TEXT,
  quantity TEXT,
  city TEXT,
  requirements TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  request_json JSONB
);

-- Grant table privileges to public anon and authenticated roles
GRANT ALL ON TABLE public.wholesale_requests TO anon, authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE public.wholesale_requests ENABLE ROW LEVEL SECURITY;

-- 1. Public insert: Any customer/visitor can submit a wholesale request
DROP POLICY IF EXISTS "Allow public insert to wholesale_requests" ON public.wholesale_requests;
CREATE POLICY "Allow public insert to wholesale_requests"
ON public.wholesale_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Read access: Allow admin and public readers to fetch requests
DROP POLICY IF EXISTS "Allow read access to wholesale_requests" ON public.wholesale_requests;
CREATE POLICY "Allow read access to wholesale_requests"
ON public.wholesale_requests
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Update access: Allow status updates (e.g. Pending -> Contacted -> Quoted)
DROP POLICY IF EXISTS "Allow update to wholesale_requests" ON public.wholesale_requests;
CREATE POLICY "Allow update to wholesale_requests"
ON public.wholesale_requests
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Delete access: Allow admins to remove requests
DROP POLICY IF EXISTS "Allow delete from wholesale_requests" ON public.wholesale_requests;
CREATE POLICY "Allow delete from wholesale_requests"
ON public.wholesale_requests
FOR DELETE
TO anon, authenticated
USING (true);
