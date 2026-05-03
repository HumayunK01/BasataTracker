-- Add user_id column to daily_logs
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make log_date unique per user (not globally) — drop old constraint first
ALTER TABLE public.daily_logs DROP CONSTRAINT IF EXISTS daily_logs_log_date_key;
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_date_key UNIQUE (user_id, log_date);

-- Drop the insecure "public" policies
DROP POLICY IF EXISTS "Public read daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Public insert daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Public update daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Public delete daily_logs" ON public.daily_logs;

-- Create proper per-user RLS policies
CREATE POLICY "Users can read own daily_logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Add index on user_id for query performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs(user_id);
