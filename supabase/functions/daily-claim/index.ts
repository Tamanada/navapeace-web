// NAVA PEACE — Edge Function: daily-claim
// Appelée quand l'user appuie sur le bouton paix dans peace.html
// Règle : reward calculé SERVER-SIDE depuis nava_compute_reward(), jamais depuis le client
//
// POST body: { initData: string }  (Telegram WebApp.initData)
// Response : { success, total_reward, new_balance, phase, streak_bonus, referral_bonus, message }
//
// Deploy:
//   supabase functions deploy daily-claim

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status = 200, cors: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ── Validation initData Telegram (HMAC-SHA256) ────────────────────────────────
async function verifyInitData(initData: string, botToken: string): Promise<{ valid: boolean; userId?: number }> {
  try {
    const params = new URLSearchParams(initData);
    const hash   = params.get('hash');
    if (!hash) return { valid: false };

    // 24h window (generous for mini-app sessions left open in background)
    const authDate = parseInt(params.get('auth_date') ?? '0', 10);
    if (Date.now() / 1000 - authDate > 86400) return { valid: false };

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const enc     = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const secret  = await crypto.subtle.sign('HMAC', baseKey, enc.encode(botToken));
    const sigKey  = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig     = await crypto.subtle.sign('HMAC', sigKey, enc.encode(dataCheckString));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison
    const a = enc.encode(computed);
    const b = enc.encode(hash);
    if (a.length !== b.length) return { valid: false };
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    if (diff !== 0) return { valid: false };

    const userJson = params.get('user');
    const userId   = userJson ? JSON.parse(userJson).id : undefined;
    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405, CORS);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400, CORS); }

  const { initData, uid } = body as { initData?: string; uid?: string };

  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  const IS_PROD   = !!Deno.env.get('DENO_DEPLOYMENT_ID');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let userUid: string;

  if (IS_PROD) {
    // ── Production : validation initData obligatoire ──────────────────────────
    if (!initData) return json({ error: 'initData required' }, 401, CORS);
    const { valid, userId } = await verifyInitData(initData, BOT_TOKEN);
    if (!valid || !userId)  return json({ error: 'Invalid initData' }, 401, CORS);

    // Récupérer le uid Supabase depuis user_telegram
    const { data: tgRow, error: tgErr } = await supabase
      .from('user_telegram')
      .select('user_uid')
      .eq('telegram_id', userId)
      .maybeSingle();
    if (tgErr || !tgRow?.user_uid) return json({ error: 'User not found' }, 404, CORS);
    userUid = tgRow.user_uid;
  } else {
    // ── Dev local : uid direct accepté ───────────────────────────────────────
    if (!uid) return json({ error: 'uid required in dev mode' }, 400, CORS);
    userUid = uid;
  }

  // ── Exécuter le claim (tout le calcul est server-side en SQL) ─────────────
  const { data, error } = await supabase.rpc('nava_execute_claim', { p_uid: userUid });

  if (error) {
    console.error('nava_execute_claim error:', error);
    return json({ error: 'Claim failed', detail: error.message }, 500, CORS);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return json(result, 200, CORS);
});
