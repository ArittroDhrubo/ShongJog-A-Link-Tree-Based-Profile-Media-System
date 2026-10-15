-- ============================================================
-- PHASE 0b — Backfill + VERIFY (still no destructive changes)
-- ============================================================
-- Run STEP 1, then run STEP 2 and read the results carefully.
-- Do NOT proceed to Phase 0c until STEP 2 shows all-clear.
-- ============================================================


-- ------------------------------------------------------------
-- STEP 1: copy existing design settings out of profiles
-- ------------------------------------------------------------
-- Idempotent: safe to run more than once. Existing rows are
-- updated rather than duplicated.

insert into public.link_page_settings (
  user_id, wallpaper_preset, accent_color, button_style,
  font_choice, cursor_style, cover_image_url, cover_video_url
)
select
  id, wallpaper_preset, accent_color, button_style,
  font_choice, cursor_style, cover_image_url, cover_video_url
from public.profiles
on conflict (user_id) do update set
  wallpaper_preset = excluded.wallpaper_preset,
  accent_color     = excluded.accent_color,
  button_style     = excluded.button_style,
  font_choice      = excluded.font_choice,
  cursor_style     = excluded.cursor_style,
  cover_image_url  = excluded.cover_image_url,
  cover_video_url  = excluded.cover_video_url;


-- ------------------------------------------------------------
-- STEP 2: VERIFY — every check must pass before Phase 0c
-- ------------------------------------------------------------

-- 2.1 Row counts must match exactly.
--     Expect: profiles_count = settings_count, missing_rows = 0
select
  (select count(*) from public.profiles)           as profiles_count,
  (select count(*) from public.link_page_settings) as settings_count,
  (select count(*) from public.profiles p
     left join public.link_page_settings s on s.user_id = p.id
     where s.user_id is null)                      as missing_rows;

-- 2.2 Every value must match between old and new location.
--     Expect: ZERO rows returned. Any row = a copy mismatch.
select
  p.id,
  p.username,
  p.wallpaper_preset as old_wallpaper, s.wallpaper_preset as new_wallpaper,
  p.accent_color     as old_accent,    s.accent_color     as new_accent,
  p.button_style     as old_button,    s.button_style     as new_button,
  p.font_choice      as old_font,      s.font_choice      as new_font,
  p.cursor_style     as old_cursor,    s.cursor_style     as new_cursor,
  p.cover_image_url  as old_cover,     s.cover_image_url  as new_cover,
  p.cover_video_url  as old_video,     s.cover_video_url  as new_video
from public.profiles p
join public.link_page_settings s on s.user_id = p.id
where
  p.wallpaper_preset is distinct from s.wallpaper_preset or
  p.accent_color     is distinct from s.accent_color     or
  p.button_style     is distinct from s.button_style     or
  p.font_choice      is distinct from s.font_choice      or
  p.cursor_style     is distinct from s.cursor_style     or
  p.cover_image_url  is distinct from s.cover_image_url  or
  p.cover_video_url  is distinct from s.cover_video_url;

-- 2.3 Sanity check — eyeball your own profile's settings side by side.
--     Expect: the new_* values match what you see on your live page.
select
  p.username,
  s.wallpaper_preset, s.accent_color, s.button_style,
  s.font_choice, s.cursor_style,
  (s.cover_image_url is not null) as has_cover_photo,
  (s.cover_video_url is not null) as has_cover_video
from public.profiles p
join public.link_page_settings s on s.user_id = p.id
order by p.username;
