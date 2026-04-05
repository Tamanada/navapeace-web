-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE – Fusion de comptes
--  BOLDSTAR4251 (web) → MOON-RZ (Telegram)
--  Colle ce SQL dans : Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ÉTAPE 0 : Identifier les user_uid des deux comptes
-- (Exécute d'abord ce SELECT pour vérifier)
SELECT pm.user_uid, pm.pseudo,
       (SELECT COUNT(*) FROM peace_votes pv WHERE pv.user_uid = pm.user_uid) AS total_votes,
       (SELECT MIN(created_at) FROM peace_votes pv WHERE pv.user_uid = pm.user_uid) AS first_vote,
       (SELECT MAX(created_at) FROM peace_votes pv WHERE pv.user_uid = pm.user_uid) AS last_vote
FROM peace_messages pm
WHERE pm.pseudo IN ('BOLDSTAR4251', 'MOON-RZ');

-- ═══════════════════════════════════════════════════════════════
-- APRÈS VÉRIFICATION, exécute le bloc ci-dessous
-- Remplace les UID si nécessaire (ils seront visibles dans le SELECT ci-dessus)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  old_uid TEXT;  -- BOLDSTAR4251 (web)
  new_uid TEXT;  -- MOON-RZ (Telegram)
  old_ref TEXT;  -- referral code de BOLDSTAR4251
  new_ref TEXT;  -- referral code de MOON-RZ
BEGIN
  -- Trouver les user_uid à partir des pseudos
  SELECT user_uid INTO old_uid FROM peace_messages WHERE pseudo = 'BOLDSTAR4251';
  SELECT user_uid INTO new_uid FROM peace_messages WHERE pseudo = 'MOON-RZ';

  IF old_uid IS NULL THEN RAISE EXCEPTION 'Pseudo BOLDSTAR4251 introuvable'; END IF;
  IF new_uid IS NULL THEN RAISE EXCEPTION 'Pseudo MOON-RZ introuvable'; END IF;

  RAISE NOTICE 'Fusion: % (BOLDSTAR4251) → % (MOON-RZ)', old_uid, new_uid;

  -- 1. Récupérer le referral_code de BOLDSTAR4251 (celui qu'on veut garder)
  SELECT referral_code INTO old_ref FROM peace_votes
    WHERE user_uid = old_uid AND referral_code IS NOT NULL LIMIT 1;
  -- Récupérer le referral_code actuel de MOON-RZ (celui qu'on va remplacer)
  SELECT referral_code INTO new_ref FROM peace_votes
    WHERE user_uid = new_uid AND referral_code IS NOT NULL LIMIT 1;

  RAISE NOTICE 'Referral: BOLDSTAR4251=% → MOON-RZ=%', old_ref, new_ref;

  -- 2. Transférer les votes (ignorer les doublons si même jour)
  UPDATE peace_votes
  SET user_uid = new_uid
  WHERE user_uid = old_uid
    AND NOT EXISTS (
      SELECT 1 FROM peace_votes pv2
      WHERE pv2.user_uid = new_uid
        AND DATE(pv2.created_at) = DATE(peace_votes.created_at)
    );

  -- Supprimer les votes restants de l'ancien compte (doublons de jours)
  DELETE FROM peace_votes WHERE user_uid = old_uid;

  -- 3. Remplacer le referral_code de MOON-RZ par celui de BOLDSTAR4251
  --    Ainsi les QR/liens déjà partagés continuent de fonctionner
  IF old_ref IS NOT NULL THEN
    -- Tous les votes de MOON-RZ prennent le referral_code de BOLDSTAR4251
    UPDATE peace_votes SET referral_code = old_ref WHERE user_uid = new_uid;

    -- Si MOON-RZ avait un ancien code, les filleuls pointent vers le nouveau
    IF new_ref IS NOT NULL AND new_ref <> old_ref THEN
      UPDATE peace_votes SET referred_by = old_ref WHERE referred_by = new_ref;
      UPDATE referral_points SET referral_code = old_ref WHERE referral_code = new_ref;
    END IF;
  END IF;

  -- 4. Transférer les notifications
  UPDATE notifications SET to_user_uid = new_uid WHERE to_user_uid = old_uid;
  UPDATE notifications SET from_user_uid = new_uid WHERE from_user_uid = old_uid;

  -- 5. Supprimer l'ancien compte de peace_messages
  DELETE FROM peace_messages WHERE user_uid = old_uid;

  -- 6. Supprimer l'ancien push_subscription
  DELETE FROM push_subscriptions WHERE user_uid = old_uid;

  RAISE NOTICE 'Fusion terminée ! BOLDSTAR4251 → MOON-RZ';
END $$;

-- ═══════════════════════════════════════════════════════════════
--  Vérification finale
-- ═══════════════════════════════════════════════════════════════
SELECT pm.user_uid, pm.pseudo,
       (SELECT COUNT(*) FROM peace_votes pv WHERE pv.user_uid = pm.user_uid) AS total_votes
FROM peace_messages pm
WHERE pm.pseudo = 'MOON-RZ';
