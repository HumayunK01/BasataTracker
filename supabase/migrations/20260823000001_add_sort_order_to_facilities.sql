-- Add sort_order for manual drag-to-reorder
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: order by created_at so existing facilities have deterministic order
UPDATE public.facilities
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.facilities
) sub
WHERE facilities.id = sub.id;

CREATE INDEX IF NOT EXISTS idx_facilities_sort_order ON public.facilities(sort_order);