-- ══════════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — Fix wallet RLS policies
--
-- Root cause: user_tge_wallets / user_wallets / nft_pending_purchases policies
-- used `current_setting('request.jwt.claims')::json->>'uid'` which is always NULL
-- when the client sends the SUPABASE_ANON_KEY (no Supabase Auth session).
-- Result: ALL client-side read/write operations failed silently.
--
-- Fix: align with the rest of the codebase — use nava_is_registered(user_uid)
-- for writes (validates uid exists in user_telegram), open SELECT for these
-- tables (Solana public keys and purchase history are not sensitive).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── user_tge_wallets ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_tge_wallets_own_read"   ON public.user_tge_wallets;
DROP POLICY IF EXISTS "user_tge_wallets_own_upsert" ON public.user_tge_wallets;
DROP POLICY IF EXISTS "user_tge_wallets_own_update" ON public.user_tge_wallets;
DROP POLICY IF EXISTS "user_tge_wallets_own_delete" ON public.user_tge_wallets;

-- Solana addresses are public by nature — open read is intentional.
CREATE POLICY "user_tge_wallets_read" ON public.user_tge_wallets
  FOR SELECT TO anon, authenticated USING (true);

-- Writes: uid must exist in user_telegram (proves the user is registered).
CREATE POLICY "user_tge_wallets_insert" ON public.user_tge_wallets
  FOR INSERT TO anon, authenticated
  WITH CHECK (nava_is_registered(user_uid));

CREATE POLICY "user_tge_wallets_update" ON public.user_tge_wallets
  FOR UPDATE TO anon, authenticated
  USING (nava_is_registered(user_uid));

CREATE POLICY "user_tge_wallets_delete" ON public.user_tge_wallets
  FOR DELETE TO anon, authenticated
  USING (nava_is_registered(user_uid));

-- ── user_wallets (custodial) ──────────────────────────────────────────────────
-- Old SELECT policy used JWT claims → blocked all client reads.
-- Wallet creation goes through the create-custodial-wallet EF (service_role),
-- so the INSERT/UPDATE policies stay as-is (blocking client writes is correct).
DROP POLICY IF EXISTS "user_wallets_own_read" ON public.user_wallets;

CREATE POLICY "user_wallets_read" ON public.user_wallets
  FOR SELECT TO anon, authenticated USING (true);

-- ── nft_pending_purchases ─────────────────────────────────────────────────────
-- INSERT and SELECT used JWT claims → blocked. Inserts are done via service_role
-- (telegram-webhook), so the INSERT policy doesn't need to allow anon.
-- Fixing SELECT so wallet.html can display purchase history.
DROP POLICY IF EXISTS "nft_purchases_own_read"   ON public.nft_pending_purchases;
DROP POLICY IF EXISTS "nft_purchases_own_insert" ON public.nft_pending_purchases;

CREATE POLICY "nft_purchases_read" ON public.nft_pending_purchases
  FOR SELECT TO anon, authenticated USING (true);

-- Service-role only writes (telegram-webhook) — no client INSERT needed.
-- Left intentionally without anon INSERT policy.
