-- ── NAVA PEACE · Web Push subscriptions ─────────────────────────────────────
-- Run this in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid     TEXT        NOT NULL UNIQUE,          -- nava_peace_uid (localStorage)
  subscription JSONB       NOT NULL,                 -- PushSubscription JSON
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup by user_uid
CREATE INDEX IF NOT EXISTS push_subscriptions_user_uid_idx
  ON public.push_subscriptions (user_uid);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can upsert their own subscription (anon users, no auth required)
CREATE POLICY "public_upsert" ON public.push_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public_update" ON public.push_subscriptions
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Only service role (Edge Functions) can read subscriptions
CREATE POLICY "service_select" ON public.push_subscriptions
  FOR SELECT TO service_role
  USING (true);
