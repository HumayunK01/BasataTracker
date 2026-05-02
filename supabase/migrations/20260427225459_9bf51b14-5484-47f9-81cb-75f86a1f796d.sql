-- Drop the old table
DROP TABLE IF EXISTS public.work_entries CASCADE;

-- Create the new daily_logs table matching the Excel format
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_date DATE NOT NULL UNIQUE,
  worked_on_ng INTEGER NOT NULL DEFAULT 0,
  moved_to_indexing INTEGER NOT NULL DEFAULT 0,
  ekg INTEGER NOT NULL DEFAULT 0,
  cath_lab INTEGER NOT NULL DEFAULT 0,
  roi INTEGER NOT NULL DEFAULT 0,
  fax_back INTEGER NOT NULL DEFAULT 0,
  is_off_day BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read daily_logs" ON public.daily_logs FOR SELECT USING (true);
CREATE POLICY "Public insert daily_logs" ON public.daily_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update daily_logs" ON public.daily_logs FOR UPDATE USING (true);
CREATE POLICY "Public delete daily_logs" ON public.daily_logs FOR DELETE USING (true);

CREATE INDEX idx_daily_logs_date ON public.daily_logs(log_date DESC);

CREATE TRIGGER daily_logs_updated_at
BEFORE UPDATE ON public.daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Import historical data from Record.xlsx
INSERT INTO public.daily_logs (log_date, worked_on_ng, moved_to_indexing, ekg, cath_lab, roi, fax_back, is_off_day) VALUES
('2026-03-07', 0, 0, 0, 0, 0, 0, true),
('2026-03-08', 0, 0, 0, 0, 0, 0, true),
('2026-03-09', 0, 0, 110, 0, 0, 0, false),
('2026-03-10', 0, 80, 0, 0, 0, 0, false),
('2026-03-11', 0, 115, 0, 0, 0, 0, false),
('2026-03-12', 0, 0, 158, 4, 0, 0, false),
('2026-03-13', 0, 50, 17, 0, 0, 0, false),
('2026-03-14', 0, 0, 0, 0, 0, 0, true),
('2026-03-15', 0, 0, 0, 0, 0, 0, true),
('2026-03-16', 0, 50, 47, 0, 0, 0, false),
('2026-03-17', 0, 130, 0, 0, 0, 0, false),
('2026-03-18', 0, 92, 30, 0, 0, 0, false),
('2026-03-19', 0, 110, 95, 0, 0, 0, false),
('2026-03-20', 0, 79, 140, 0, 0, 0, false),
('2026-03-21', 0, 0, 0, 0, 0, 0, true),
('2026-03-22', 0, 0, 0, 0, 0, 0, true),
('2026-03-23', 0, 95, 0, 0, 0, 0, false),
('2026-03-24', 0, 40, 60, 6, 0, 0, false),
('2026-03-25', 0, 105, 30, 0, 0, 0, false),
('2026-03-26', 0, 185, 50, 0, 0, 0, false),
('2026-03-27', 0, 50, 70, 0, 0, 0, false),
('2026-03-28', 0, 0, 0, 0, 0, 0, true),
('2026-03-29', 0, 0, 0, 0, 0, 0, true),
('2026-03-30', 0, 40, 0, 0, 0, 0, false),
('2026-03-31', 0, 46, 0, 0, 0, 0, false),
('2026-04-01', 80, 47, 0, 0, 0, 0, false),
('2026-04-02', 46, 26, 60, 4, 0, 0, false),
('2026-04-03', 45, 8, 0, 0, 0, 0, false),
('2026-04-04', 0, 0, 0, 0, 0, 0, true),
('2026-04-05', 0, 0, 0, 0, 0, 0, true),
('2026-04-06', 42, 13, 0, 0, 0, 0, false),
('2026-04-07', 58, 20, 0, 0, 0, 0, false),
('2026-04-08', 45, 28, 16, 0, 0, 0, false),
('2026-04-09', 68, 37, 0, 7, 0, 0, false),
('2026-04-10', 42, 10, 0, 0, 7, 0, false),
('2026-04-11', 0, 0, 0, 0, 0, 0, true),
('2026-04-12', 0, 0, 0, 0, 0, 0, true),
('2026-04-13', 48, 7, 58, 0, 0, 0, false),
('2026-04-14', 68, 12, 0, 0, 5, 0, false),
('2026-04-15', 16, 5, 0, 0, 9, 24, false),
('2026-04-16', 55, 23, 0, 7, 0, 12, false),
('2026-04-17', 26, 8, 82, 0, 0, 14, false),
('2026-04-18', 0, 0, 0, 0, 0, 0, true),
('2026-04-19', 0, 0, 0, 0, 0, 0, true),
('2026-04-20', 100, 9, 15, 0, 0, 0, false),
('2026-04-21', 67, 20, 0, 0, 5, 0, false),
('2026-04-22', 112, 25, 15, 0, 0, 0, false),
('2026-04-23', 37, 7, 90, 6, 0, 0, false),
('2026-04-24', 28, 7, 0, 0, 0, 0, false),
('2026-04-25', 0, 0, 0, 0, 0, 0, true),
('2026-04-26', 0, 0, 0, 0, 0, 0, true),
('2026-04-27', 55, 15, 0, 0, 0, 0, false);