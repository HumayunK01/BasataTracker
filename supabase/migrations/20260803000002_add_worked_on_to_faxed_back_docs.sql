-- Faxed-back docs are now grouped by the date the work was done.
-- Default is the day the row was added; editable afterwards.
ALTER TABLE public.faxed_back_docs
  ADD COLUMN IF NOT EXISTS worked_on DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_faxed_back_docs_worked_on
  ON public.faxed_back_docs(worked_on);
