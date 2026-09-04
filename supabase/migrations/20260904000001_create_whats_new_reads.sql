-- What's New read receipts. Changelog entries live in client code; this table
-- stores which entries each user has opened so read state follows the user
-- across devices (a shared workstation never clears a colleague's list).
CREATE TABLE IF NOT EXISTS public.whats_new_reads (
  user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id TEXT        NOT NULL,
  read_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entry_id)
);

ALTER TABLE public.whats_new_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own whats new reads"
  ON public.whats_new_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whats new reads"
  ON public.whats_new_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own whats new reads"
  ON public.whats_new_reads FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_whats_new_reads_entry
  ON public.whats_new_reads(entry_id);