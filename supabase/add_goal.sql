-- Optional: stores which goal the user picked during onboarding
-- (Creator / Business / Personal). Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists goal text;
