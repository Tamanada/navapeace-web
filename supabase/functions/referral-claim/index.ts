// ═══════════════════════════════════════════════════════════════
//  NAVA PEACE — Edge Function: referral-claim
//  Server-side referral NFT claim — prevents ref_code spoofing.
//
//  Flow:
//    1. Verify Telegram initData HMAC (confirms real TG identity)
//    2. Derive uid from user_telegram (no client-supplied uid trusted)
//    3. Call nava_claim_referral_rewards(uid) — SECURITY DEFINER fn
//       that reads the real ref_code from peace_votes, counts referrals,
//       and atomically grants eligible tier badges with quota guard.
//
//  Actions (POST JSON body: { action, initData }):
//    check → { eligible, ref_count, claimed }   read-only
//    claim → { claimed, skipped, ref_count }     writes to DB
//
//  Deploy:
//    supabase functions deploy referral-claim --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

const SUPA_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN')        ?? '';

const ALLOWED_ORIGINS = [
  'https://nava-peace.app',
  'https://nava-peace.world',
  'https://navapeace-web.david-dancingelephant.workers.dev',
];

// Mirror of REFERRAL_THRESHOLDS in market.html (for 'check' action)
const REFERRAL_THRESHOLDS = [
  { code: 'PEACE_GARDENER',    refsNeeded: 100   },
  { code: 'PEACE_GUARDIAN',    refsNeeded: 250   },
  { code: 'PEACE_GUIDE',       refsNeeded: 500   },
  { code: 'PEACE_ILLUMINATOR', refsNeeded: 1000  },
  { code: 'PEACE_LEGEND',      refsNeeded: 2500  },
  { code: 'ANGEL_OF_PEACE',    refsNeeded: 5000  },
  { code: 'PEACE_POWER',       refsNeeded: 10000 },
] as const;

function corsHeaders(req: Request): Record<string, string> {
  const origin  = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ── Supabase DB helper (service role) ────────────────────────
async function dbQuery(path: string, method = 'GET', body?: unknown) {
  return fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey:         SERVICE_KEY,
      Authorization:  `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Telegram initData HMAC validation ────────────────────────
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function verifyTelegramInitData(
  initData: string,
  botToken: string,
): Promise<{ valid: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash   = params.get('hash');
    if (!hash) return { valid: false };
    params.delete('hash');

    // data_check_string = sorted key=value pairs joined by \n
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const secretKeyBuf = await crypto.subtle.sign(
      'HMAC', webAppDataKey, new TextEncoder().encode(botToken),
    );
    const sigKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf  = await crypto.subtle.sign(
      'HMAC', sigKey, new TextEncoder().encode(dataCheckString),
    );
    const computed = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison
    if (computed.length !== hash.length) return { valid: false };
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    if (diff !== 0) return { valid: false };

    // auth_date must be <1 hour old
    const authDate = parseInt(params.get('auth_date') ?? '0', 10);
    if (Math.floor(Date.now() / 1000) - authDate > 3600) return { valid: false };

    // Extract Telegram user id
    const userJson = params.get('user');
    const userId   = userJson ? (JSON.parse(userJson) as { id?: number }).id : undefined;

    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

// ── Look up uid from Telegram id ─────────────────────────────
async function getUidFromTelegramId(telegramId: number): Promise<string | null> {
  const res  = await dbQuery(
    `user_telegram?telegram_id=eq.${telegramId}&select=user_uid&limit=1`,
  );
  const rows = await res.json() as { user_uid: string }[];
  return rows?.[0]?.user_uid ?? null;
}

// ── Call the SECURITY DEFINER RPC via service_role ───────────
async function callClaimRpc(uid: string): Promise<Record<string, unknown>> {
  const res  = await fetch(`${SUPA_URL}/rest/v1/rpc/nava_claim_referral_rewards`, {
    method:  'POST',
    headers: {
      apikey:         SERVICE_KEY,
      Authorization:  `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_uid: uid }),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

