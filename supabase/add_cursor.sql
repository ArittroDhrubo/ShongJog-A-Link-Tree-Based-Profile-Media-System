-- Independent cursor/pointer option for public pages.
alter table public.profiles
  add column if not exists cursor_style text;
