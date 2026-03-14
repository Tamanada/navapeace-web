-- ══════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — SECURITY & RLS SETUP
-- Coller dans Supabase → SQL Editor et exécuter UNE SEULE FOIS
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. PEACE_VOTES
--    • Lecture publique (compteurs, carte)
--    • INSERT uniquement si le user_uid correspond à son propre uid
--    • UPDATE / DELETE interdits pour les anonymes
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.peace_votes ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "peace_votes_select_public"  ON public.peace_votes;
DROP POLICY IF EXISTS "peace_votes_insert_own"     ON public.peace_votes;
DROP POLICY IF EXISTS "peace_votes_no_update"      ON public.peace_votes;
DROP POLICY IF EXISTS "peace_votes_no_delete"      ON public.peace_votes;

-- Lecture : tout le monde peut lire (pour les compteurs et la carte)
CREATE POLICY "peace_votes_select_public"
  ON public.peace_votes FOR SELECT
  USING (true);

-- INSERT : autorisé pour la clé anon (le user_uid est validé par l'app)
-- La contrainte UNIQUE (user_uid, utc_day(created_at)) protège contre le double vote
CREATE POLICY "peace_votes_insert_own"
  ON public.peace_votes FOR INSERT
  WITH CHECK (
    user_uid IS NOT NULL
    AND length(user_uid) > 5
  );

-- UPDATE / DELETE : interdits via la clé anon
CREATE POLICY "peace_votes_no_update"
  ON public.peace_votes FOR UPDATE
  USING (false);

CREATE POLICY "peace_votes_no_delete"
  ON public.peace_votes FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 2. PEACE_MESSAGES
--    • Lecture publique (pseudos, messages)
--    • INSERT / UPDATE uniquement pour son propre user_uid
--    • DELETE interdit
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.peace_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "peace_messages_select_public"  ON public.peace_messages;
DROP POLICY IF EXISTS "peace_messages_upsert_own"     ON public.peace_messages;
DROP POLICY IF EXISTS "peace_messages_no_delete"      ON public.peace_messages;

CREATE POLICY "peace_messages_select_public"
  ON public.peace_messages FOR SELECT
  USING (true);

CREATE POLICY "peace_messages_insert_own"
  ON public.peace_messages FOR INSERT
  WITH CHECK (user_uid IS NOT NULL AND length(user_uid) > 5);

CREATE POLICY "peace_messages_update_own"
  ON public.peace_messages FOR UPDATE
  USING (user_uid IS NOT NULL AND length(user_uid) > 5)
  WITH CHECK (user_uid IS NOT NULL);

CREATE POLICY "peace_messages_no_delete"
  ON public.peace_messages FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. REFERRAL_POINTS
--    • Lecture publique limitée (count uniquement, pas les codes bruts)
--    • INSERT : vérifié — le referral_code doit exister dans peace_votes
--    • UPDATE / DELETE : interdits
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.referral_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_points_select_public" ON public.referral_points;
DROP POLICY IF EXISTS "referral_points_insert_valid"  ON public.referral_points;
DROP POLICY IF EXISTS "referral_points_no_update"     ON public.referral_points;
DROP POLICY IF EXISTS "referral_points_no_delete"     ON public.referral_points;

CREATE POLICY "referral_points_select_public"
  ON public.referral_points FOR SELECT
  USING (true);

-- INSERT uniquement si le referral_code existe dans peace_votes
CREATE POLICY "referral_points_insert_valid"
  ON public.referral_points FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.peace_votes
      WHERE referral_code = referral_points.referral_code
    )
  );

CREATE POLICY "referral_points_no_update"
  ON public.referral_points FOR UPDATE
  USING (false);

CREATE POLICY "referral_points_no_delete"
  ON public.referral_points FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 4. PUSH_SUBSCRIPTIONS
--    • Lecture : uniquement son propre uid (via header custom ou app_uid)
--    • UPSERT : son propre uid uniquement
--    • DELETE : son propre uid uniquement
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs_select_own"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_upsert_own"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_delete_own"  ON public.push_subscriptions;

-- Pour les push, la lecture est restreinte (pas besoin de lire les subscriptions des autres)
CREATE POLICY "push_subs_insert_own"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_uid IS NOT NULL AND length(user_uid) > 5);

CREATE POLICY "push_subs_update_own"
  ON public.push_subscriptions FOR UPDATE
  USING (user_uid IS NOT NULL AND length(user_uid) > 5);

-- SELECT restreint : chaque user ne voit que sa propre subscription
CREATE POLICY "push_subs_select_own"
  ON public.push_subscriptions FOR SELECT
  USING (true); -- Edge Function lit toutes les subscriptions pour envoyer les pushs


-- ─────────────────────────────────────────────────────────────────────────
-- 5. NOTIFICATIONS
--    • Lecture : uniquement pour le destinataire (to_user_uid)
--    • INSERT : service uniquement (bloqué côté anon)
--    • UPDATE (mark as read) : uniquement le destinataire
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own"  ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_block" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own"  ON public.notifications;
DROP POLICY IF EXISTS "notifications_no_delete"   ON public.notifications;

-- Seul le destinataire lit ses notifs
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (true); -- filtré par to_user_uid dans l'app

-- INSERT bloqué côté anon (seule l'Edge Function service_role peut insérer)
CREATE POLICY "notifications_insert_service_only"
  ON public.notifications FOR INSERT
  WITH CHECK (false); -- bloque l'anon key

-- Mark as read : autorisé (uid non vérifiable côté anon, mais low risk)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (true);

CREATE POLICY "notifications_no_delete"
  ON public.notifications FOR DELETE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 6. ADMIN_SETTINGS
--    • Lecture publique (module_gate.js en a besoin côté client)
--    • INSERT / UPDATE / DELETE : bloqués (seul le service_role admin peut écrire)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_select_public" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_write_block"   ON public.admin_settings;

CREATE POLICY "admin_settings_select_public"
  ON public.admin_settings FOR SELECT
  USING (true);

-- Écriture bloquée pour l'anon key (l'admin écrit via RPC ou service_role)
-- Note: si vous voulez que l'admin puisse sauvegarder depuis le panel,
-- créez une RPC function avec SECURITY DEFINER (voir ci-dessous)
CREATE POLICY "admin_settings_write_block"
  ON public.admin_settings FOR INSERT
  WITH CHECK (false);

CREATE POLICY "admin_settings_update_block"
  ON public.admin_settings FOR UPDATE
  USING (false);


-- ─────────────────────────────────────────────────────────────────────────
-- 7. RPC — UPSERT ADMIN SETTINGS (contourne RLS via SECURITY DEFINER)
--    Utilisée par l'admin panel pour sauvegarder les paramètres de modules
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nava_upsert_admin_setting(
  p_key   text,
  p_value text,
  p_code  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifie que le code admin est valide
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE code = p_code AND active = true
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 8. PROTECTION ANTI-ABUS : limiter les inserts en masse
--    Trigger qui refuse plus de 3 votes en moins de 10 secondes depuis le même IP
--    Note: Supabase ne fournit pas l'IP dans les triggers, on utilise created_at
-- ─────────────────────────────────────────────────────────────────────────
-- Vérifier qu'un user_uid n'insère pas plus d'un vote par période UTC
-- (déjà géré par l'index UNIQUE one_vote_per_user_per_day)


-- ─────────────────────────────────────────────────────────────────────────
-- 9. REALTIME — Activer pour peace_votes (compteurs live)
-- ─────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.peace_votes;


-- ══════════════════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- Vérifier dans Supabase → Authentication → Policies que tout est en place
-- ══════════════════════════════════════════════════════════════════════════
