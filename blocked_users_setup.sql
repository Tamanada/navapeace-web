-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE – Blocked Users Table
--  Colle ce SQL dans : Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.blocked_users (
  user_uid   TEXT PRIMARY KEY,
  reason     TEXT DEFAULT '',
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_by TEXT DEFAULT 'admin'
);

-- Accès anonyme en lecture (pour que l'app puisse vérifier)
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read blocked_users"
  ON public.blocked_users FOR SELECT
  USING (true);

CREATE POLICY "Allow anon insert blocked_users"
  ON public.blocked_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon delete blocked_users"
  ON public.blocked_users FOR DELETE
  USING (true);

-- ═══════════════════════════════════════════════════════════════
--  Vérification : SELECT * FROM blocked_users;
-- ═══════════════════════════════════════════════════════════════
