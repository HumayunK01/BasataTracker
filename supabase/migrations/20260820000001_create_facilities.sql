-- Facilities reference table: public read for all users, admin-only writes.
-- Applied to the live project via the SQL editor; this file is the source of truth.
CREATE TABLE IF NOT EXISTS public.facilities (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  logo_url   TEXT,
  fax_number TEXT        NOT NULL,
  created_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can view facility fax numbers.
DROP POLICY IF EXISTS "Anyone can view facilities" ON public.facilities;
CREATE POLICY "Anyone can view facilities"
  ON public.facilities FOR SELECT
  USING (true);

-- Only admins can add/edit/delete (is_admin() from 20260818000001).
DROP POLICY IF EXISTS "Admins can insert facilities" ON public.facilities;
CREATE POLICY "Admins can insert facilities"
  ON public.facilities FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update facilities" ON public.facilities;
CREATE POLICY "Admins can update facilities"
  ON public.facilities FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete facilities" ON public.facilities;
CREATE POLICY "Admins can delete facilities"
  ON public.facilities FOR DELETE
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_facilities_name ON public.facilities(name);

-- Keep updated_at fresh (same helper the other tables use).
DROP TRIGGER IF EXISTS facilities_updated_at ON public.facilities;
CREATE TRIGGER facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();