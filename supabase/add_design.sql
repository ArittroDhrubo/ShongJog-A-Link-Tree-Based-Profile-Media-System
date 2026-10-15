-- Public-page design settings (Design section on the dashboard).
-- All nullable: null means "use the default look".
alter table public.profiles
  add column if not exists wallpaper_preset text,
  add column if not exists accent_color text,
  add column if not exists button_style text,
  add column if not exists font_choice text;
