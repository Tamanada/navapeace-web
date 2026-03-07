-- ── NAVA PEACE – Referral system migration ────────────────────────
-- Run this in Supabase → SQL Editor

-- 1. Add referral columns to peace_votes
ALTER TABLE public.peace_votes
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by   TEXT;

-- 2. Create referral_points table (1 row = 1 point earned by referrer)
CREATE TABLE IF NOT EXISTS public.referral_points (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT        NOT NULL,   -- the REFERRER's code
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referral_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert" ON public.referral_points
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_select" ON public.referral_points
  FOR SELECT TO anon, authenticated USING (true);
