CREATE TABLE public.audit_logs (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event      TEXT        NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit logs
CREATE POLICY "Users can read own audit_logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts are allowed only for the authenticated user's own rows
CREATE POLICY "Users can insert own audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No updates or deletes — audit logs are append-only
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
