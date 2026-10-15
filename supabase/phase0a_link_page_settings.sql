-- ============================================================
-- PHASE 0a — Create link_page_settings (ADDITIVE ONLY)
-- ============================================================
-- Splits the Links product's design settings out of `profiles`,
-- so `profiles` holds only account-level identity. This is the
-- groundwork for a second product (CV) that needs its own,
-- separate settings table.
--
-- SAFETY: this migration ONLY creates. It does not modify or drop
-- anything on `profiles`. Running it changes nothing for users.
-- Old columns stay in place until Phase 0d, days later.
-- ============================================================

create table if not exists public.link_page_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wallpaper_preset text,
  accent_color text,
  button_style text,
  font_choice text,
  cursor_style text,
  cover_image_url text,
  cover_video_url text,
  updated_at timestamptz default now()
);

alter table public.link_page_settings enable row level security;

-- Mirrors the profiles policies exactly:
-- public read (public pages must render these settings for logged-out visitors)
create policy "link page settings are public"
  on public.link_page_settings for select using (true);

-- owner-only writes
create policy "users insert own link page settings"
  on public.link_page_settings for insert
  with check (auth.uid() = user_id);

create policy "users update own link page settings"
  on public.link_page_settings for update
  using (auth.uid() = user_id);

create policy "users delete own link page settings"
  on public.link_page_settings for delete
  using (auth.uid() = user_id);

-- Every existing and future profile needs a settings row. The app uses
-- upsert, but a trigger guarantees the row exists even if a profile is
-- created by some other path (e.g. the signup trigger).
create or replace function public.handle_new_profile_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.link_page_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_settings on public.profiles;
create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_settings();
