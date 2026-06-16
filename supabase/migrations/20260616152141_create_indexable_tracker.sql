-- Indexable tracker — a second "Indexable" category that lives alongside the Fax
-- tracker on the same page, sharing the same accounts (fax_accounts) but keeping
-- its own patient rows. Same three-step workflow and generated overall_status.
-- Reuses the existing fax_step_status enum since the per-step statuses match.
--
-- Note: there is no indexable_accounts table — Indexable rows reference the
-- shared fax_accounts, so an account's id/name is identical in both modes.

-- ── Tracker rows ────────────────────────────────────────────────────────────
-- overall_status is a generated column derived from the three steps, matching
-- the Fax tracker's workflow:
--   * Step 1 always applies. Step 2 only after Step 1 = Failed. Step 3 only
--     after Steps 1 and 2 both Failed.
--   * The first step that is "Successfully Sent" resolves the case.
--   * A trailing " #" marks the active/relevant step for display logic; the app
--     strips it before showing the value.
CREATE TABLE IF NOT EXISTS public.indexable_tracker (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id   UUID        NOT NULL REFERENCES public.fax_accounts(id) ON DELETE CASCADE,
  patient_name TEXT        NOT NULL,
  step1        public.fax_step_status NOT NULL DEFAULT 'Pending',
  step2        public.fax_step_status,
  step3        public.fax_step_status,
  overall_status TEXT GENERATED ALWAYS AS (
    CASE
      -- Resolved at one of the steps
      WHEN step1 = 'Successfully Sent' THEN 'Resolved – Refax Same #'
      WHEN step1 = 'Failed' AND step2 = 'Successfully Sent' THEN 'Resolved – Refax New #'
      WHEN step1 = 'Failed' AND step2 = 'Failed' AND step3 = 'Successfully Sent' THEN 'Resolved – Reupload Indexable #'
      -- All three attempted and failed
      WHEN step1 = 'Failed' AND step2 = 'Failed' AND step3 = 'Failed' THEN 'All Steps Failed'
      -- Waiting on the current active step
      WHEN step1 = 'Waiting' THEN 'Waiting – Refax Same #'
      WHEN step1 = 'Failed' AND step2 = 'Waiting' THEN 'Waiting – Refax New #'
      WHEN step1 = 'Failed' AND step2 = 'Failed' AND step3 = 'Waiting' THEN 'Waiting – Reupload Indexable #'
      -- A step failed; the next one hasn't been attempted yet
      WHEN step1 = 'Failed' AND (step2 IS NULL OR step2 = 'Pending') THEN 'Move to Refax New #'
      WHEN step1 = 'Failed' AND step2 = 'Failed' AND (step3 IS NULL OR step3 = 'Pending') THEN 'Move to Reupload Indexable #'
      ELSE 'Pending'
    END
  ) STORED,
  notes        TEXT,
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indexable_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own indexable rows"
  ON public.indexable_tracker FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own indexable rows"
  ON public.indexable_tracker FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own indexable rows"
  ON public.indexable_tracker FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own indexable rows"
  ON public.indexable_tracker FOR DELETE
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_indexable_tracker_account_id
  ON public.indexable_tracker(account_id);
CREATE INDEX IF NOT EXISTS idx_indexable_tracker_created_by
  ON public.indexable_tracker(created_by);

CREATE TRIGGER indexable_tracker_updated_at
  BEFORE UPDATE ON public.indexable_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
