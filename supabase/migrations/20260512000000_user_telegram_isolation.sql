-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Telegram ID Isolation
--  2026-05-12 — Applied manually via SQL Editor
--
--  Moves telegram_id out of peace_votes into a dedicated table
--  so it is never exposed in aggregate stats/map queries.
--  All statements are idempotent (IF NOT EXISTS / IF EXISTS).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Create isolated table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_telegram (
  user_uid    TEXT PRIMARY KEY REFERENCES public.peace_votes(user_uid) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Enable RLS ─────────────────────────────────────────────────
ALTER TABLE public.user_telegram ENABLE ROW LEVEL SECURITY;

-- ── 3. Grants ─────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.user_telegram TO anon, authenticated;

-- ── 4. Migrate existing telegram_id data ─────────────────────────
-- (safe to re-run — ON CONFLICT DO NOTHING)
INSERT INTO public.user_telegram (user_uid, telegram_id)
SELECT DISTINCT ON (user_uid) user_uid, telegram_id
  FROM public.peace_votes
 WHERE telegram_id IS NOT NULL AND telegram_id <> ''
ON CONFLICT (user_uid) DO NOTHING;

-- ── 5. Drop telegram_id column from peace_votes ───────────────────
-- Recreate active_votes view without telegram_id first.
DROP VIEW IF EXISTS public.active_votes;

ALTER TABLE public.peace_votes
  DROP COLUMN IF EXISTS telegram_id;

DROP INDEX IF EXISTS public.peace_votes_telegram_id_idx;

-- ── 6. Recreate active_votes without telegram_id ─────────────────
CREATE OR REPLACE VIEW public.active_votes AS
SELECT id, country, age, gender, created_at,
       user_uid, referral_code, referred_by, source
  FROM public.peace_votes
 WHERE NOT (user_uid IN (SELECT blocked_users.user_uid FROM public.blocked_users));

-- NOTE: RLS policies on user_telegram are set by migration
-- 20260518000000_fix_user_telegram_rls.sql (tg_-prefix based, not jwt.claims.sub)
