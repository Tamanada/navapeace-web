-- ═══════════════════════════════════════════════════════════
--  NAVA PEACE — Merch Orders  (Stripe web shop)
--  Tracks every checkout attempt from nava-peace.world
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.merch_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT        UNIQUE NOT NULL,
  yoycol_order_sn   TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending',
  -- pending → paid → fulfilled → failed
  items             JSONB       NOT NULL DEFAULT '[]',
  customer_email    TEXT,
  shipping          JSONB,
  total_usd         NUMERIC(10,2),
  error_detail      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS merch_orders_updated_at ON public.merch_orders;
CREATE TRIGGER merch_orders_updated_at
  BEFORE UPDATE ON public.merch_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS on: anon has no access; service role bypasses automatically
ALTER TABLE public.merch_orders ENABLE ROW LEVEL SECURITY;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS merch_orders_stripe_idx ON public.merch_orders (stripe_session_id);
CREATE INDEX IF NOT EXISTS merch_orders_status_idx  ON public.merch_orders (status);
