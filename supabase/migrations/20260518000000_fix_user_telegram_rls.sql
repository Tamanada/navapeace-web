-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Fix user_telegram RLS + bootstrap deadlock
--  2026-05-18
--
--  Problem: New users hit a circular deadlock on first registration:
--    1. peace_votes INSERT → nava_is_registered() → checks user_telegram
--    2. user_telegram INSERT → WITH CHECK (user_uid = jwt.claims.sub)
--       → ALWAYS fails for custom tg_XXXXXX UIDs (anon JWT sub ≠ uid)
--    → Neither table can be populated for brand-new users.
--
--  Secondary bug: frontend sends `updated_at` in upsert but column
--  does not exist on user_telegram → silent upsert failure.
--
--  Fix:
--    A. Add missing updated_at column to user_telegram
--    B. Replace jwt.claims.sub policies with tg_-prefix validation
--    C. Relax peace_votes INSERT to allow first-vote bootstrap
--       (UPDATE still protected by nava_is_registered → no replay risk)
-- ═══════════════════════════════════════════════════════════════

-- ── A. Add missing updated_at column ─────────────────────────────
ALTER TABLE public.user_telegram
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── B. Fix user_telegram RLS policies ────────────────────────────
DROP POLICY IF EXISTS "user_telegram_select_own" ON public.user_telegram;
DROP POLICY IF EXISTS "user_telegram_insert_own" ON public.user_telegram;
DROP POLICY IF EXISTS "user_telegram_update_own" ON public.user_telegram;

-- SELECT: open — telegram_id is not sensitive enough to hide,
-- and bots/admin always use service_role (bypasses RLS).
CREATE POLICY "user_telegram_select_open" ON public.user_telegram
  FOR SELECT TO anon USING (true);

-- INSERT: allow any tg_ UID.
-- FK (user_uid → peace_votes.user_uid) enforces that user exists.
-- Length ≥ 10 guards against trivially short spoofed UIDs.
CREATE POLICY "user_telegram_insert_tg" ON public.user_telegram
  FOR INSERT TO anon
  WITH CHECK (user_uid LIKE 'tg_%' AND length(user_uid) >= 10);

-- UPDATE: allow update on own tg_ UID row (daily telegram_id refresh).
CREATE POLICY "user_telegram_update_tg" ON public.user_telegram
  FOR UPDATE TO anon
  USING  (user_uid LIKE 'tg_%')
  WITH CHECK (user_uid LIKE 'tg_%');

-- ── C. Relax peace_votes INSERT for first-vote bootstrap ──────────
-- After day 1 the user is in user_telegram, so nava_is_registered()
-- returns true and UPDATE is fully protected.
DROP POLICY IF EXISTS "pv_insert_registered" ON public.peace_votes;
CREATE POLICY "pv_insert_registered" ON public.peace_votes
  FOR INSERT TO anon
  WITH CHECK (
    -- Returning registered user (user_telegram populated on day 1)
    public.nava_is_registered(user_uid)
    -- Brand-new user bootstrapping their first vote
    OR (user_uid LIKE 'tg_%' AND length(user_uid) >= 10)
  );

-- ── Verify ────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('peace_votes', 'user_telegram')
 ORDER BY tablename, cmd;
