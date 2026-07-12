-- ══════════════════════════════════════════════════════════════════════════════
-- NAVA PEACE — S3-B : Add payment_method to user_badges
-- Required by telegram-webhook grantBadge() and market.html payWithStars().
-- Without this column, every Stars purchase upsert fails with a PostgREST error.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'stars';
