-- ══════════════════════════════════════════════════════════════
--  NAVA PEACE — Telegram Stars donation setup
--  Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Table: nava_donations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nava_donations (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uid   text        NOT NULL,
  tier       text        NOT NULL CHECK (tier IN ('cafe','dove','arch')),
  stars      integer     NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- One-time donation per tier per user (upgrade allowed — remove constraint if you want repeat gifts)
-- ALTER TABLE public.nava_donations
--   ADD CONSTRAINT unique_donation_per_tier UNIQUE (user_uid, tier);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.nava_donations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='nava_donations' AND policyname='anon_insert_own_donation'
  ) THEN
    CREATE POLICY anon_insert_own_donation
      ON public.nava_donations FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='nava_donations' AND policyname='anon_read_own_donation'
  ) THEN
    CREATE POLICY anon_read_own_donation
      ON public.nava_donations FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ── Verification ──────────────────────────────────────────────
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'nava_donations';
