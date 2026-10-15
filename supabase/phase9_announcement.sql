-- ============================================================
-- PHASE 9 — Cross-product discovery
-- ============================================================
-- One flag so the "portfolio is here" banner shows once per user
-- and never nags again after it's dismissed or acted on.
-- SAFETY: additive, nullable, defaults false. Nothing breaks.
-- ============================================================

alter table public.profiles
  add column if not exists seen_cv_announcement boolean default false;
