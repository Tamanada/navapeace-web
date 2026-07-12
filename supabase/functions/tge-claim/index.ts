// ═══════════════════════════════════════════════════════════════
//  NAVA PEACE — Edge Function: tge-claim
//  Records a user's TGE claim intent before the Day 180 mint batch.
//
//  Flow:
//    1. Verify Telegram initData HMAC (real TG identity)
//    2. Resolve user_uid from user_telegram
//    3. Read NAVA balance from nava_token_balances
//    4. Resolve destination wallet: user_tge_wallets > user_wallets > error
//    5. Insert into tge_claims (UNIQUE user_uid — prevents double claim)
//    6. Return { amount, wallet_address, wallet_type, claimed_at }
//
//  Returns 409 with existing claim data if already registered.
//
//  Deploy:
//    supabase functions deploy tge-claim --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

const SUPA_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN')        ?? '';

const ALLOWED_ORIGINS = [
  'https://nava-peace.app',
  'https://nava-peace.world',
  'https://navapeace-web.david-dancingelephant.workers.dev',
];

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

// ── Supabase REST helper (service role) ──────────────────────
async function dbQuery(path: string, method = 'GET', body?: unknown, extra: Record<string, string> = {}) {
  return fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey:         SERVICE_KEY,
      Authorization:  `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'return=representation',
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Telegram initData HMAC validation ────────────────────────
async function verifyTelegramInitData(
  initData: string,
  botToken: string,
): Promise<{ valid: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash   = params.get('hash');
    if (!hash) return { valid: false };
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const webAppDataKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const secretKeyBuf = await crypto.subtle.sign(
      'HMAC', webAppDataKey, new TextEncoder().encode(botToken),
    );
    const sigKey = await crypto.subtle.importKey(
      'raw', secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sigBuf  = await crypto.subtle.sign(
      'HMAC', sigKey, new TextEncoder().encode(dataCheckString),
    );
    const computed = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (computed.length !== hash.length) return { valid: false };
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    if (diff !== 0) return { valid: false };

    const authDate = parseInt(params.get('auth_date') ?? '0', 10);
    if (Math.floor(Date.now() / 1000) - authDate > 86400) return { valid: false }; // 24h window

    const userJson = params.get('user');
    const userId   = userJson ? (JSON.parse(userJson) as { id?: number }).id : undefined;
    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

// ── Resolve uid from Telegram id ─────────────────────────────
async function getUidFromTelegramId(telegramId: number): Promise<string | null> {
  const res  = await dbQuery(
    `user_telegram?telegram_id=eq.${telegramId}&select=user_uid&limit=1`,
  );
  const rows = await res.json() as { user_uid: string }[];
  return rows?.[0]?.user_uid ?? null;
}

// ── MAIN ─────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const { initData, dev_uid } = body as { initData?: string; dev_uid?: string };

    // ── 1. Identity resolution ────────────────────────────────
    const IS_PROD = !!Deno.env.get('DENO_DEPLOYMENT_ID');
    let user_uid: string | null = null;

    if (IS_PROD) {
      if (!initData || initData.length < 10) {
        return json({ error: 'initData required' }, 401, CORS);
      }
      const check = await verifyTelegramInitData(initData, BOT_TOKEN);
      if (!check.valid || !check.userId) {
        return json({ error: 'Unauthorized: invalid initData' }, 401, CORS);
      }
      user_uid = await getUidFromTelegramId(check.userId);
      if (!user_uid) {
        return json({ error: 'User not found — vote first on the PEACE tab' }, 404, CORS);
      }
    } else {
      // Dev mode: accept dev_uid directly (not safe for prod)
      user_uid = dev_uid ?? null;
      if (!user_uid) return json({ error: 'dev_uid required in dev mode' }, 400, CORS);
    }

    // ── 2. Check for existing claim ───────────────────────────
    const existingRes = await dbQuery(
      `tge_claims?user_uid=eq.${encodeURIComponent(user_uid)}&select=*&limit=1`,
    );
    const existingRows = await existingRes.json() as Record<string, unknown>[];
    if (existingRows?.length > 0) {
      return json({ already_claimed: true, claim: existingRows[0] }, 409, CORS);
    }

    // ── 3. Get NAVA balance ───────────────────────────────────
    const balRes  = await dbQuery(
      `nava_token_balances?user_uid=eq.${encodeURIComponent(user_uid)}&select=balance&limit=1`,
    );
    const balRows = await balRes.json() as { balance: string }[];
    const amount  = parseFloat(balRows?.[0]?.balance ?? '0');

    if (amount <= 0) {
      return json({ error: 'No NAVA balance to claim. Mine first on the PEACE tab!' }, 400, CORS);
    }

    // ── 4. Resolve destination wallet ────────────────────────
    // Priority: self-custody (user_tge_wallets) > custodial (user_wallets)
    let wallet_address: string | null = null;
    let wallet_type = 'custodial';

    const tgeWalletRes  = await dbQuery(
      `user_tge_wallets?user_uid=eq.${encodeURIComponent(user_uid)}&select=sol_address,wallet_type&limit=1`,
    );
    const tgeWalletRows = await tgeWalletRes.json() as { sol_address: string; wallet_type: string }[];
    if (tgeWalletRows?.[0]?.sol_address) {
      wallet_address = tgeWalletRows[0].sol_address;
      wallet_type    = tgeWalletRows[0].wallet_type;
    } else {
      const custWalletRes  = await dbQuery(
        `user_wallets?user_uid=eq.${encodeURIComponent(user_uid)}&select=public_key&limit=1`,
      );
      const custWalletRows = await custWalletRes.json() as { public_key: string }[];
      if (custWalletRows?.[0]?.public_key) {
        wallet_address = custWalletRows[0].public_key;
        wallet_type    = 'custodial';
      }
    }

    if (!wallet_address) {
      return json({ error: 'No wallet linked. Create a custodial wallet or link Phantom/Backpack first.' }, 400, CORS);
    }

    // ── 5. Insert claim ───────────────────────────────────────
    const insertRes = await dbQuery('tge_claims', 'POST', {
      user_uid,
      amount,
      wallet_address,
      wallet_type,
      status: 'queued',
    });

    if (!insertRes.ok) {
      const errBody = await insertRes.text();
      // Unique violation = already claimed (race condition)
      if (errBody.includes('unique') || errBody.includes('duplicate')) {
        return json({ error: 'Already claimed (race condition)', already_claimed: true }, 409, CORS);
      }
      console.error('Insert error:', errBody);
      return json({ error: 'Database error — try again' }, 500, CORS);
    }

    const rows = await insertRes.json() as Record<string, unknown>[];
    const claim = rows?.[0] ?? { user_uid, amount, wallet_address, wallet_type, status: 'queued' };

    return json({ success: true, claim }, 200, CORS);

  } catch (e) {
    console.error('tge-claim error:', e);
    return json({ error: String(e) }, 500, CORS);
  }
});
