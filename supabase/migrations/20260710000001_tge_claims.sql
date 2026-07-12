-- ══════════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — TGE claim registry
-- Records each user's claim intent before Day 180 mint batch.
-- Actual on-chain mint is executed by admin at TGE using this table.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tge_claims (
  id              BIGSERIAL PRIMARY KEY,
  user_uid        TEXT NOT NULL UNIQUE,          -- one claim per user
  amount          NUMERIC(20, 6) NOT NULL,        -- NAVA balance at claim time
  wallet_address  TEXT NOT NULL,                  -- Solana address for mint
  wallet_type     TEXT NOT NULL DEFAULT 'custodial', -- custodial | phantom | backpack
  status          TEXT NOT NULL DEFAULT 'queued', -- queued | processing | minted | failed
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  tx_signature    TEXT                             -- Solana tx signature after mint
);

CREATE INDEX IF NOT EXISTS tge_claims_status_idx ON public.tge_claims (status, claimed_at);

ALTER TABLE public.tge_claims ENABLE ROW LEVEL SECURITY;

-- Read own claim only
CREATE POLICY "tge_claims_own_read" ON public.tge_claims
  FOR SELECT TO anon, authenticated
  USING (user_uid = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user_uid = current_setting('request.jwt.claims', true)::json->>'uid');

-- No client writes — Edge Function uses service_role
CREATE POLICY "tge_claims_no_client_write" ON public.tge_claims
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
