-- "Registered" = completed the registration/onboarding flow.
-- Safe to re-run: uses IF NOT EXISTS, and the update is idempotent.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Grandfather in existing real users (anyone who already has links),
-- so they aren't locked out of login after this change.
update public.profiles
  set onboarding_completed = true
  where id in (select distinct user_id from public.links);
