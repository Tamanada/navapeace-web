-- ═══════════════════════════════════════════════════════════
--  NAVA PEACE — Referral code server-side validation
--  Returns TRUE only if the code exists in peace_votes.referral_code
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.nava_validate_ref_code(input_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.peace_votes
    WHERE referral_code = UPPER(TRIM(input_code))
    LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION public.nava_validate_ref_code TO anon, authenticated;
