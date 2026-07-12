-- ══════════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — Solana wallet tables (Season 1 TGE prep)
-- 1. user_wallets         : custodial Solana wallets (created by Edge Function)
-- 2. user_tge_wallets     : self-custody wallet linked for TGE claim
-- 3. nft_pending_purchases: SOL / Stars purchase log (pre-TGE order queue)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Custodial wallets (server-derived keypair, public key only stored) ────
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_uid    TEXT PRIMARY KEY,
  public_key  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_wallets_own_read" ON public.user_wallets
  FOR SELECT TO anon, authenticated
  USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

CREATE POLICY "user_wallets_no_client_write" ON public.user_wallets
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- ── 2. Self-custody TGE wallet (user links their own Phantom / Backpack) ─────
CREATE TABLE IF NOT EXISTS public.user_tge_wallets (
  user_uid    TEXT PRIMARY KEY,
  sol_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'phantom', -- phantom | backpack
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_tge_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tge_wallets_own_read" ON public.user_tge_wallets
  FOR SELECT TO anon, authenticated
  USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

CREATE POLICY "user_tge_wallets_own_upsert" ON public.user_tge_wallets
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
           OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

CREATE POLICY "user_tge_wallets_own_update" ON public.user_tge_wallets
  FOR UPDATE TO anon, authenticated
  USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

CREATE POLICY "user_tge_wallets_own_delete" ON public.user_tge_wallets
  FOR DELETE TO anon, authenticated
  USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

-- ── 3. NFT purchase log (Stars paid + SOL pending queue) ─────────────────────
CREATE TABLE IF NOT EXISTS public.nft_pending_purchases (
  id              BIGSERIAL PRIMARY KEY,
  user_uid        TEXT NOT NULL,
  tier_code       TEXT NOT NULL,              -- PEACE_GARDENER … PEACE_POWER
  is_bundle       BOOLEAN NOT NULL DEFAULT false,
  price_stars     INTEGER,                    -- Stars amount if Stars payment
  wallet_addr     TEXT,                       -- SOL wallet addr if SOL payment
  status          TEXT NOT NULL DEFAULT 'pending',
                                              -- pending | paid_stars | sol_pending | fulfilled
  payment_method  TEXT NOT NULL DEFAULT 'stars', -- stars | sol_pending
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nft_pending_purchases_user_idx
  ON public.nft_pending_purchases (user_uid, created_at DESC);

ALTER TABLE public.nft_pending_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nft_purchases_own_read" ON public.nft_pending_purchases
  FOR SELECT TO anon, authenticated
  USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

CREATE POLICY "nft_purchases_own_insert" ON public.nft_pending_purchases
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
           OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

CREATE POLICY "nft_purchases_no_update" ON public.nft_pending_purchases
  FOR UPDATE TO anon, authenticated
  USING (false);
