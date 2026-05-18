-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Fix web user (u_ UID) RLS coverage
--  2026-05-18
--
--  Problem: Previous fix (20260518000000) only covered tg_ UIDs.
--  Web users (nava-peace.world) get u_ UIDs generated in index.html:
--    'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9)
--  Web users never write to user_telegram (Telegram-only table),
--  so nava_is_registered() always returns false for them → they
--  cannot vote, leave messages, or subscribe to push on day 2+.
--
--  Fix:
--    A. Extend nava_is_registered() to also check peace_votes
--       (web users in peace_votes from day 1 pass day-2+ checks)
--    B. Extend peace_votes INSERT bootstrap to also allow u_ UIDs
-- ═══════════════════════════════════════════════════════════════

-- ── A. Extend nava_is_registered to cover web users ──────────────
-- SECURITY DEFINER bypasses RLS — safe, no infinite loop.
-- Checks user_telegram (Telegram users) OR peace_votes (web users).
CREATE OR REPLACE FUNCTION public.nava_is_registered(uid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL
     AND length(uid) > 3
     AND (
       EXISTS (SELECT 1 FROM public.user_telegram ut WHERE ut.user_uid = uid)
       OR
       EXISTS (SELECT 1 FROM public.peace_votes  pv WHERE pv.user_uid = uid)
     )
$$;

-- ── B. Extend peace_votes INSERT bootstrap to allow u_ UIDs ───────
DROP POLICY IF EXISTS "pv_insert_registered" ON public.peace_votes;
CREATE POLICY "pv_insert_registered" ON public.peace_votes
  FOR INSERT TO anon
  WITH CHECK (
    -- Returning user (in user_telegram or peace_votes already)
    public.nava_is_registered(user_uid)
    -- First-vote bootstrap: Telegram user (tg_) or web user (u_)
    OR ((user_uid LIKE 'tg_%' OR user_uid LIKE 'u_%') AND length(user_uid) >= 10)
  );

-- ── Verify ────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('peace_votes', 'user_telegram')
 ORDER BY tablename, cmd;
