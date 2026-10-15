-- ============================================================
-- PHASE 1 — Product activation + reserved usernames
-- ============================================================
-- Option B architecture: the Links product's routes are NOT
-- touched. `/username` and `/dashboard` stay exactly as they
-- are. Only new, additive paths are introduced for the CV
-- product (/cv/*), so no existing shared link can break.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Which products has each user activated?
-- ------------------------------------------------------------
create table if not exists public.user_products (
  user_id uuid references public.profiles(id) on delete cascade,
  product text not null check (product in ('links', 'cv')),
  activated_at timestamptz default now(),
  primary key (user_id, product)
);

alter table public.user_products enable row level security;

create policy "user products are public"
  on public.user_products for select using (true);

create policy "users activate own products"
  on public.user_products for insert
  with check (auth.uid() = user_id);

create policy "users deactivate own products"
  on public.user_products for delete
  using (auth.uid() = user_id);

-- Backfill: everyone who already exists has the Links product.
insert into public.user_products (user_id, product)
select id, 'links' from public.profiles
on conflict do nothing;

-- New signups get the Links product by default (they arrive via
-- the existing link-in-bio onboarding).
create or replace function public.handle_new_profile_products()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_products (user_id, product)
  values (new.id, 'links')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_products on public.profiles;
create trigger on_profile_created_products
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_products();


-- ------------------------------------------------------------
-- 2. Reserved usernames  ⚠️ CHECK THE SELECT BEFORE THE ALTER ⚠️
-- ------------------------------------------------------------
-- There is currently NO reserved-username protection, so a user
-- could already hold a name that collides with a route — e.g.
-- 'cv' would shadow the new /cv/* paths, and 'login'/'dashboard'
-- are already latent collisions with existing routes.

-- STEP 1: does anyone already hold a reserved name?
-- Expect ZERO rows. If any come back, contact those users and
-- rename them BEFORE running STEP 2 (the constraint will fail
-- otherwise, which is the safe outcome — it won't delete anyone).
select id, username, created_at
from public.profiles
where username in (
  'cv', 'links', 'login', 'logout', 'signup', 'register',
  'dashboard', 'onboarding', 'auth', 'api', 'admin', 'settings',
  'about', 'help', 'support', 'terms', 'privacy', 'pricing',
  'explore', 'search', 'new', 'edit', 'static', '_next', 'assets'
);

-- STEP 2: only after STEP 1 returns nothing, enforce it going forward.
alter table public.profiles
  drop constraint if exists profiles_username_not_reserved;

alter table public.profiles
  add constraint profiles_username_not_reserved
  check (username not in (
    'cv', 'links', 'login', 'logout', 'signup', 'register',
    'dashboard', 'onboarding', 'auth', 'api', 'admin', 'settings',
    'about', 'help', 'support', 'terms', 'privacy', 'pricing',
    'explore', 'search', 'new', 'edit', 'static', '_next', 'assets'
  ));
