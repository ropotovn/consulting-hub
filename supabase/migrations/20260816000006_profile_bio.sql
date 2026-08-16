-- ============================================================
-- stabs · profile bio (optional one-liner shown in profile card)
-- ============================================================
alter table public.profiles add column if not exists bio text;
