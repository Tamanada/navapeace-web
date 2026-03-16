-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE – Telegram Integration
--  Colle ce SQL dans : Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne "source" pour identifier d'où vient l'utilisateur
--    Valeurs possibles : 'web' (défaut), 'telegram'
ALTER TABLE public.peace_votes
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

-- 2. Ajouter telegram_id pour lier un vote à un compte Telegram
ALTER TABLE public.peace_votes
  ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- 3. Index pour filtrer rapidement par source
CREATE INDEX IF NOT EXISTS peace_votes_source_idx
  ON public.peace_votes (source);

-- 4. Index pour retrouver les votes d'un utilisateur Telegram
CREATE INDEX IF NOT EXISTS peace_votes_telegram_id_idx
  ON public.peace_votes (telegram_id);

-- ═══════════════════════════════════════════════════════════════
--  Vérification : SELECT DISTINCT source FROM peace_votes;
-- ═══════════════════════════════════════════════════════════════
