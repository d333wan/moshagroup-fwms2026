ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS pic text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';