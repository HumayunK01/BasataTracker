CREATE TABLE public.work_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  document_type TEXT NOT NULL,
  source TEXT NOT NULL,
  patient_found BOOLEAN NOT NULL DEFAULT true,
  search_source TEXT,
  status TEXT NOT NULL DEFAULT 'Indexed',
  patient_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;

-- Single-user personal app: allow all operations publicly
CREATE POLICY "Public read" ON public.work_entries FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.work_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.work_entries FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON public.work_entries FOR DELETE USING (true);

CREATE INDEX idx_work_entries_date ON public.work_entries(entry_date DESC);
CREATE INDEX idx_work_entries_status ON public.work_entries(status);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER work_entries_updated_at
BEFORE UPDATE ON public.work_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();