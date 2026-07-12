-- ══════════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — S3-A : Wire NFT multiplier into daily mining
-- Replaces v_nft_slots := 1 (TODO S1) with a real lookup from user_badges.
-- Highest tier badge wins; PEACE_LOVER=×1 → PEACE_POWER=×10.
-- Both referral claims and Stars purchases write to user_badges — single source.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.nava_compute_reward(p_uid TEXT)
RETURNS TABLE (
  phase           INTEGER,
  base_reward     NUMERIC,
  streak_bonus    NUMERIC,
  referral_bonus  NUMERIC,
  nft_slots       INTEGER,
  total_reward    NUMERIC,
  already_claimed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config        RECORD;
  v_days_elapsed  INTEGER;
  v_phase         INTEGER;
  v_base          NUMERIC;
  v_streak        INTEGER;
  v_streak_bonus  NUMERIC;
  v_ref_code      TEXT;
  v_ref_count     INTEGER;
  v_ref_bonus     NUMERIC;
  v_nft_slots     INTEGER := 1;
  v_today         DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_claimed       BOOLEAN;
BEGIN
  -- Config saison active
  SELECT * INTO v_config FROM nava_season_config WHERE active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active season configured';
  END IF;

  -- Déjà claimé aujourd'hui ?
  SELECT EXISTS(
    SELECT 1 FROM nava_daily_claims
    WHERE user_uid = p_uid AND claim_date = v_today
  ) INTO v_claimed;

  -- Phase du halving (0-indexé → phase 1-6)
  v_days_elapsed := GREATEST(0, (v_today - v_config.season_start::DATE));
  v_phase        := LEAST(v_days_elapsed / 30, 5);
  v_base         := v_config.base_reward / POWER(2, v_phase);

  -- Streak (sur 30 jours glissants via peace_votes)
  SELECT COALESCE(
    (SELECT COUNT(DISTINCT pv.created_at::DATE)
     FROM peace_votes pv
     WHERE pv.user_uid = p_uid
       AND pv.created_at >= NOW() - INTERVAL '30 days'),
    0
  ) INTO v_streak;

  v_streak_bonus := CASE
    WHEN v_streak >= 28 THEN 10
    WHEN v_streak >= 21 THEN 8
    WHEN v_streak >= 14 THEN 5
    WHEN v_streak >= 7  THEN 2
    ELSE 0
  END;

  -- Bonus referral : +1 NAVA par ami actif (voté dans les dernières 48h)
  SELECT referral_code INTO v_ref_code
  FROM peace_votes WHERE user_uid = p_uid
  AND referral_code IS NOT NULL LIMIT 1;

  IF v_ref_code IS NOT NULL THEN
    SELECT COUNT(DISTINCT rp.user_uid) INTO v_ref_count
    FROM referral_points rp
    JOIN peace_votes pv ON pv.user_uid = rp.user_uid
    WHERE rp.referral_code = v_ref_code
      AND pv.created_at >= NOW() - INTERVAL '48 hours';
    v_ref_bonus := COALESCE(v_ref_count, 0) * 1.0;
  ELSE
    v_ref_bonus := 0;
  END IF;

  -- NFT slots : highest tier owned in user_badges (referral + Stars both write here)
  -- PEACE_LOVER omitted (=1, already the default)
  SELECT COALESCE(
    MAX(CASE badge_code
      WHEN 'PEACE_POWER'       THEN 10
      WHEN 'ANGEL_OF_PEACE'    THEN 8
      WHEN 'PEACE_LEGEND'      THEN 6
      WHEN 'PEACE_ILLUMINATOR' THEN 5
      WHEN 'PEACE_GUIDE'       THEN 4
      WHEN 'PEACE_GUARDIAN'    THEN 3
      WHEN 'PEACE_GARDENER'    THEN 2
      ELSE 1
    END), 1
  ) INTO v_nft_slots
  FROM user_badges WHERE user_uid = p_uid;

  RETURN QUERY SELECT
    (v_phase + 1)::INTEGER,
    v_base,
    v_streak_bonus,
    v_ref_bonus,
    v_nft_slots,
    (v_base + v_streak_bonus + v_ref_bonus) * v_nft_slots,
    v_claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.nava_compute_reward(TEXT) FROM PUBLIC, anon, authenticated;
