-- Optional street address for facilities (distinguishes multiple locations).
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS address TEXT;
