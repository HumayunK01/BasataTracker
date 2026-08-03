-- Faxed-back documents — a simple per-user list of documents that were
-- faxed back to the clinics. Unlike the trackers this is a flat CRUD list:
-- no accounts, no step workflow — just file name, patient, DOB, status, notes.
CREATE TABLE IF NOT EXISTS public.faxed_back_docs (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name    TEXT        NOT NULL,
  patient_name TEXT        NOT NULL,
  patient_dob  DATE,
  status       TEXT        NOT NULL DEFAULT 'Pending',
  notes        TEXT,
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faxed_back_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own faxed back docs"
  ON public.faxed_back_docs FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own faxed back docs"
  ON public.faxed_back_docs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own faxed back docs"
  ON public.faxed_back_docs FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own faxed back docs"
  ON public.faxed_back_docs FOR DELETE
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_faxed_back_docs_created_by
  ON public.faxed_back_docs(created_by);

CREATE TRIGGER faxed_back_docs_updated_at
  BEFORE UPDATE ON public.faxed_back_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
