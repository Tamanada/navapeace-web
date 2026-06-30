-- NAVA PEACE · Discovery Rewards
-- Each new section discovered = +1 NAVA credited to nava_token_balances
-- Retroactive credit for existing rows on first run (idempotent via rewarded_at)

ALTER TABLE nava_discoveries ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION nava_credit_discovery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.rewarded_at IS NULL THEN
    INSERT INTO nava_token_balances (user_uid, balance, total_earned, updated_at)
    VALUES (NEW.user_uid, 1, 1, NOW())
    ON CONFLICT (user_uid) DO UPDATE
      SET balance      = nava_token_balances.balance + 1,
          total_earned = nava_token_balances.total_earned + 1,
          updated_at   = NOW();
    NEW.rewarded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nava_discovery_reward ON nava_discoveries;
CREATE TRIGGER trg_nava_discovery_reward
  BEFORE INSERT ON nava_discoveries
  FOR EACH ROW EXECUTE FUNCTION nava_credit_discovery();

-- Retroactive credit (runs once — future runs are no-ops via rewarded_at IS NULL)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT user_uid, COUNT(*) AS cnt
    FROM nava_discoveries
    WHERE rewarded_at IS NULL
    GROUP BY user_uid
  LOOP
    INSERT INTO nava_token_balances (user_uid, balance, total_earned, updated_at)
    VALUES (r.user_uid, r.cnt, r.cnt, NOW())
    ON CONFLICT (user_uid) DO UPDATE
      SET balance      = nava_token_balances.balance + r.cnt,
          total_earned = nava_token_balances.total_earned + r.cnt,
          updated_at   = NOW();
  END LOOP;
  UPDATE nava_discoveries SET rewarded_at = NOW() WHERE rewarded_at IS NULL;
END;
$$;
