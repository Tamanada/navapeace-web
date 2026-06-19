// ── NAVA PEACE · Edge Function: send-push ────────────────────────────────────
// Sends notifications via two channels:
//   1. Telegram Bot API  (primary — covers ALL Telegram users, including iOS)
//   2. Web Push / VAPID  (secondary — covers desktop + Android PWA users)
//
// POST body (JSON):
//   admin_code    string  – required, verified via nava_check_admin RPC
//   to_user_uid?  string  – target one user (omit = broadcast to all)
//   title?        string  – notification title   (default: "NAVA PEACE 🕊")
//   body?         string  – notification body    (default: "Time to choose peace today")
//   url?          string  – app path to open     (default: "/peace.html")
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   SUPABASE_URL                (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY   (auto-injected)
//   VAPID_PUBLIC_KEY            (optional — skip Web Push if absent)
//   VAPID_PRIVATE_KEY           (optional)

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonRes(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── CHANNEL 1: Telegram Bot API ──────────────────────────────────────────────

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  appUrl: string,
): Promise<{ ok: boolean; permanent: boolean }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{
            text:    '🕊 Choose Peace',
            web_app: { url: appUrl },
          }]],
        },
      }),
    });
    const data = await res.json() as { ok: boolean; error_code?: number };
    if (data.ok) return { ok: true, permanent: false };
    // 403 = bot blocked by user, 400 = bad chat_id → never retry
    const permanent = data.error_code === 403 || data.error_code === 400;
    return { ok: false, permanent };
  } catch {
    return { ok: false, permanent: false };
  }
}

// ── CHANNEL 2: Web Push helpers (RFC 8291 / VAPID) ───────────────────────────

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - str.length % 4) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function buildVapidJwt(audience: string, privateKeyRaw: Uint8Array, publicKeyRaw: Uint8Array): Promise<string> {
  const header  = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:contact@nava-peace.app',
  })));
  const sigInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', privateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(sigInput));
  return `${sigInput}.${base64urlEncode(sig)}`;
}

