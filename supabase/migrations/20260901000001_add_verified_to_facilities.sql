-- Admin-verifiable flag shown as a green tick on facility cards.
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
