-- Add daily_goal column to profiles for cross-device sync of the user's
-- document-count target shown on the dashboard.
alter table public.profiles
  add column daily_goal integer;

-- Existing rows keep null; the frontend falls back to localStorage, then the
-- user's working-day average.
