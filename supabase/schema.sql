-- ============================================================
-- Shongjog: multi-user link-in-bio platform
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- 1. PROFILES: one row per registered user
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null
    check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text,
  bio text default '',
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. LINKS: the buttons + social icons on a profile page
create table public.links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  url text not null,
  -- 'facebook' | 'instagram' | 'whatsapp' | 'discord' | 'x'
  -- | 'linkedin' | 'email' | 'custom'
  platform text default 'custom',
  position int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index links_user_idx on public.links(user_id, position);

-- 3. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.links enable row level security;

-- Anyone (even logged out) can VIEW profiles and links -> public pages work
create policy "profiles are public"
  on public.profiles for select using (true);

create policy "links are public"
  on public.links for select using (true);

-- Only the owner can modify their own data
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "users insert own links"
  on public.links for insert with check (auth.uid() = user_id);

create policy "users update own links"
  on public.links for update using (auth.uid() = user_id);

create policy "users delete own links"
  on public.links for delete using (auth.uid() = user_id);

-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- The signup form passes { username } in user metadata; this trigger
-- turns every new auth user into a profile row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'username', 'New user')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. AVATAR STORAGE (optional, for profile pictures)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "avatar images are public"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
