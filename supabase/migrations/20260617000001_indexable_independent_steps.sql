-- Indexable tracker: make the three steps INDEPENDENT.
--
-- Unlike the Fax tracker (a strict sequential workflow where step 2 only opens
-- after step 1 fails, etc.), Indexable work lets the associate jump straight to
-- any step — e.g. reupload the indexable (step 3) without first marking steps 1
-- and 2 as failed. So overall_status must resolve on ANY step succeeding rather
-- than requiring the prior steps to have failed.
--
-- Precedence (order-independent across steps):
--   1. Resolved  — any step Successfully Sent (label by the latest such step)
--   2. Waiting   — no success, but some step Waiting (label by the latest)
--   3. Failed    — no success/waiting, but some step Failed
--   4. Pending   — nothing actioned yet
--
-- A generated column can't be altered in place, so drop and re-add it.

ALTER TABLE public.indexable_tracker DROP COLUMN IF EXISTS overall_status;

ALTER TABLE public.indexable_tracker
  ADD COLUMN overall_status TEXT GENERATED ALWAYS AS (
    CASE
      -- Resolved if ANY step was Successfully Sent. Label by the latest success.
      WHEN step3 = 'Successfully Sent' THEN 'Resolved – Reupload Indexable #'
      WHEN step2 = 'Successfully Sent' THEN 'Resolved – Refax New #'
      WHEN step1 = 'Successfully Sent' THEN 'Resolved – Refax Same #'
      -- No success: surface any Waiting step (latest first).
      WHEN step3 = 'Waiting' THEN 'Waiting – Reupload Indexable #'
      WHEN step2 = 'Waiting' THEN 'Waiting – Refax New #'
      WHEN step1 = 'Waiting' THEN 'Waiting – Refax Same #'
      -- No success or waiting, but at least one failure → all attempted failed.
      WHEN step1 = 'Failed' OR step2 = 'Failed' OR step3 = 'Failed' THEN 'All Steps Failed'
      ELSE 'Pending'
    END
  ) STORED;
