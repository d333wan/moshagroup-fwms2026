ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nik text,
  ADD COLUMN IF NOT EXISTS address text;