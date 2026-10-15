-- Run this in Supabase SQL Editor to add cover-photo support.
-- (Only needed if you already ran the original schema.sql — safe to run once.)

alter table public.profiles
  add column if not exists cover_image_url text;