// ── 'check' action — read-only, no DB writes ─────────────────
async function checkEligibility(uid: string): Promise<Record<string, unknown>> {
  // Get real ref_code
  const pvRes  = await dbQuery(
    `peace_votes?user_uid=eq.${encodeURIComponent(uid)}&select=referral_code&limit=1`,
  );
  const pvRows = await pvRes.json() as { referral_code: string }[];
  const refCode = pvRows?.[0]?.referral_code;
  if (!refCode) return { ref_count: 0, eligible: [], claimed: [] };

  // Count referrals
  const cntRes = await dbQuery(
    `referral_points?referral_code=eq.${encodeURIComponent(refCode)}&select=id`,
    'GET',
  );
  // HEAD count — use content-range header
  const cntFull = await fetch(
    `${SUPA_URL}/rest/v1/referral_points?referral_code=eq.${encodeURIComponent(refCode)}&select=id`,
    {
      method:  'HEAD',
      headers: {
        apikey:        SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer:        'count=exact',
      },
    },
  );
  const range    = cntFull.headers.get('content-range') ?? '';
  const refCount = parseInt(range.split('/')[1] ?? '0', 10);

  // Already claimed
  const claimedRes  = await dbQuery(
    `nft_referral_claims?user_uid=eq.${encodeURIComponent(uid)}&select=tier_code`,
  );
  const claimedRows = await claimedRes.json() as { tier_code: string }[];
  const claimed     = claimedRows.map(r => r.tier_code);
  const claimedSet  = new Set(claimed);

  const eligible = REFERRAL_THRESHOLDS
    .filter(t => refCount >= t.refsNeeded && !claimedSet.has(t.code))
    .map(t => t.code);

  return { ref_count: refCount, eligible, claimed };
}

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'POST required' }, 405, CORS);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400, CORS); }

  const { action, initData } = body as { action?: string; initData?: string };
  if (!action) return json({ error: 'action required' }, 400, CORS);

  // ── Validate Telegram initData ───────────────────────────
  // Skip only in local dev (no DENO_DEPLOYMENT_ID).
  const IS_PROD = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined;
  if (!BOT_TOKEN && IS_PROD) {
    return json({ error: 'Server misconfigured — missing bot token' }, 500, CORS);
  }

  let telegramUserId: number | undefined;

  if (IS_PROD) {
    if (!initData || typeof initData !== 'string' || initData.length < 10) {
      return json({ error: 'initData required' }, 401, CORS);
    }
    const verification = await verifyTelegramInitData(initData, BOT_TOKEN);
    if (!verification.valid) {
      return json({ error: 'Unauthorized: invalid or expired initData' }, 401, CORS);
    }
    telegramUserId = verification.userId;
    if (!telegramUserId) {
      return json({ error: 'Could not extract Telegram user id from initData' }, 401, CORS);
    }
  } else {
    // Local dev: allow uid to be passed directly for testing
    const devUid = body.uid as string | undefined;
    if (!devUid) return json({ error: 'uid required in local dev mode' }, 400, CORS);

    if (action === 'check') return json(await checkEligibility(devUid), 200, CORS);
    if (action === 'claim') return json(await callClaimRpc(devUid), 200, CORS);
    return json({ error: `Unknown action: ${action}` }, 400, CORS);
  }

  // ── Derive real uid from Telegram id ────────────────────
  const uid = await getUidFromTelegramId(telegramUserId);
  if (!uid) {
    // User has not registered yet
    return json({ error: 'User not found — complete registration first' }, 404, CORS);
  }

  // ── action: check ────────────────────────────────────────
  if (action === 'check') {
    return json(await checkEligibility(uid), 200, CORS);
  }

  // ── action: claim ────────────────────────────────────────
  if (action === 'claim') {
    const result = await callClaimRpc(uid);
    return json(result, 200, CORS);
  }

  return json({ error: `Unknown action: ${action}` }, 400, CORS);
});
