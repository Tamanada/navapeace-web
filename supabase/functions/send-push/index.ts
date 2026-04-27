// ── NAVA PEACE · Edge Function: send-push ────────────────────────────────────
// Sends Web Push notifications to one user or all users.
//
// POST body (JSON):
//   to_user_uid?  string   – target user (omit = broadcast to all)
//   title?        string   – notification title  (default: "NAVA PEACE")
//   body?         string   – notification body   (default: "Time to choose peace today 🕊")
//   url?          string   – click target URL     (default: "/peace.html")
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   SUPABASE_URL            (injected automatically)
//   SUPABASE_SERVICE_ROLE_KEY (injected automatically)

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Minimal Web Push implementation (no npm dependency) ──────────────────────
// Uses the Web Crypto API available in Deno to sign VAPID JWTs and encrypt
// the push message payload.

async function importPrivateKey(raw: Uint8Array) {
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveKey', 'deriveBits']
  );
}

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

  // Import as ECDSA signing key
  const key = await crypto.subtle.importKey(
    'raw', privateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(sigInput)
  );
  return `${sigInput}.${base64urlEncode(sig)}`;
}

async function sendPushToEndpoint(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: Uint8Array,
  vapidPrivateKey: Uint8Array,
): Promise<Response> {
  const url       = new URL(sub.endpoint);
  const audience  = `${url.protocol}//${url.host}`;
  const jwt       = await buildVapidJwt(audience, vapidPrivateKey, vapidPublicKey);
  const vapidAuth = `vapid t=${jwt},k=${base64urlEncode(vapidPublicKey)}`;

  // Encrypt payload using ECDH + AES-128-GCM (RFC 8291)
  const authSecret  = base64urlDecode(sub.keys.auth);
  const clientPub   = base64urlDecode(sub.keys.p256dh);
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

  const serverPublicRaw  = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));
  const clientPublicKey  = await crypto.subtle.importKey('raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256));

  // HKDF to derive content-encryption key and nonce
  async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
    const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const prk    = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array() }, ikmKey, 256);
    const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info }, prkKey, len * 8));
  }

  const salt    = crypto.getRandomValues(new Uint8Array(16));
  const keyInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  // Build auth info
  const authInfo = new TextEncoder().encode('WebPush: info\0');
  const authInput = new Uint8Array(authInfo.length + clientPub.length + serverPublicRaw.length);
  authInput.set(authInfo); authInput.set(clientPub, authInfo.length); authInput.set(serverPublicRaw, authInfo.length + clientPub.length);
  const prk = await hkdf(authSecret, sharedBits, authInput, 32);

  const keyInfoFull = new Uint8Array(keyInfo.length + clientPub.length + serverPublicRaw.length);
  keyInfoFull.set(keyInfo); keyInfoFull.set(clientPub, keyInfo.length); keyInfoFull.set(serverPublicRaw, keyInfo.length + clientPub.length);
  const nonceInfoFull = new Uint8Array(nonceInfo.length + clientPub.length + serverPublicRaw.length);
  nonceInfoFull.set(nonceInfo); nonceInfoFull.set(clientPub, nonceInfo.length); nonceInfoFull.set(serverPublicRaw, nonceInfo.length + clientPub.length);

  const contentKey = await hkdf(salt, prk, keyInfoFull, 16);
  const nonce      = await hkdf(salt, prk, nonceInfoFull, 12);

  const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
  const plaintext = new TextEncoder().encode(payload);
  // Pad to at least 3053 bytes to avoid leaking payload length
  const padded = new Uint8Array(Math.max(plaintext.length + 2, 128));
  padded.set(plaintext);
  padded[plaintext.length] = 2; // padding delimiter

  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  // Build RFC 8291 content header (salt + rs + keyid_len + server_public_key)
  const rs     = new DataView(new ArrayBuffer(4)); rs.setUint32(0, 4096);
  const header = new Uint8Array(16 + 4 + 1 + serverPublicRaw.length);
  header.set(salt);
  header.set(new Uint8Array(rs.buffer), 16);
  header[20] = serverPublicRaw.length;
  header.set(serverPublicRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header); body.set(ciphertext, header.length);

  return fetch(sub.endpoint, {
    method:  'POST',
    headers: {
      'Authorization':   vapidAuth,
      'Content-Type':    'application/octet-stream',
      'Content-Encoding':'aes128gcm',
      'TTL':             '86400',
    },
    body,
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { to_user_uid, title, body, url } = await req.json();

    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const pubKeyBytes  = base64urlDecode(VAPID_PUBLIC_KEY);
    const privKeyBytes = base64urlDecode(VAPID_PRIVATE_KEY);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let query = supabase.from('push_subscriptions').select('subscription');
    if (to_user_uid) query = query.eq('user_uid', to_user_uid);
    const { data, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({
      title: title || 'NAVA PEACE',
      body:  body  || '🕊 Time to choose peace today',
      url:   url   || '/peace.html',
    });

    const results = await Promise.allSettled(
      (data || []).map(row => sendPushToEndpoint(row.subscription, payload, pubKeyBytes, privKeyBytes))
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
