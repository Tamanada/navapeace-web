-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — H-5 : Admin TOTP moved server-side
--  2026-05-17
--
--  Before : TOTP secret stored in browser localStorage
--  After  : secret stored in admin_users.totp_secret (service_role only)
--           verification done via Edge Function admin-totp
-- ═══════════════════════════════════════════════════════════════

-- ── Add TOTP columns to admin_users ──────────────────────────
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS totp_secret  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ── RLS: block anon from touching admin_users ─────────────────
-- Edge Functions use service_role which bypasses RLS.
-- The admin panel uses the anon key, so it must go through
-- the RPC nava_check_admin (SECURITY DEFINER) — not direct REST.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_deny_anon" ON public.admin_users;
CREATE POLICY "admin_users_deny_anon" ON public.admin_users
  FOR ALL TO anon USING (false);

-- ── Index for fast lookup by code ─────────────────────────────
CREATE INDEX IF NOT EXISTS admin_users_code_idx ON public.admin_users (code);
