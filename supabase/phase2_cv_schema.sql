-- ============================================================
-- PHASE 2 — CV/Portfolio data model
-- ============================================================
-- Three tables:
--   cv_profiles  — 1 row per user: hero content + CTA + theme
--   cv_sections  — the sections a user has added, ordered
--   cv_items     — entries within a section (a job, a project…)
--
-- Item shapes differ per section type (a job has dates + company;
-- a project has an image + tech tags), so `data` is jsonb rather
-- than seven near-duplicate tables. The dashboard enforces shape;
-- the DB stays flexible for future fields without migrations.
--
-- SAFETY: purely additive. Nothing existing is touched.
-- ============================================================


-- ------------------------------------------------------------
-- 1. cv_profiles — the hero / identity of a CV
-- ------------------------------------------------------------
create table if not exists public.cv_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tagline text,
  bio text,
  hero_photo_url text,
  location text,
  -- primary call-to-action shown in the hero
  cta_label text,
  cta_type text check (cta_type in ('email', 'link', 'scroll')),
  cta_destination text,
  -- design (kept separate from link_page_settings — different product)
  accent_color text,
  font_choice text,
  wallpaper_preset text,
  density text check (density in ('comfortable', 'compact')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cv_profiles enable row level security;

create policy "cv profiles are public"
  on public.cv_profiles for select using (true);

create policy "users insert own cv profile"
  on public.cv_profiles for insert with check (auth.uid() = user_id);

create policy "users update own cv profile"
  on public.cv_profiles for update using (auth.uid() = user_id);

create policy "users delete own cv profile"
  on public.cv_profiles for delete using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 2. cv_sections — which sections exist, in what order
-- ------------------------------------------------------------
create table if not exists public.cv_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in (
    'about', 'experience', 'education', 'projects',
    'skills', 'certifications', 'contact'
  )),
  position int default 0,
  visible boolean default true,
  custom_title text,
  created_at timestamptz default now(),
  -- a user has at most one section of each type
  unique (user_id, type)
);

create index if not exists cv_sections_user_idx
  on public.cv_sections(user_id, position);

alter table public.cv_sections enable row level security;

create policy "cv sections are public"
  on public.cv_sections for select using (true);

create policy "users insert own cv sections"
  on public.cv_sections for insert with check (auth.uid() = user_id);

create policy "users update own cv sections"
  on public.cv_sections for update using (auth.uid() = user_id);

create policy "users delete own cv sections"
  on public.cv_sections for delete using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 3. cv_items — the entries inside each section
-- ------------------------------------------------------------
-- user_id is denormalised here on purpose: RLS policies can then
-- check ownership directly without a subquery to cv_sections,
-- which keeps the policies simple and fast.
create table if not exists public.cv_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.cv_sections(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  data jsonb not null default '{}'::jsonb,
  position int default 0,
  visible boolean default true,
  created_at timestamptz default now()
);

create index if not exists cv_items_section_idx
  on public.cv_items(section_id, position);

alter table public.cv_items enable row level security;

create policy "cv items are public"
  on public.cv_items for select using (true);

create policy "users insert own cv items"
  on public.cv_items for insert with check (auth.uid() = user_id);

create policy "users update own cv items"
  on public.cv_items for update using (auth.uid() = user_id);

create policy "users delete own cv items"
  on public.cv_items for delete using (auth.uid() = user_id);
