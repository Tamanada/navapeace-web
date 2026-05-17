// ═══════════════════════════════════════════════════════════════
//  NAVA PEACE — Edge Function: admin-totp
//  Server-side TOTP management for the admin panel.
//
//  All actions require admin_code for authentication.
//  The TOTP secret is stored in admin_users.totp_secret
//  and is NEVER sent to the client after initial setup.
//
//  Actions (POST JSON body: { action, admin_code, ... }):
//    status   → { enabled: bool }
//    generate → { secret, uri }  — display QR, secret NOT saved yet
//    confirm  → { ok: bool }     — verify token + save secret to DB
//    verify   → { ok: bool }     — verify token (login flow)
//    disable  → { ok: bool }     — verify token + remove secret
//
//  Deploy:
//    supabase functions deploy admin-totp --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

const SUPA_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

// ── Verify admin_code via nava_check_admin RPC ────────────────
async function verifyAdminCode(code: string): Promise<{ valid: boolean; name?: string; role?: string }> {
  try {
    const res  = await dbQuery('rpc/nava_check_admin', 'POST', { input_code: code });
    const data = await res.json() as { valid?: boolean; name?: string; role?: string };
    return { valid: !!data?.valid, name: data?.name, role: data?.role };
  } catch {
    return { valid: false };
  }
}

// ── Get admin row by code ─────────────────────────────────────
async function getAdmin(code: string): Promise<Record<string, unknown> | null> {
  const res  = await dbQuery(`admin_users?code=eq.${encodeURIComponent(code)}&select=id,code,totp_secret,totp_enabled&active=eq.true`);
  const rows = await res.json() as Record<string, unknown>[];
  return rows?.[0] ?? null;
}

// ── Base32 decode (RFC 4648) ──────────────────────────────────
function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean    = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

// ── Base32 encode ─────────────────────────────────────────────
function base32Encode(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '', buffer = 0, bitsLeft = 0;
  for (const byte of bytes) {
    buffer   = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      result  += alphabet[(buffer >>> (bitsLeft - 5)) & 31];
      bitsLeft -= 5;
    }
  }
  if (bitsLeft > 0) result += alphabet[(buffer << (5 - bitsLeft)) & 31];
  return result;
}

// ── Generate a random 20-byte TOTP secret (Base32) ───────────
function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// ── TOTP verification (RFC 6238, SHA-1, 30s window) ──────────
async function totpVerify(secret: string, token: string, windowSize = 1): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counter = Math.floor(Date.now() / 1000 / 30);
  const clean   = token.trim().replace(/\s/g, '');

  for (let i = -windowSize; i <= windowSize; i++) {
    const c   = counter + i;
    const buf = new ArrayBuffer(8);
    const dv  = new DataView(buf);
    // Counter as big-endian 64-bit integer
    dv.setUint32(0, Math.floor(c / 0x100000000) >>> 0, false);
    dv.setUint32(4, c >>> 0, false);

    const hmac   = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const otp    = (
      ((hmac[offset]     & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) <<  8) |
       (hmac[offset + 3] & 0xff)
    ) % 1_000_000;

    // Constant-time string comparison
    const computed = String(otp).padStart(6, '0');
    if (computed.length !== clean.length) continue;
    let diff = 0;
    for (let j = 0; j < computed.length; j++) {
      diff |= computed.charCodeAt(j) ^ clean.charCodeAt(j);
    }
    if (diff === 0) return true;
  }
  return false;
}

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'POST required' }, 405, CORS);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, CORS);
  }

  const { action, admin_code, token, pending_secret } = body as {
    action?: string;
    admin_code?: string;
    token?: string;
    pending_secret?: string;
  };

  if (!action || !admin_code) {
    return json({ error: 'action and admin_code required' }, 400, CORS);
  }

  // ── Authenticate admin_code ───────────────────────────────
  const auth = await verifyAdminCode(admin_code);
  if (!auth.valid) {
    return json({ error: 'Unauthorized' }, 401, CORS);
  }

  const admin = await getAdmin(admin_code);
  if (!admin) {
    return json({ error: 'Admin not found' }, 404, CORS);
  }

  const adminId = admin.id as string;

  // ── action: status ────────────────────────────────────────
  if (action === 'status') {
    return json({ enabled: !!admin.totp_enabled }, 200, CORS);
  }

  // ── action: generate ──────────────────────────────────────
  // Generates a new secret and returns it for QR display.
  // Does NOT save it to DB yet — saving happens on 'confirm'.
  if (action === 'generate') {
    const secret = generateSecret();
    const label  = encodeURIComponent(`NAVA PEACE Admin`);
    const issuer = encodeURIComponent('NAVA PEACE');
    const uri    = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    return json({ secret, uri }, 200, CORS);
  }

  // ── action: confirm ───────────────────────────────────────
  // Verifies the token against pending_secret (never stored in DB until confirmed).
  // On success, saves secret to DB and enables TOTP.
  if (action === 'confirm') {
    if (!token || !pending_secret) {
      return json({ error: 'token and pending_secret required' }, 400, CORS);
    }
    const ok = await totpVerify(pending_secret, token);
    if (!ok) {
      return json({ ok: false }, 200, CORS);
    }
    // Save to DB
    await dbQuery(`admin_users?id=eq.${adminId}`, 'PATCH', {
      totp_secret:  pending_secret,
      totp_enabled: true,
    });
    return json({ ok: true }, 200, CORS);
  }

  // ── action: verify ────────────────────────────────────────
  // Used during login flow — verifies TOTP against stored secret.
  if (action === 'verify') {
    if (!token) return json({ error: 'token required' }, 400, CORS);
    if (!admin.totp_enabled || !admin.totp_secret) {
      return json({ ok: true, skipped: true }, 200, CORS); // TOTP not set up = skip
    }
    const ok = await totpVerify(admin.totp_secret as string, token);
    return json({ ok }, 200, CORS);
  }

  // ── action: disable ───────────────────────────────────────
  // Verifies current token then removes TOTP from DB.
  if (action === 'disable') {
    if (!token) return json({ error: 'token required' }, 400, CORS);
    if (!admin.totp_enabled || !admin.totp_secret) {
      return json({ ok: true }, 200, CORS); // already disabled
    }
    const ok = await totpVerify(admin.totp_secret as string, token);
    if (!ok) return json({ ok: false }, 200, CORS);
    await dbQuery(`admin_users?id=eq.${adminId}`, 'PATCH', {
      totp_secret:  null,
      totp_enabled: false,
    });
    return json({ ok: true }, 200, CORS);
  }

  return json({ error: `Unknown action: ${action}` }, 400, CORS);
});
