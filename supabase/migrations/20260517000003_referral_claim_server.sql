-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — C-4 : Referral claim moved server-side
--  2026-05-17
--
--  Before : client reads ref_code from localStorage, inserts directly
--           → attacker could spoof any popular ref_code and claim free NFTs
--  After  : Edge Function verifies Telegram identity, derives uid,
--           calls nava_claim_referral_rewards() which reads real ref_code
--           from peace_votes (SECURITY DEFINER, service_role bypass)
-- ═══════════════════════════════════════════════════════════════

-- ── Create nft_referral_claims if not already present ────────
CREATE TABLE IF NOT EXISTS public.nft_referral_claims (
  id           BIGSERIAL PRIMARY KEY,
  user_uid     TEXT        NOT NULL,
  tier_code    TEXT        NOT NULL,
  ref_count    INT         NOT NULL DEFAULT 0,
  refs_needed  INT         NOT NULL DEFAULT 0,
  claimed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nft_referral_claims_user_tier_unique UNIQUE (user_uid, tier_code)
);

-- Also create user_badges if it hasn't been created yet
CREATE TABLE IF NOT EXISTS public.user_badges (
  id         BIGSERIAL PRIMARY KEY,
  user_uid   TEXT NOT NULL,
  badge_code TEXT NOT NULL,
  CONSTRAINT user_badges_user_code_unique UNIQUE (user_uid, badge_code)
);

-- ── RLS on nft_referral_claims ────────────────────────────────
ALTER TABLE public.nft_referral_claims ENABLE ROW LEVEL SECURITY;

-- Anyone can read (claim counts are not sensitive).
DROP POLICY IF EXISTS "nft_rc_select_all"        ON public.nft_referral_claims;
DROP POLICY IF EXISTS "nft_rc_insert_deny_anon"  ON public.nft_referral_claims;

CREATE POLICY "nft_rc_select_all" ON public.nft_referral_claims
  FOR SELECT TO anon USING (true);

-- Block direct anon INSERT — claims must go through the EF → SECURITY DEFINER fn.
CREATE POLICY "nft_rc_insert_deny_anon" ON public.nft_referral_claims
  FOR INSERT TO anon WITH CHECK (false);

-- ── RLS on user_badges ────────────────────────────────────────
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ub_select_all"            ON public.user_badges;
DROP POLICY IF EXISTS "ub_insert_peace_lover"    ON public.user_badges;
DROP POLICY IF EXISTS "ub_insert_deny_referral"  ON public.user_badges;

-- Open reads.
CREATE POLICY "ub_select_all" ON public.user_badges
  FOR SELECT TO anon USING (true);

-- Anon can only self-insert the free tier (PEACE_LOVER, price=0, unlimited).
-- All referral-tier badges are granted via the SECURITY DEFINER fn.
CREATE POLICY "ub_insert_peace_lover" ON public.user_badges
  FOR INSERT TO anon
  WITH CHECK (badge_code = 'PEACE_LOVER');

-- ── SECURITY DEFINER atomic referral claim function ───────────
CREATE OR REPLACE FUNCTION public.nava_claim_referral_rewards(
  p_uid TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Mirror of REFERRAL_THRESHOLDS in market.html
  v_thresholds JSONB := '[
    {"code":"PEACE_GARDENER",    "refs_needed":100,   "free_quota":80000},
    {"code":"PEACE_GUARDIAN",    "refs_needed":250,   "free_quota":48000},
    {"code":"PEACE_GUIDE",       "refs_needed":500,   "free_quota":32000},
    {"code":"PEACE_ILLUMINATOR", "refs_needed":1000,  "free_quota":16000},
    {"code":"PEACE_LEGEND",      "refs_needed":2500,  "free_quota":6400},
    {"code":"ANGEL_OF_PEACE",    "refs_needed":5000,  "free_quota":3200},
    {"code":"PEACE_POWER",       "refs_needed":10000, "free_quota":1600}
  ]'::jsonb;

  v_real_ref_code TEXT;
  v_ref_count     BIGINT;
  v_claimed       TEXT[] := ARRAY[]::TEXT[];
  v_skipped       TEXT[] := ARRAY[]::TEXT[];
  v_tier          JSONB;
  v_code          TEXT;
  v_refs_needed   INT;
  v_free_quota    INT;
  v_inserted      INT;
BEGIN
  -- ── 1. Verify uid is a real registered user ───────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.user_telegram WHERE user_uid = p_uid
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_uid');
  END IF;

  -- ── 2. Get the REAL ref_code from peace_votes ─────────────
  --    Never trust what the client sent — derive from DB only.
  SELECT referral_code INTO v_real_ref_code
  FROM public.peace_votes
  WHERE user_uid = p_uid
  LIMIT 1;

  IF v_real_ref_code IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'no_ref_code',
      'claimed', '[]'::jsonb,
      'ref_count', 0
    );
  END IF;

  -- ── 3. Count active referrals for this code ───────────────
  SELECT COUNT(*) INTO v_ref_count
  FROM public.referral_points
  WHERE referral_code = v_real_ref_code;

  -- ── 4. Process each threshold atomically ──────────────────
  FOR v_tier IN SELECT * FROM jsonb_array_elements(v_thresholds) LOOP
    v_code        := v_tier->>'code';
    v_refs_needed := (v_tier->>'refs_needed')::INT;
    v_free_quota  := (v_tier->>'free_quota')::INT;

    -- Skip if threshold not met
    CONTINUE WHEN v_ref_count < v_refs_needed;
    -- Skip if already claimed
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.nft_referral_claims
      WHERE user_uid = p_uid AND tier_code = v_code
    );
    -- Skip if badge already granted
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_uid = p_uid AND badge_code = v_code
    );

    -- Atomic insert: quota guard lives inside the WHERE clause of the
    -- INSERT … SELECT so it executes within the same statement as the
    -- write — no TOCTOU window.
    WITH ins AS (
      INSERT INTO public.nft_referral_claims
             (user_uid, tier_code, ref_count, refs_needed, claimed_at)
      SELECT  p_uid, v_code, v_ref_count, v_refs_needed, NOW()
      WHERE   (
        SELECT COUNT(*) FROM public.nft_referral_claims
        WHERE  tier_code = v_code
      ) < v_free_quota
      ON CONFLICT (user_uid, tier_code) DO NOTHING
      RETURNING tier_code
    )
    SELECT COUNT(*) INTO v_inserted FROM ins;

    IF v_inserted > 0 THEN
      -- Grant the badge
      INSERT INTO public.user_badges (user_uid, badge_code)
      VALUES (p_uid, v_code)
      ON CONFLICT (user_uid, badge_code) DO NOTHING;

      v_claimed := v_claimed || v_code;
    ELSE
      v_skipped := v_skipped || v_code; -- quota exhausted
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'claimed',   to_jsonb(v_claimed),
    'skipped',   to_jsonb(v_skipped),
    'ref_count', v_ref_count,
    'ref_code',  v_real_ref_code
  );
END;
$$;

-- Edge Function calls this via service_role (bypasses RLS).
-- anon cannot call it — deny public EXECUTE.
REVOKE ALL ON FUNCTION public.nava_claim_referral_rewards(TEXT) FROM PUBLIC, anon, authenticated;
