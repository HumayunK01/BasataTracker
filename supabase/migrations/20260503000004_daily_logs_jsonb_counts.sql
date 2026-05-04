-- Migrate daily_logs from 6 fixed columns to a single JSONB counts column.
-- The existing 6 columns are merged into counts, then dropped.

-- 1. Add the new column
ALTER TABLE public.daily_logs ADD COLUMN IF NOT EXISTS counts JSONB NOT NULL DEFAULT '{}';

-- 2. Backfill: merge all 6 fixed columns into counts (skip zeros to keep objects lean)
UPDATE public.daily_logs SET counts = (
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'worked_on_ng',    NULLIF(worked_on_ng,    0),
    'moved_to_indexing', NULLIF(moved_to_indexing, 0),
    'ekg',             NULLIF(ekg,             0),
    'cath_lab',        NULLIF(cath_lab,        0),
    'roi',             NULLIF(roi,             0),
    'fax_back',        NULLIF(fax_back,        0)
  ))
) || COALESCE(extra, '{}');

-- 3. Drop the old fixed columns and the extra column
ALTER TABLE public.daily_logs
  DROP COLUMN IF EXISTS worked_on_ng,
  DROP COLUMN IF EXISTS moved_to_indexing,
  DROP COLUMN IF EXISTS ekg,
  DROP COLUMN IF EXISTS cath_lab,
  DROP COLUMN IF EXISTS roi,
  DROP COLUMN IF EXISTS fax_back,
  DROP COLUMN IF EXISTS extra;

-- 4. Index for efficient key-based queries on counts
CREATE INDEX IF NOT EXISTS idx_daily_logs_counts ON public.daily_logs USING gin(counts);
