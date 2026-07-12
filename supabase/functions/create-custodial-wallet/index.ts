// ═══════════════════════════════════════════════════════════════
//  NAVA PEACE — Edge Function: create-custodial-wallet
//
//  Creates (or retrieves) a custodial Solana wallet for a user.
//
//  Security model:
//    seed = HMAC-SHA256(CUSTODIAL_MASTER_SECRET, user_uid)  [32 bytes]
//    keypair = Ed25519(seed)
//    ONLY the public_key is stored in user_wallets.
//    Private key is NEVER persisted — re-derived on demand at sign time.
//
//  Flow:
//    1. Verify Telegram initData HMAC (prod) or dev_uid (dev)
//    2. Resolve user_uid from user_telegram
//    3. Derive Ed25519 keypair deterministically
//    4. Upsert public_key into user_wallets (idempotent)
//    5. Return { public_key }
//
//  Required secrets (supabase secrets set):
//    TELEGRAM_BOT_TOKEN
//    CUSTODIAL_MASTER_SECRET   — strong random secret, never rotate without migrating wallets
//    SUPABASE_URL
//    SUPABASE_SERVICE_ROLE_KEY
//
//  Deploy:
//    supabase functions deploy create-custodial-wallet --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPA_URL      = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BOT_TOKEN     = Deno.env.get('TELEGRAM_BOT_TOKEN')        ?? '';
const MASTER_SECRET = Deno.env.get('CUSTODIAL_MASTER_SECRET')   ?? '';

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

// ── Telegram initData HMAC verification ──────────────────────────────────────
async function verifyInitData(
  initData: string, botToken: string
): Promise<{ valid: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash   = params.get('hash');
    if (!hash) return { valid: false };
    params.delete('hash');

    const dcs = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`).join('\n');

    const wk = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sk = await crypto.subtle.importKey(
      'raw', await crypto.subtle.sign('HMAC', wk, new TextEncoder().encode(botToken)),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = Array.from(new Uint8Array(
      await crypto.subtle.sign('HMAC', sk, new TextEncoder().encode(dcs))
    )).map(b => b.toString(16).padStart(2, '0')).join('');

    if (sig.length !== hash.length) return { valid: false };
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ hash.charCodeAt(i);
    if (diff !== 0) return { valid: false };

    // 24-hour window (generous for mini-app sessions)
    const authDate = parseInt(params.get('auth_date') ?? '0', 10);
    if (Math.floor(Date.now() / 1000) - authDate > 86400) return { valid: false };

    const userJson = params.get('user');
    const userId   = userJson ? (JSON.parse(userJson) as { id?: number }).id : undefined;
    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

// ── Deterministic Ed25519 keypair from user_uid ───────────────────────────────
// Uses PKCS8 DER wrapping so we can import the seed as a proper CryptoKey
// without any external library. All native Web Crypto (Deno 1.36+).
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(buf: Uint8Array): string {
  let n = 0n;
  for (const byte of buf) n = (n << 8n) | BigInt(byte);
  const digits: number[] = [];
  while (n > 0n) { digits.unshift(Number(n % 58n)); n /= 58n; }
  const lead = buf.findIndex(b => b !== 0);
  return '1'.repeat(lead < 0 ? 0 : lead) + digits.map(d => B58[d]).join('');
}

async function deriveWalletAddress(uid: string): Promise<string> {
  // Step 1: seed = HMAC-SHA256(CUSTODIAL_MASTER_SECRET, user_uid)
  const masterKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(MASTER_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const seed = new Uint8Array(
    await crypto.subtle.sign('HMAC', masterKey, new TextEncoder().encode(uid))
  ); // 32 bytes

  // Step 2: Wrap seed in PKCS8 DER for Ed25519 import
  // Structure: SEQUENCE { SEQUENCE { OID Ed25519 } OCTET_STRING { OCTET_STRING { seed } } }
  const pkcs8 = new Uint8Array([
    0x30, 0x2e,             // SEQUENCE (46 bytes total)
    0x30, 0x05,             //   SEQUENCE (5 bytes) — AlgorithmIdentifier
    0x06, 0x03,             //     OID (3 bytes)
    0x2b, 0x65, 0x70,      //     1.3.101.112 = id-EdDSA / Ed25519
    0x04, 0x22,             //   OCTET STRING (34 bytes) — private key
    0x04, 0x20,             //     OCTET STRING (32 bytes = seed)
    ...seed,               //     the 32-byte seed
  ]);

  // Step 3: Import as Ed25519 private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'Ed25519' }, true, ['sign'],
  );

  // Step 4: Export as JWK — the 'x' field is the base64url public key
  const jwk = await crypto.subtle.exportKey('jwk', privateKey) as { x?: string };
  if (!jwk.x) throw new Error('Ed25519 JWK missing public key (x field)');

  // Step 5: Decode base64url → raw bytes → base58 (Solana address format)
  const b64 = jwk.x.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - jwk.x.length % 4) % 4);
  const pubBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return toBase58(pubBytes);
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return new Response('Method Not Allowed', { status: 405, headers: CORS });

  if (!MASTER_SECRET) {
    console.error('CUSTODIAL_MASTER_SECRET not configured');
    return json({ error: 'Server configuration error' }, 500, CORS);
  }

  try {
    const body = await req.json() as { initData?: string; dev_uid?: string };
    const { initData, dev_uid } = body;

    // ── Identity resolution ────────────────────────────────────
    const IS_PROD  = !!Deno.env.get('DENO_DEPLOYMENT_ID');
    let user_uid: string | null = null;

    if (IS_PROD) {
      if (!initData || initData.length < 10)
        return json({ error: 'initData required' }, 401, CORS);
      const check = await verifyInitData(initData, BOT_TOKEN);
      if (!check.valid || !check.userId)
        return json({ error: 'Unauthorized: invalid or expired initData' }, 401, CORS);
      const sb = createClient(SUPA_URL, SERVICE_KEY);
      const { data } = await sb
        .from('user_telegram').select('user_uid')
        .eq('telegram_id', check.userId).maybeSingle();
      user_uid = data?.user_uid ?? null;
    } else {
      user_uid = dev_uid ?? null;
    }

    if (!user_uid) return json({ error: 'User not found — vote first on the PEACE tab' }, 404, CORS);

    // ── Derive wallet address ──────────────────────────────────
    const public_key = await deriveWalletAddress(user_uid);

    // ── Upsert into user_wallets (idempotent) ─────────────────
    const sb = createClient(SUPA_URL, SERVICE_KEY);
    const { error: upsertErr } = await sb
      .from('user_wallets')
      .upsert({ user_uid, public_key }, { onConflict: 'user_uid' });

    if (upsertErr) {
      console.error('user_wallets upsert error:', upsertErr);
      // Return the derived key anyway — client can still use it
    }

    return json({ public_key }, 200, CORS);

  } catch (e) {
    console.error('create-custodial-wallet error:', e);
    return json({ error: String(e) }, 500, CORS);
  }
});
