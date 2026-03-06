-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE – Setup Supabase
--  Colle ce SQL dans : Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. Créer la table peace_votes (sans authentification requise)
CREATE TABLE IF NOT EXISTS public.peace_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country    TEXT NOT NULL,
  age        INTEGER,
  gender     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activer Row Level Security
ALTER TABLE public.peace_votes ENABLE ROW LEVEL SECURITY;

-- 3. Autoriser tout le monde à insérer (formulaire public)
CREATE POLICY "public_insert" ON public.peace_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4. Autoriser la lecture publique (pour la carte)
CREATE POLICY "public_select" ON public.peace_votes
  FOR SELECT TO anon, authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════
--  Vérification : après exécution tu devrais voir la table
--  dans Database → Tables
-- ═══════════════════════════════════════════════════════════════
