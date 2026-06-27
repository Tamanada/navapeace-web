-- ══════════════════════════════════════════════════════════════════════════════
-- NAVA TOKEN SYSTEM — Season 1
-- Architecture : off-chain Supabase (gameplay) + TON Merkle root quotidien
-- Règle absolue : tout calcul de reward côté serveur, jamais côté client
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Configuration de la saison (halving anchor) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.nava_season_config (
  id            BIGSERIAL PRIMARY KEY,
  season        INTEGER NOT NULL DEFAULT 1,
  season_start  TIMESTAMPTZ NOT NULL,           -- ancre du halving (UTC)
  season_days   INTEGER NOT NULL DEFAULT 180,   -- durée de la saison
  base_reward   NUMERIC(18,9) NOT NULL DEFAULT 1.0, -- tokens/click Phase 1
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule saison active à la fois
CREATE UNIQUE INDEX IF NOT EXISTS nava_season_active_idx
  ON public.nava_season_config (active) WHERE active = true;

-- ── 2. Balances token (source de vérité off-chain) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.nava_token_balances (
  user_uid      TEXT PRIMARY KEY,
  balance       NUMERIC(18,9) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned  NUMERIC(18,9) NOT NULL DEFAULT 0, -- cumulatif lifetime
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Historique des claims quotidiens ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nava_daily_claims (
  id              BIGSERIAL PRIMARY KEY,
  user_uid        TEXT NOT NULL,
  claim_date      DATE NOT NULL,                 -- UTC date du claim
  phase           INTEGER NOT NULL,              -- 1-6 (étape halving)
  base_reward     NUMERIC(18,9) NOT NULL,        -- reward du click de base
  streak_bonus    NUMERIC(18,9) NOT NULL DEFAULT 0,
  referral_bonus  NUMERIC(18,9) NOT NULL DEFAULT 0,
  nft_slots       INTEGER NOT NULL DEFAULT 1,    -- slots NFT actifs ce jour
  total_reward    NUMERIC(18,9) NOT NULL,        -- total crédité
  merkle_leaf     TEXT,                          -- hash feuille Merkle (rempli par batch)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_uid, claim_date)                  -- 1 claim max par user par jour UTC
);

-- ── 4. Racines Merkle quotidiennes → TON ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nava_merkle_roots (
  id            BIGSERIAL PRIMARY KEY,
  claim_date    DATE NOT NULL UNIQUE,
  merkle_root   TEXT NOT NULL,                   -- hex SHA-256 root
  total_claims  INTEGER NOT NULL DEFAULT 0,
  total_tokens  NUMERIC(18,9) NOT NULL DEFAULT 0,
  ton_tx_hash   TEXT,                            -- hash de la tx TON (rempli après envoi)
  ton_address   TEXT,                            -- adresse du contrat verifier TON
  posted_at     TIMESTAMPTZ,                     -- quand la tx a été confirmée
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.nava_season_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nava_token_balances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nava_daily_claims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nava_merkle_roots    ENABLE ROW LEVEL SECURITY;

-- nava_season_config : lecture publique, écriture bloquée (service_role only)
CREATE POLICY "nava_season_public_read" ON public.nava_season_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "nava_season_no_insert" ON public.nava_season_config
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "nava_season_no_update" ON public.nava_season_config
  FOR UPDATE TO anon, authenticated USING (false);

-- nava_token_balances : chaque user voit sa propre balance
CREATE POLICY "nava_balance_own_read" ON public.nava_token_balances
  FOR SELECT TO anon, authenticated USING (true); -- public leaderboard ok
CREATE POLICY "nava_balance_no_write" ON public.nava_token_balances
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "nava_balance_no_update" ON public.nava_token_balances
  FOR UPDATE TO anon, authenticated USING (false);

-- nava_daily_claims : lecture publique (Merkle), écriture bloquée côté client
CREATE POLICY "nava_claims_public_read" ON public.nava_daily_claims
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "nava_claims_no_insert" ON public.nava_daily_claims
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "nava_claims_no_update" ON public.nava_daily_claims
  FOR UPDATE TO anon, authenticated USING (false);

-- nava_merkle_roots : lecture publique (vérification), écriture bloquée
CREATE POLICY "nava_merkle_public_read" ON public.nava_merkle_roots
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "nava_merkle_no_write" ON public.nava_merkle_roots
  FOR INSERT TO anon, authenticated WITH CHECK (false);

-- ── 6. Fonction server-side : calcul du reward (SECURITY DEFINER) ────────────
-- Appelée uniquement depuis des Edge Functions avec service_role
-- JAMAIS exposée au client via anon/authenticated
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

  -- Phase du halving (0-indexé → phase 1-6 pour l'affichage)
  v_days_elapsed := GREATEST(0, (v_today - v_config.season_start::DATE));
  v_phase        := LEAST(v_days_elapsed / 30, 5); -- 0 à 5
  v_base         := v_config.base_reward / POWER(2, v_phase);

  -- Streak (depuis peace_votes, on réutilise les données existantes)
  SELECT COALESCE(
    (SELECT COUNT(DISTINCT pv.created_at::DATE)
     FROM peace_votes pv
     WHERE pv.user_uid = p_uid
       AND pv.created_at >= NOW() - INTERVAL '30 days'),
    0
  ) INTO v_streak;

  -- Bonus streak (cumulatif = on prend le palier le plus élevé atteint)
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

  -- NFT slots (PEACE LOVER = 1 par défaut, upgradable)
  -- TODO S1 : ajouter lookup nft_referral_claims pour niveau NFT user
  v_nft_slots := 1;

  RETURN QUERY SELECT
    (v_phase + 1)::INTEGER,          -- phase 1-6
    v_base,
    v_streak_bonus,
    v_ref_bonus,
    v_nft_slots,
    (v_base + v_streak_bonus + v_ref_bonus) * v_nft_slots,
    v_claimed;
END;
$$;

-- ── 7. Fonction server-side : exécuter le claim (SECURITY DEFINER) ────────────
CREATE OR REPLACE FUNCTION public.nava_execute_claim(p_uid TEXT)
RETURNS TABLE (
  success       BOOLEAN,
  total_reward  NUMERIC,
  new_balance   NUMERIC,
  phase         INTEGER,
  message       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward      RECORD;
  v_new_balance NUMERIC;
  v_today       DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  -- Calculer le reward
  SELECT * INTO v_reward FROM nava_compute_reward(p_uid);

  -- Déjà claimé ?
  IF v_reward.already_claimed THEN
    SELECT balance INTO v_new_balance FROM nava_token_balances WHERE user_uid = p_uid;
    RETURN QUERY SELECT false, 0::NUMERIC, COALESCE(v_new_balance, 0::NUMERIC), v_reward.phase, 'Already claimed today'::TEXT;
    RETURN;
  END IF;

  -- Insérer le claim
  INSERT INTO nava_daily_claims (
    user_uid, claim_date, phase, base_reward,
    streak_bonus, referral_bonus, nft_slots, total_reward
  ) VALUES (
    p_uid, v_today, v_reward.phase, v_reward.base_reward,
    v_reward.streak_bonus, v_reward.referral_bonus,
    v_reward.nft_slots, v_reward.total_reward
  )
  ON CONFLICT (user_uid, claim_date) DO NOTHING;

  -- Si INSERT bloqué par conflict (race condition), retourner déjà claimé
  IF NOT FOUND THEN
    SELECT balance INTO v_new_balance FROM nava_token_balances WHERE user_uid = p_uid;
    RETURN QUERY SELECT false, 0::NUMERIC, COALESCE(v_new_balance, 0::NUMERIC), v_reward.phase, 'Already claimed today'::TEXT;
    RETURN;
  END IF;

  -- Mettre à jour (ou créer) la balance
  INSERT INTO nava_token_balances (user_uid, balance, total_earned, updated_at)
  VALUES (p_uid, v_reward.total_reward, v_reward.total_reward, NOW())
  ON CONFLICT (user_uid) DO UPDATE SET
    balance      = nava_token_balances.balance + EXCLUDED.balance,
    total_earned = nava_token_balances.total_earned + EXCLUDED.total_earned,
    updated_at   = NOW();

  SELECT balance INTO v_new_balance FROM nava_token_balances WHERE user_uid = p_uid;

  RETURN QUERY SELECT true, v_reward.total_reward, v_new_balance, v_reward.phase, 'Claim successful'::TEXT;
END;
$$;

-- Révoquer l'accès public aux fonctions sensibles
REVOKE ALL ON FUNCTION public.nava_compute_reward(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nava_execute_claim(TEXT) FROM PUBLIC, anon, authenticated;

-- ── 8. Index performances ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS nava_claims_user_date_idx  ON public.nava_daily_claims (user_uid, claim_date DESC);
CREATE INDEX IF NOT EXISTS nava_claims_date_idx       ON public.nava_daily_claims (claim_date);
CREATE INDEX IF NOT EXISTS nava_balances_balance_idx  ON public.nava_token_balances (balance DESC); -- leaderboard

-- ── 9. Seed : configuration Season 1 ─────────────────────────────────────────
-- À activer manuellement : UPDATE nava_season_config SET season_start = NOW() WHERE id = 1;
INSERT INTO public.nava_season_config (season, season_start, season_days, base_reward, active)
VALUES (1, NOW(), 180, 1.0, false) -- active = false jusqu'au lancement officiel
ON CONFLICT DO NOTHING;
