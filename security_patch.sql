-- ══════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — SECURITY PATCH (pré-lancement)
-- Coller dans Supabase → SQL Editor et exécuter UNE SEULE FOIS
-- Date : 2026-04-16
-- ══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1. ADMIN_SETTINGS — bloquer les écritures anon
--    admin_settings_setup.sql avait créé des policies trop permissives.
--    Cette section les supprime et recrée des policies sécurisées.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read"               ON public.admin_settings;
DROP POLICY IF EXISTS "public_insert"             ON public.admin_settings;
DROP POLICY IF EXISTS "public_update"             ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_select_public" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_write_block"   ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_update_block"  ON public.admin_settings;

-- Lecture publique (module_gate.js en a besoin)
CREATE POLICY "admin_settings_select_public"
  ON public.admin_settings FOR SELECT
  USING (true);

-- Écriture bloquée pour l'anon key → passe par nava_upsert_admin_setting (RPC)
CREATE POLICY "admin_settings_insert_block"
  ON public.admin_settings FOR INSERT
  WITH CHECK (false);

CREATE POLICY "admin_settings_update_block"
  ON public.admin_settings FOR UPDATE
  USING (false);

CREATE POLICY "admin_settings_delete_block"
  ON public.admin_settings FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 2. BLOCKED_USERS — bloquer les écritures anon
--    blocked_users_setup.sql autorisait n'importe qui à bloquer/débloquer.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read blocked_users"   ON public.blocked_users;
DROP POLICY IF EXISTS "Allow anon insert blocked_users" ON public.blocked_users;
DROP POLICY IF EXISTS "Allow anon delete blocked_users" ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_users_select_public"     ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_users_write_block"       ON public.blocked_users;

-- Lecture : l'app doit pouvoir vérifier si l'uid est banni
CREATE POLICY "blocked_users_select_public"
  ON public.blocked_users FOR SELECT
  USING (true);

-- INSERT / UPDATE / DELETE : bloqués — seul le service_role (admin panel via RPC) peut écrire
CREATE POLICY "blocked_users_insert_block"
  ON public.blocked_users FOR INSERT
  WITH CHECK (false);

CREATE POLICY "blocked_users_update_block"
  ON public.blocked_users FOR UPDATE
  USING (false);

CREATE POLICY "blocked_users_delete_block"
  ON public.blocked_users FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. PEACE_VOTES — contrainte UNIQUE anti double-vote
--    Un user_uid ne peut voter qu'une seule fois par jour UTC.
-- ─────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.one_vote_per_user_per_day;

CREATE UNIQUE INDEX one_vote_per_user_per_day
  ON public.peace_votes (user_uid, DATE(created_at AT TIME ZONE 'UTC'));


-- ─────────────────────────────────────────────────────────────────────────
-- 4. ADMIN_AUDIT_LOG — traçabilité des actions admin
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     TEXT        NOT NULL,
  admin_name TEXT        NOT NULL DEFAULT '',
  target     TEXT        DEFAULT '',
  details    JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- L'anon key (admin panel) peut insérer des logs
CREATE POLICY "audit_log_insert_anon"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (true);

-- Lecture uniquement via RPC / service_role (pas accessible à l'anon)
-- (absence de policy SELECT = bloqué par défaut avec RLS activé)


-- ─────────────────────────────────────────────────────────────────────────
-- 5. RPC — bloquer/débloquer un utilisateur via RPC sécurisée
--    Remplace les write directes sur blocked_users depuis le panel admin.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nava_block_user(
  caller_code TEXT,
  target_uid  TEXT,
  reason_text TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE admin_rec RECORD;
BEGIN
  SELECT name, role INTO admin_rec
  FROM public.admin_users
  WHERE code = caller_code AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{"error":"unauthorized"}'::JSONB;
  END IF;

  INSERT INTO public.blocked_users (user_uid, reason, blocked_by)
  VALUES (target_uid, reason_text, admin_rec.name)
  ON CONFLICT (user_uid) DO UPDATE
    SET reason     = reason_text,
        blocked_by = admin_rec.name,
        blocked_at = NOW();

  -- Log
  INSERT INTO public.admin_audit_log (action, admin_name, target, details)
  VALUES ('block_user', admin_rec.name, target_uid,
          jsonb_build_object('reason', reason_text));

  RETURN '{"ok":true}'::JSONB;
END;$$;


CREATE OR REPLACE FUNCTION public.nava_unblock_user(
  caller_code TEXT,
  target_uid  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE admin_rec RECORD;
BEGIN
  SELECT name, role INTO admin_rec
  FROM public.admin_users
  WHERE code = caller_code AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{"error":"unauthorized"}'::JSONB;
  END IF;

  DELETE FROM public.blocked_users WHERE user_uid = target_uid;

  INSERT INTO public.admin_audit_log (action, admin_name, target)
  VALUES ('unblock_user', admin_rec.name, target_uid);

  RETURN '{"ok":true}'::JSONB;
END;$$;

GRANT EXECUTE ON FUNCTION public.nava_block_user   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nava_unblock_user TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 6. ROTATION DU CODE ADMIN
--    ⚠️  REMPLACE 'TON_NOUVEAU_CODE_ICI' par un vrai code secret AVANT d'exécuter
--    Exemple : 'NP-2026-' || upper(substring(gen_random_uuid()::text, 1, 8))
-- ─────────────────────────────────────────────────────────────────────────

-- Génère un nouveau code aléatoire et met à jour le super_admin
DO $$
DECLARE new_code TEXT;
BEGIN
  new_code := 'NP-' || upper(substring(gen_random_uuid()::text, 1, 8));
  UPDATE public.admin_users
  SET code = new_code
  WHERE code = 'NAVA2024';
  RAISE NOTICE 'Nouveau code admin : %', new_code;
END;$$;

-- ⚠️  Après exécution : note le code affiché dans les "Messages" du SQL Editor
--    (colonne "Messages" en bas du panneau Results)
--    Ce code remplace NAVA2024. Stocke-le dans un gestionnaire de mots de passe.


-- ─────────────────────────────────────────────────────────────────────────
-- 7. BUCKET STORAGE card-shares — policy anon INSERT
--    (si pas encore créée lors du setup précédent)
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND policyname = 'anon upload card-shares'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "anon upload card-shares"
      ON storage.objects FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'card-shares')
    $p$;
  END IF;
END;$$;


-- ══════════════════════════════════════════════════════════════════════════
-- FIN DU PATCH
-- Vérifier dans : Supabase → Authentication → Policies
-- ══════════════════════════════════════════════════════════════════════════
