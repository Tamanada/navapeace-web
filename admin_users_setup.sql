-- ── NAVA PEACE · Admin Users Table ───────────────────────────────────────────
-- Run ONCE in Supabase → SQL Editor.
-- Creates the admin_users table + 5 secure RPCs (all SECURITY DEFINER).
-- The anon key can only call RPCs, never read the table directly.

-- ── TABLE ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        DEFAULT '',
  code       TEXT        NOT NULL UNIQUE,            -- access code (like a password)
  role       TEXT        NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('super_admin','viewer')),
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- No direct read/write by anon — all access goes through the RPCs below.

-- Seed: migrate the hardcoded master code as first super_admin
INSERT INTO public.admin_users (name, email, code, role)
VALUES ('Super Admin', '', 'NAVA2024', 'super_admin')
ON CONFLICT (code) DO NOTHING;

-- ── RPC 1 · Check code ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nava_check_admin(input_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec RECORD;
BEGIN
  SELECT id, name, role INTO rec
  FROM public.admin_users
  WHERE code = input_code AND active = true
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('valid', true, 'name', rec.name, 'role', rec.role, 'id', rec.id);
  ELSE
    RETURN jsonb_build_object('valid', false);
  END IF;
END;$$;

-- ── RPC 2 · Get all admins (super_admin only) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.nava_get_admins(caller_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE code = caller_code AND role = 'super_admin' AND active = true
  ) THEN RETURN '{"error":"unauthorized"}'::JSONB; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id, 'name', name, 'email', email,
        'role', role, 'active', active, 'created_at', created_at
      ) ORDER BY created_at
    ), '[]'::JSONB)
    FROM public.admin_users
  );
END;$$;

-- ── RPC 3 · Add admin (super_admin only) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nava_add_admin(
  caller_code TEXT, new_name TEXT, new_email TEXT, new_code TEXT, new_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE code = caller_code AND role = 'super_admin' AND active = true
  ) THEN RETURN '{"error":"unauthorized"}'::JSONB; END IF;
  INSERT INTO public.admin_users (name, email, code, role)
  VALUES (new_name, new_email, new_code, new_role);
  RETURN '{"ok":true}'::JSONB;
EXCEPTION WHEN unique_violation THEN
  RETURN '{"error":"code_already_exists"}'::JSONB;
END;$$;

-- ── RPC 4 · Toggle active (super_admin only) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.nava_toggle_admin(
  caller_code TEXT, target_id UUID, new_active BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE code = caller_code AND role = 'super_admin' AND active = true
  ) THEN RETURN '{"error":"unauthorized"}'::JSONB; END IF;
  UPDATE public.admin_users SET active = new_active WHERE id = target_id;
  RETURN '{"ok":true}'::JSONB;
END;$$;

-- ── RPC 5 · Delete admin (super_admin only) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.nava_delete_admin(
  caller_code TEXT, target_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE code = caller_code AND role = 'super_admin' AND active = true
  ) THEN RETURN '{"error":"unauthorized"}'::JSONB; END IF;
  DELETE FROM public.admin_users WHERE id = target_id;
  RETURN '{"ok":true}'::JSONB;
END;$$;

-- ── GRANTS ───────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.nava_check_admin    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nava_get_admins     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nava_add_admin      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nava_toggle_admin   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nava_delete_admin   TO anon, authenticated;
