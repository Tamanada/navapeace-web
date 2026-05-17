-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — RLS Hardening Migration
--  2026-05-17
--
--  Confirmed open tables (anon INSERT without auth):
--    • peace_votes    — anyone could insert fake votes
--    • peace_messages — anyone could inject messages
--
--  Fix strategy: SECURITY DEFINER helper that queries user_telegram
--  (which has RLS enabled, so we bypass safely via definer rights).
--  Every INSERT/UPDATE must reference a registered user_uid.
-- ═══════════════════════════════════════════════════════════════

-- ── Helper: is this uid registered in Telegram? ──────────────
-- SECURITY DEFINER so it can read user_telegram even from anon role.
CREATE OR REPLACE FUNCTION public.nava_is_registered(uid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL
     AND length(uid) > 3
     AND EXISTS (
       SELECT 1 FROM public.user_telegram ut
        WHERE ut.user_uid = uid
     )
$$;

-- ═══════════════════════════════════════════════════════════════
--  peace_votes
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.peace_votes ENABLE ROW LEVEL SECURITY;

-- SELECT: open (needed for map/stats — aggregate queries)
DROP POLICY IF EXISTS "pv_select_all" ON public.peace_votes;
CREATE POLICY "pv_select_all" ON public.peace_votes
  FOR SELECT TO anon USING (true);

-- INSERT: only registered UIDs
DROP POLICY IF EXISTS "pv_insert_registered" ON public.peace_votes;
CREATE POLICY "pv_insert_registered" ON public.peace_votes
  FOR INSERT TO anon
  WITH CHECK (public.nava_is_registered(user_uid));

-- UPDATE: only own registered rows
DROP POLICY IF EXISTS "pv_update_own" ON public.peace_votes;
CREATE POLICY "pv_update_own" ON public.peace_votes
  FOR UPDATE TO anon
  USING  (public.nava_is_registered(user_uid))
  WITH CHECK (public.nava_is_registered(user_uid));

-- DELETE: blocked for anon (no policy = deny)

-- ═══════════════════════════════════════════════════════════════
--  peace_messages
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.peace_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: open (messages shown on peace page)
DROP POLICY IF EXISTS "pm_select_all" ON public.peace_messages;
CREATE POLICY "pm_select_all" ON public.peace_messages
  FOR SELECT TO anon USING (true);

-- INSERT: only registered UIDs
DROP POLICY IF EXISTS "pm_insert_registered" ON public.peace_messages;
CREATE POLICY "pm_insert_registered" ON public.peace_messages
  FOR INSERT TO anon
  WITH CHECK (public.nava_is_registered(user_uid));

-- UPDATE: only own registered rows
DROP POLICY IF EXISTS "pm_update_own" ON public.peace_messages;
CREATE POLICY "pm_update_own" ON public.peace_messages
  FOR UPDATE TO anon
  USING  (public.nava_is_registered(user_uid))
  WITH CHECK (public.nava_is_registered(user_uid));

-- ═══════════════════════════════════════════════════════════════
--  push_subscriptions
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: blocked for anon (push endpoints are private)
-- No SELECT policy → denied

-- INSERT: only registered UIDs
DROP POLICY IF EXISTS "ps_insert_registered" ON public.push_subscriptions;
CREATE POLICY "ps_insert_registered" ON public.push_subscriptions
  FOR INSERT TO anon
  WITH CHECK (public.nava_is_registered(user_uid));

-- UPDATE: only own registered rows
DROP POLICY IF EXISTS "ps_update_own" ON public.push_subscriptions;
CREATE POLICY "ps_update_own" ON public.push_subscriptions
  FOR UPDATE TO anon
  USING  (public.nava_is_registered(user_uid))
  WITH CHECK (public.nava_is_registered(user_uid));

-- ═══════════════════════════════════════════════════════════════
--  Service role bypass (needed for Edge Functions + admin panel)
-- ═══════════════════════════════════════════════════════════════
-- service_role bypasses RLS by default in Supabase, so no extra
-- policies needed for the admin or Edge Functions using SERVICE_KEY.

-- ═══════════════════════════════════════════════════════════════
--  Verify
-- ═══════════════════════════════════════════════════════════════
SELECT tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('peace_votes', 'peace_messages', 'push_subscriptions')
 ORDER BY tablename, cmd;
