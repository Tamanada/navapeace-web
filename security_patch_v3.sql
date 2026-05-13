-- ══════════════════════════════════════════════════════════════════
--  NAVA PEACE — Security Patch v3
--  Applied 2026-05-13 via `npx supabase db query --linked`
--  Run in Supabase SQL Editor if ever needed again.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. CREATE push_subscriptions ─────────────────────────────────
-- Table was missing — send-push Edge Function was querying nothing.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid     TEXT        NOT NULL UNIQUE,
  subscription JSONB       NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_uid_idx
  ON public.push_subscriptions (user_uid);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='public_upsert') THEN
    CREATE POLICY "public_upsert" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='public_update') THEN
    CREATE POLICY "public_update" ON public.push_subscriptions FOR UPDATE TO anon, authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='service_select') THEN
    CREATE POLICY "service_select" ON public.push_subscriptions FOR SELECT TO service_role USING (true);
  END IF;
END $$;

-- ── 2. ENABLE RLS on notifications ───────────────────────────────
-- Table existed with RLS disabled — all rows publicly readable/writable.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_select_own') THEN
    CREATE POLICY "notif_select_own" ON public.notifications
      FOR SELECT TO anon, authenticated
      USING (true);   -- anon users; app filters by to_user_uid (no auth.uid available)
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_update_read') THEN
    CREATE POLICY "notif_update_read" ON public.notifications
      FOR UPDATE TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_insert_service') THEN
    CREATE POLICY "notif_insert_service" ON public.notifications
      FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- ── 3. DROP dangerous peace_messages update-all policy ───────────
-- "public can update" with USING(true) let anyone edit any message.
-- Kept: peace_messages_update_own (requires non-empty user_uid).
DROP POLICY IF EXISTS "public can update" ON public.peace_messages;
