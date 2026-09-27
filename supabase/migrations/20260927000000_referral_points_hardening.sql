-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Referral points DB hardening
--  2026-09-27
--
--  H-1: Block self-referral at DB level (RLS WITH CHECK).
--       Previously only blocked client-side; direct REST POST bypassed it.
--
--  H-2: Add UNIQUE constraint on (referral_code, user_uid).
--       Code already swallows 23505 but constraint was never explicit.
--       Without it a multi-tab race could double-insert the same pair.
-- ═══════════════════════════════════════════════════════════════

-- ── H-2: Deduplicate any existing rows before adding the constraint ──
-- Keep only the earliest row per (referral_code, user_uid) pair.
DELETE FROM public.referral_points rp
WHERE rp.id NOT IN (
  SELECT MIN(id)
  FROM   public.referral_points
  GROUP BY referral_code, user_uid
);

-- Add UNIQUE constraint (idempotent).
ALTER TABLE public.referral_points
  DROP CONSTRAINT IF EXISTS referral_points_code_uid_unique;

ALTER TABLE public.referral_points
  ADD CONSTRAINT referral_points_code_uid_unique UNIQUE (referral_code, user_uid);

-- ── H-1: Replace INSERT policy — add self-referral block ────────────
DROP POLICY IF EXISTS "referral_points_insert_valid" ON public.referral_points;

CREATE POLICY "referral_points_insert_valid" ON public.referral_points
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- voter must be a real registered user
    public.nava_is_registered(user_uid)
    -- referral_code must belong to an existing voter
    AND EXISTS (
      SELECT 1 FROM public.peace_votes
      WHERE peace_votes.referral_code = referral_points.referral_code
    )
    -- self-referral: voter must not own the referral_code they are crediting
    AND NOT EXISTS (
      SELECT 1 FROM public.peace_votes
      WHERE peace_votes.user_uid      = referral_points.user_uid
        AND peace_votes.referral_code = referral_points.referral_code
    )
  );
