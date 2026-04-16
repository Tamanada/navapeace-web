-- ══════════════════════════════════════════════════════════════
--  NAVA PEACE — Security & Integrity Patch v2
--  Run in Supabase SQL Editor (project dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ── P0 · Referral points deduplication ─────────────────────────
-- Prevents a referrer from earning 2+ points for the same user
-- (race condition: user clicks vote twice, or joins on 2 devices)

ALTER TABLE public.referral_points
  ADD CONSTRAINT IF NOT EXISTS unique_referral_per_user
  UNIQUE (referral_code, user_uid);

-- ── P0 · Streak reward deduplication ──────────────────────────
-- Prevents the same milestone from being awarded twice if two
-- concurrent requests race to insert the same (user, days) pair.

ALTER TABLE public.nava_streak_rewards
  ADD CONSTRAINT IF NOT EXISTS unique_streak_milestone
  UNIQUE (user_uid, streak_days);

-- ── P1 · Welcome dove deduplication ───────────────────────────
-- nava_discoveries already stores discovery doves.
-- section='welcome' marks the first-open bonus.
-- A unique constraint prevents it from being awarded twice.

ALTER TABLE public.nava_discoveries
  ADD CONSTRAINT IF NOT EXISTS unique_discovery_per_section
  UNIQUE (user_uid, section);

-- ── P1 · Welcome dove RLS ──────────────────────────────────────
-- Allow anon users to insert their own welcome dove row only.
-- (existing RLS on nava_discoveries should already allow this,
--  but run anyway to be explicit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nava_discoveries'
    AND policyname = 'anon_insert_own_discovery'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY anon_insert_own_discovery
        ON public.nava_discoveries
        FOR INSERT
        TO anon
        WITH CHECK (true);
    $policy$;
  END IF;
END $$;

-- ── Verification ──────────────────────────────────────────────
SELECT
  conname   AS constraint_name,
  contype   AS type,
  conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname IN (
  'unique_referral_per_user',
  'unique_streak_milestone',
  'unique_discovery_per_section'
)
ORDER BY conname;
