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

-- Lecture anonyme (block_check.js en a besoin) — écriture via RPC admin uniquement
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_users_select_public"
  ON public.blocked_users FOR SELECT
  USING (true);

-- INSERT / UPDATE / DELETE : bloqués côté anon — utiliser nava_block_user() / nava_unblock_user()
CREATE POLICY "blocked_users_insert_block"
  ON public.blocked_users FOR INSERT
  WITH CHECK (false);

CREATE POLICY "blocked_users_delete_block"
  ON public.blocked_users FOR DELETE
  USING (false);

-- ═══════════════════════════════════════════════════════════════
--  Vérification : SELECT * FROM blocked_users;
-- ═══════════════════════════════════════════════════════════════
