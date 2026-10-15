-- ============================================================
-- PHASE A — template system + project slugs
-- ============================================================
-- SAFETY: purely additive, both nullable with defaults. Existing
-- CVs get template_id = 'aurora', which is defined to reproduce
-- the current look — nobody's page changes until they choose a
-- different template.
-- ============================================================

alter table public.cv_profiles
  add column if not exists template_id text default 'aurora';

-- Slug for project detail pages (/cv/[username]/projects/[slug]).
-- Lives on the row, not inside `data`, so it can be indexed and
-- uniqueness enforced per user.
alter table public.cv_items
  add column if not exists slug text;

-- Two projects of the same user can't share a slug (URLs must resolve
-- to exactly one project). Partial index: only applies where a slug
-- exists, so non-project items are unaffected.
create unique index if not exists cv_items_user_slug_idx
  on public.cv_items (user_id, slug)
  where slug is not null;
