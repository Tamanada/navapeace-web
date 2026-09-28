-- ═══════════════════════════════════════════════════════════════
--  NAVA PEACE — Daily reminder cron job
--  2026-09-28
--
--  Schedules the daily-reminder Edge Function to fire at 08:00 UTC
--  every day (= 15:00 Bangkok / 10:00 Paris / 04:00 New York).
--
--  Requires:
--    • pg_cron extension (enabled in Supabase dashboard → Extensions)
--    • pg_net extension  (enabled by default on Supabase)
--    • daily-reminder EF deployed:
--        supabase functions deploy daily-reminder --no-verify-jwt
-- ═══════════════════════════════════════════════════════════════

-- ── Ensure extensions are enabled ───────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Remove any previous version of this job (idempotent) ────
SELECT cron.unschedule('daily-peace-reminder');

-- ── Schedule: 08:00 UTC every day ───────────────────────────
-- The Authorization header uses the service role key, stored as a
-- Supabase secret (available via current_setting in pg_cron context).
-- Replace SUPABASE_SERVICE_ROLE_KEY_VALUE with the actual key if
-- you set it via `ALTER DATABASE ... SET app.settings.service_key`.
-- Alternatively, run this INSERT manually in the Supabase SQL editor
-- with the key substituted.
SELECT cron.schedule(
  'daily-peace-reminder',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qvbxcxehhenpifhclhvs.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer ' || current_setting('app.settings.service_key', true)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── How to set app.settings.service_key ─────────────────────
-- Run this ONCE in the Supabase SQL editor (never commit this line):
--
--   ALTER DATABASE postgres
--     SET "app.settings.service_key" = '<your-service-role-key>';
--
-- After that, pg_cron can read it via current_setting() without
-- the key ever appearing in migration files or git history.
