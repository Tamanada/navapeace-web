-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Drop legacy gamification tables
--  2026-05-18
--
--  These were created in Jan 2026 for a Supabase Auth-based version
--  that was never shipped. NAVA PEACE uses custom tg_ UIDs, not
--  auth.uid(). None of these are called by any page, bot or EF.
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION  IF EXISTS public.get_leaderboard()      CASCADE;
DROP FUNCTION  IF EXISTS public.record_daily_action()  CASCADE;
DROP TABLE     IF EXISTS public.daily_actions          CASCADE;
DROP TABLE     IF EXISTS public.user_stats             CASCADE;

-- Verify nothing remains
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('user_stats', 'daily_actions');
-- Should return 0 rows
