-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Drop lax policies that bypass nava_is_registered
--  2026-05-17 (part 2)
--
--  In PostgreSQL RLS, multiple permissive INSERT policies are OR'd.
--  The old policies (length > 5) bypass our nava_is_registered check.
--  We must drop them so only the strict policy remains.
-- ═══════════════════════════════════════════════════════════════

-- peace_votes: drop lax insert (length > 5 was not enough)
DROP POLICY IF EXISTS "peace_votes_insert_own" ON public.peace_votes;

-- peace_messages: drop lax insert + lax update
DROP POLICY IF EXISTS "peace_messages_insert_own" ON public.peace_messages;
DROP POLICY IF EXISTS "peace_messages_update_own" ON public.peace_messages;

-- push_subscriptions: drop fully-open insert + update
DROP POLICY IF EXISTS "public_upsert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "public_update" ON public.push_subscriptions;

-- Verify remaining INSERT/UPDATE policies
SELECT tablename, policyname, cmd, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('peace_votes', 'peace_messages', 'push_subscriptions')
   AND cmd IN ('INSERT', 'UPDATE')
 ORDER BY tablename, cmd;
