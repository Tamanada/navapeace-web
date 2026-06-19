-- ── H-2 Fix: referral_points INSERT must validate that user_uid is a real user
-- Previously the WITH CHECK only confirmed the referral_code exists in peace_votes,
-- allowing any caller to inflate a referral count using fake UIDs.
-- Now we also require nava_is_registered(user_uid) to be true.

DROP POLICY IF EXISTS "referral_points_insert_valid" ON public.referral_points;

CREATE POLICY "referral_points_insert_valid" ON public.referral_points
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.nava_is_registered(user_uid)
    AND EXISTS (
      SELECT 1 FROM public.peace_votes
      WHERE peace_votes.referral_code = referral_points.referral_code
    )
  );

-- Sanity: keep DELETE/UPDATE locked (no policy = deny by default, but be explicit)
DROP POLICY IF EXISTS "referral_points_no_delete" ON public.referral_points;
DROP POLICY IF EXISTS "referral_points_no_update" ON public.referral_points;

CREATE POLICY "referral_points_no_delete" ON public.referral_points
  FOR DELETE TO anon, authenticated
  USING (false);

CREATE POLICY "referral_points_no_update" ON public.referral_points
  FOR UPDATE TO anon, authenticated
  USING (false);

-- ── H-3 Doc: push_subscriptions — ensure id column exists for bulk delete
-- The send-push Edge Function now removes 410-Gone subscriptions by id.
-- Verify the column exists (no-op if already present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'push_subscriptions'
      AND column_name  = 'id'
  ) THEN
    ALTER TABLE public.push_subscriptions ADD COLUMN id BIGSERIAL PRIMARY KEY;
  END IF;
END $$;