// Returns { status } so caller can detect 410 Gone (expired subscription)
async function sendWebPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: Uint8Array,
  vapidPrivateKey: Uint8Array,
): Promise<{ httpStatus: number }> {
  const url       = new URL(sub.endpoint);
  const audience  = `${url.protocol}//${url.host}`;
  const jwt       = await buildVapidJwt(audience, vapidPrivateKey, vapidPublicKey);
  const vapidAuth = `vapid t=${jwt},k=${base64urlEncode(vapidPublicKey)}`;

  const authSecret    = base64urlDecode(sub.keys.auth);
  const clientPub     = base64urlDecode(sub.keys.p256dh);
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicRaw  = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));
  const clientPublicKey  = await crypto.subtle.importKey('raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256));

  async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
    const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const prk    = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array() }, ikmKey, 256);
    const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info }, prkKey, len * 8));
  }

  const salt          = crypto.getRandomValues(new Uint8Array(16));
  const authInfo      = new TextEncoder().encode('WebPush: info\0');
  const keyInfo       = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo     = new TextEncoder().encode('Content-Encoding: nonce\0');

  const authInput = new Uint8Array(authInfo.length + clientPub.length + serverPublicRaw.length);
  authInput.set(authInfo); authInput.set(clientPub, authInfo.length); authInput.set(serverPublicRaw, authInfo.length + clientPub.length);
  const prk = await hkdf(authSecret, sharedBits, authInput, 32);

  const keyInfoFull = new Uint8Array(keyInfo.length + clientPub.length + serverPublicRaw.length);
  keyInfoFull.set(keyInfo); keyInfoFull.set(clientPub, keyInfo.length); keyInfoFull.set(serverPublicRaw, keyInfo.length + clientPub.length);
  const nonceInfoFull = new Uint8Array(nonceInfo.length + clientPub.length + serverPublicRaw.length);
  nonceInfoFull.set(nonceInfo); nonceInfoFull.set(clientPub, nonceInfo.length); nonceInfoFull.set(serverPublicRaw, nonceInfo.length + clientPub.length);

  const contentKey = await hkdf(salt, prk, keyInfoFull, 16);
  const nonce      = await hkdf(salt, prk, nonceInfoFull, 12);
  const aesKey     = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);

  const plaintext = new TextEncoder().encode(payload);
  const padded    = new Uint8Array(Math.max(plaintext.length + 2, 128));
  padded.set(plaintext);
  padded[plaintext.length] = 2;
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  const rs     = new DataView(new ArrayBuffer(4)); rs.setUint32(0, 4096);
  const header = new Uint8Array(16 + 4 + 1 + serverPublicRaw.length);
  header.set(salt);
  header.set(new Uint8Array(rs.buffer), 16);
  header[20] = serverPublicRaw.length;
  header.set(serverPublicRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header); body.set(ciphertext, header.length);

  const pushRes = await fetch(sub.endpoint, {
    method:  'POST',
    headers: {
      'Authorization':    vapidAuth,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL':              '86400',
    },
    body,
  });
  return { httpStatus: pushRes.status };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return jsonRes({ error: 'Invalid JSON' }, 400, CORS); }

  const { admin_code, to_user_uid, title, body: msgBody, url } = body as {
    admin_code?: string; to_user_uid?: string;
    title?: string; body?: string; url?: string;
  };

  if (!admin_code) return jsonRes({ error: 'Unauthorized' }, 401, CORS);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Verify admin code ────────────────────────────────────────────────────
  const { data: isAdmin, error: authErr } = await supabase.rpc('nava_check_admin', { input_code: admin_code });
  if (authErr || !isAdmin?.valid) return jsonRes({ error: 'Unauthorized' }, 401, CORS);

  const BOT_TOKEN  = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  const notifTitle = title  || 'NAVA PEACE 🕊';
  const notifBody  = msgBody || 'Time to choose peace today';
  const appUrl     = `https://nava-peace.app${(url || '/peace.html')}`;
  const msgText    = `<b>${notifTitle}</b>\n${notifBody}`;

  const stats = {
    tg_sent: 0, tg_failed: 0, tg_blocked: 0,
    push_sent: 0, push_failed: 0, push_expired_removed: 0,
  };

  // ── CHANNEL 1 : Telegram Bot API ─────────────────────────────────────────
  if (BOT_TOKEN) {
    let tgQuery = supabase
      .from('user_telegram')
      .select('telegram_id, user_uid');
    if (to_user_uid) tgQuery = tgQuery.eq('user_uid', to_user_uid);

    const { data: tgUsers, error: tgErr } = await tgQuery;

    if (!tgErr && tgUsers && tgUsers.length > 0) {
      // 29 messages/batch — safely under Telegram's 30 msg/s limit
      const BATCH = 29;
      for (let i = 0; i < tgUsers.length; i += BATCH) {
        const batch   = tgUsers.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(u => sendTelegramMessage(BOT_TOKEN, u.telegram_id, msgText, appUrl))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            if (r.value.ok)            stats.tg_sent++;
            else if (r.value.permanent) stats.tg_blocked++;
            else                        stats.tg_failed++;
          } else {
            stats.tg_failed++;
          }
        }
        // Respect rate limit between batches (skip delay after last batch)
        if (i + BATCH < tgUsers.length) await sleep(1050);
      }
    }
  }

  // ── CHANNEL 2 : Web Push (desktop + Android PWA) ─────────────────────────
  const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    const pubKeyBytes  = base64urlDecode(VAPID_PUBLIC_KEY);
    const privKeyBytes = base64urlDecode(VAPID_PRIVATE_KEY);

    const pushPayload = JSON.stringify({ title: notifTitle, body: notifBody, url: url || '/peace.html' });

    let pushQuery = supabase.from('push_subscriptions').select('id, user_uid, subscription');
    if (to_user_uid) pushQuery = pushQuery.eq('user_uid', to_user_uid);
    const { data: pushRows, error: pushErr } = await pushQuery;

    if (!pushErr && pushRows && pushRows.length > 0) {
      const BATCH = 50;
      const expiredIds: number[] = [];

      for (let i = 0; i < pushRows.length; i += BATCH) {
        const batch   = pushRows.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(row => sendWebPush(row.subscription, pushPayload, pubKeyBytes, privKeyBytes))
        );
        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          if (r.status === 'fulfilled') {
            const { httpStatus } = r.value;
            if (httpStatus < 300) {
              stats.push_sent++;
            } else if (httpStatus === 410 || httpStatus === 404) {
              // Subscription permanently gone — queue for removal
              expiredIds.push(batch[j].id);
              stats.push_expired_removed++;
            } else {
              stats.push_failed++;
            }
          } else {
            stats.push_failed++;
          }
        }
      }

      // Remove expired subscriptions in bulk
      if (expiredIds.length > 0) {
        await supabase.from('push_subscriptions').delete().in('id', expiredIds);
      }
    }
  }

  return jsonRes(stats, 200, CORS);
});
