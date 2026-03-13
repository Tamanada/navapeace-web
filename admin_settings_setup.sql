-- ── NAVA PEACE · Admin Settings Table ────────────────────────────────────────
-- Run this ONCE in Supabase → SQL Editor before using module toggles.
-- Stores key/value admin settings (e.g. module on/off states) synced across
-- all devices and users via module_gate.js.

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (web + app users) can READ settings (needed by module_gate.js)
CREATE POLICY "public_read" ON public.admin_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Admin panel (uses anon key) can INSERT / UPDATE settings
CREATE POLICY "public_insert" ON public.admin_settings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public_update" ON public.admin_settings
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Seed default row so module_gate.js always finds a value
INSERT INTO public.admin_settings (key, value)
VALUES ('nava_modules', '{}')
ON CONFLICT (key) DO NOTHING;
