-- ══════════════════════════════════════════════════════════════
--  NAVA PEACE — Security & Integrity Patch v2  (FINAL)
--  Run in Supabase SQL Editor (project dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ── STEP 1 · Inspect duplicates (optional, for info) ──────────
-- Run this block alone first if you want to see what will be deleted.
/*
SELECT referral_code, user_uid, COUNT(*) AS cnt
FROM public.referral_points
GROUP BY referral_code, user_uid
HAVING COUNT(*) > 1;

SELECT user_uid, streak_days, COUNT(*) AS cnt
FROM public.nava_streak_rewards
GROUP BY user_uid, streak_days
HAVING COUNT(*) > 1;

SELECT user_uid, section, COUNT(*) AS cnt
FROM public.nava_discoveries
GROUP BY user_uid, section
HAVING COUNT(*) > 1;
*/

-- ── STEP 2 · Deduplicate referral_points ──────────────────────
-- Keeps the row with the smallest id (oldest insert); deletes the rest.
DELETE FROM public.referral_points
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.referral_points
  GROUP BY referral_code, user_uid
);

-- ── STEP 3 · Deduplicate nava_streak_rewards ──────────────────
DELETE FROM public.nava_streak_rewards
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.nava_streak_rewards
  GROUP BY user_uid, streak_days
);

-- ── STEP 4 · Deduplicate nava_discoveries ─────────────────────
DELETE FROM public.nava_discoveries
WHERE id NOT IN (
  SELECT MIN(id)
  FROM public.nava_discoveries
  GROUP BY user_uid, section
);

-- ── STEP 5 · Add UNIQUE constraints (safe, no duplicates left) ─

-- P0 · Referral points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_referral_per_user'
  ) THEN
    ALTER TABLE public.referral_points
      ADD CONSTRAINT unique_referral_per_user
      UNIQUE (referral_code, user_uid);
  END IF;
END $$;

-- P0 · Streak reward milestones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_streak_milestone'
  ) THEN
    ALTER TABLE public.nava_streak_rewards
      ADD CONSTRAINT unique_streak_milestone
      UNIQUE (user_uid, streak_days);
  END IF;
END $$;

-- P1 · Welcome dove (and other section discoveries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_discovery_per_section'
  ) THEN
    ALTER TABLE public.nava_discoveries
      ADD CONSTRAINT unique_discovery_per_section
      UNIQUE (user_uid, section);
  END IF;
END $$;

-- ── STEP 6 · RLS — anon can insert their own discovery ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nava_discoveries'
    AND policyname  = 'anon_insert_own_discovery'
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

-- ── STEP 7 · Verification ──────────────────────────────────────
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
