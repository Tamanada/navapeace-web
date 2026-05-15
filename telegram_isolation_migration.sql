-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Telegram ID Isolation Migration
--  Run ONCE in Supabase SQL Editor (Dashboard → SQL Editor)
--  DO NOT run automatically — verify data after each step.
-- ═══════════════════════════════════════════════════════════════

-- ── Step 1: Create isolated table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_telegram (
  user_uid    TEXT PRIMARY KEY REFERENCES public.peace_votes(user_uid) ON DELETE CASCADE,
  telegram_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Step 2: Enable RLS ───────────────────────────────────────────
ALTER TABLE public.user_telegram ENABLE ROW LEVEL SECURITY;

-- ── Step 3: RLS policies — each user reads/writes only their own row
-- NOTE: These policies rely on JWT sub matching user_uid.
-- NAVA Telegram Mini App users use custom UIDs (tg_XXXXXX) which may
-- not match their Supabase auth.uid(). If needed, relax the INSERT
-- policy to WITH CHECK (true) so the frontend can still write.
CREATE POLICY "user_telegram_select_own" ON public.user_telegram
  FOR SELECT USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "user_telegram_insert_own" ON public.user_telegram
  FOR INSERT WITH CHECK (user_uid = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "user_telegram_update_own" ON public.user_telegram
  FOR UPDATE USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- ── Step 4: Grants (service_role bypasses RLS automatically) ─────
GRANT SELECT, INSERT, UPDATE ON public.user_telegram TO anon, authenticated;

-- ── Step 5: Migrate existing data ────────────────────────────────
INSERT INTO public.user_telegram (user_uid, telegram_id)
SELECT DISTINCT ON (user_uid) user_uid, telegram_id
FROM public.peace_votes
WHERE telegram_id IS NOT NULL AND telegram_id <> ''
ON CONFLICT (user_uid) DO NOTHING;

-- ── Step 6: Verify the migration ─────────────────────────────────
-- Run these queries to confirm before dropping the column:
--
--   SELECT COUNT(*) FROM public.user_telegram;
--   SELECT COUNT(*) FROM public.peace_votes WHERE telegram_id IS NOT NULL AND telegram_id <> '';
--   -- Both counts should match (or user_telegram count ≥ distinct user count in peace_votes)
--
--   SELECT ut.user_uid, ut.telegram_id, pv.telegram_id AS pv_tg
--   FROM public.user_telegram ut
--   JOIN public.peace_votes pv ON pv.user_uid = ut.user_uid
--   WHERE pv.telegram_id IS NOT NULL AND pv.telegram_id <> '' AND pv.telegram_id <> ut.telegram_id
--   LIMIT 10;
--   -- Should return 0 rows (no mismatches)

-- ── Step 7: Drop column (MANUAL — run after bots + frontend deployed)
-- The active_votes view depends on telegram_id, so it must be dropped
-- and recreated without that column. Run in this exact order:
--
-- 7a. Inspect the current view definition (run first, copy the output):
--
--   SELECT definition FROM pg_views
--   WHERE viewname = 'active_votes' AND schemaname = 'public';
--
-- 7b. Drop the view, then drop the column + index:
--
--   DROP VIEW IF EXISTS public.active_votes;
--   ALTER TABLE public.peace_votes DROP COLUMN telegram_id;
--   DROP INDEX IF EXISTS public.peace_votes_telegram_id_idx;
--
-- 7c. Recreate active_votes WITHOUT telegram_id.
-- Original view included id, WHERE NOT IN blocked_users filter:
--
--   CREATE OR REPLACE VIEW public.active_votes AS
--   SELECT id, country, age, gender, created_at,
--          user_uid, referral_code, referred_by, source
--   FROM public.peace_votes
--   WHERE NOT (user_uid IN (SELECT blocked_users.user_uid FROM blocked_users));
--
-- The WHERE clause is critical — it excludes blocked users from all
-- stats, map, and vote counts.
--
-- This step is irreversible. Only run after verifying bot functionality.
