-- Live (video) wallpaper support for public pages.
alter table public.profiles
  add column if not exists cover_video_url text;
