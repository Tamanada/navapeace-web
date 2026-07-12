// ═══════════════════════════════════════════════════════════════════════════
//  NAVA PEACE — Edge Function: telegram-bot-webhook
//
//  Handles all Telegram Bot API updates:
//    • pre_checkout_query  → auto-approve (required within 10s)
//    • message.successful_payment → grant NFT badge server-side (idempotent)
//
//  Why: market.html grants badges client-side (openInvoice callback).
//  If the user closes the app before the callback fires, the badge is lost.
//  This webhook provides the reliable server-side fallback.
//
//  Security: Telegram passes X-Telegram-Bot-Api-Secret-Token on every update.
//  We verify it matches TELEGRAM_WEBHOOK_SECRET before processing.
//
//  Setup (one-time):
//    1. Set secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (any random string)
//    2. Register webhook: GET /telegram-bot-webhook?register=1&secret=<WEBHOOK_SECRET>
//       Or curl: https://api.telegram.org/bot<TOKEN>/setWebhook
//                ?url=<EF_URL>&secret_token=<WEBHOOK_SECRET>
//
//  Deploy:
//    supabase functions deploy telegram-bot-webhook --no-verify-jwt
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN      = Deno.env.get('TELEGRAM_BOT_TOKEN')        ?? '';
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')   ?? '';
const SUPA_URL       = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// NFT tiers ordered by value (best first)
const NFT_TIER_ORDER = [
  'PEACE_POWER', 'ANGEL_OF_PEACE', 'PEACE_LEGEND',
  'PEACE_ILLUMINATOR', 'PEACE_GUIDE', 'PEACE_GUARDIAN', 'PEACE_GARDENER', 'PEACE_LOVER',
];

// Bundle definitions matching market.html
const BUNDLES: Record<string, string[]> = {
  PEACE_POWER:       ['PEACE_POWER','ANGEL_OF_PEACE','PEACE_LEGEND','PEACE_ILLUMINATOR','PEACE_GUIDE','PEACE_GUARDIAN','PEACE_GARDENER','PEACE_LOVER'],
  ANGEL_OF_PEACE:    ['ANGEL_OF_PEACE','PEACE_LEGEND','PEACE_ILLUMINATOR','PEACE_GUIDE','PEACE_GUARDIAN','PEACE_GARDENER','PEACE_LOVER'],
  PEACE_LEGEND:      ['PEACE_LEGEND','PEACE_ILLUMINATOR','PEACE_GUIDE','PEACE_GUARDIAN','PEACE_GARDENER','PEACE_LOVER'],
  PEACE_ILLUMINATOR: ['PEACE_ILLUMINATOR','PEACE_GUIDE','PEACE_GUARDIAN','PEACE_GARDENER','PEACE_LOVER'],
  PEACE_GUIDE:       ['PEACE_GUIDE','PEACE_GUARDIAN','PEACE_GARDENER','PEACE_LOVER'],
  PEACE_GUARDIAN:    ['PEACE_GUARDIAN','PEACE_GARDENER','PEACE_LOVER'],
  PEACE_GARDENER:    ['PEACE_GARDENER','PEACE_LOVER'],
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function telegramPost(method: string, body: unknown): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Resolve user_uid from Telegram id ──────────────────────────────────────
async function getUidFromTgId(sb: ReturnType<typeof createClient>, tgId: number): Promise<string | null> {
  const { data } = await sb
    .from('user_telegram')
    .select('user_uid')
    .eq('telegram_id', tgId)
    .maybeSingle();
  return data?.user_uid ?? null;
}

// ── Grant badge(s) idempotently ────────────────────────────────────────────
async function grantBadges(sb: ReturnType<typeof createClient>, uid: string, codes: string[]): Promise<void> {
  const rows = codes.map(code => ({
    user_uid: uid, badge_code: code, payment_method: 'stars',
  }));
  await sb.from('user_badges')
    .upsert(rows, { onConflict: 'user_uid,badge_code' });
}

// ── Log purchase ────────────────────────────────────────────────────────────
async function logPurchase(
  sb: ReturnType<typeof createClient>,
  uid: string,
  tierCode: string,
  isBundle: boolean,
  priceStars: number,
): Promise<void> {
  await sb.from('nft_pending_purchases').upsert(
    {
      user_uid: uid, tier_code: tierCode, is_bundle: isBundle,
      price_stars: priceStars, wallet_addr: 'pending_claim',
      status: 'paid_stars', payment_method: 'stars',
    },
    { onConflict: 'user_uid,tier_code' },
  );
}

// ── Handle successful_payment ───────────────────────────────────────────────
async function handlePayment(update: Record<string, unknown>): Promise<void> {
  const msg = update.message as Record<string, unknown> | undefined;
  if (!msg) return;

  const from    = msg.from as Record<string, unknown> | undefined;
  const payment = msg.successful_payment as Record<string, unknown> | undefined;
  if (!from || !payment) return;

  const tgId   = from.id as number;
  const amount = payment.total_amount as number;  // in Stars
  const payload = String(payment.invoice_payload ?? '');

  console.log(`successful_payment from tg_id=${tgId} amount=${amount} payload=${payload}`);

  const sb = createClient(SUPA_URL, SERVICE_KEY);

  // Resolve uid
  const uid = await getUidFromTgId(sb, tgId);
  if (!uid) {
    console.warn(`No user_uid for tg_id=${tgId} — cannot grant badge`);
    return;
  }

  // Parse payload
  // NFT purchase payload = JSON {"tc":"PEACE_POWER","b":false}
  // Donation payload = "donation_cafe" | "donation_dove" | "donation_arch"
  if (payload.startsWith('{')) {
    let tierCode: string;
    let isBundle: boolean;
    try {
      const p = JSON.parse(payload) as { tc: string; b: boolean };
      tierCode = p.tc;
      isBundle = !!p.b;
    } catch {
      console.error('Could not parse NFT payload:', payload);
      return;
    }

    if (!NFT_TIER_ORDER.includes(tierCode)) {
      console.error('Unknown NFT tier code:', tierCode);
      return;
    }

    const codes = isBundle ? (BUNDLES[tierCode] ?? [tierCode]) : [tierCode];
    await grantBadges(sb, uid, codes);
    await logPurchase(sb, uid, tierCode, isBundle, amount);
    console.log(`✓ Granted badge(s) ${codes.join(',')} to uid=${uid}`);
  } else if (payload.startsWith('donation_')) {
    // Donations: record in nft_pending_purchases as a donation log
    await sb.from('nft_pending_purchases').insert({
      user_uid: uid, tier_code: payload, is_bundle: false,
      price_stars: amount, wallet_addr: 'donation',
      status: 'donation_confirmed', payment_method: 'stars',
    }).catch(() => {/* idempotency: ignore duplicate */});
    console.log(`✓ Recorded donation ${payload} for uid=${uid}`);
  }
}

// ── Self-registration endpoint ─────────────────────────────────────────────
// GET ?register=1&secret=<WEBHOOK_SECRET>
// Calls Telegram's setWebhook API to register this function as the bot webhook.
async function handleRegister(url: URL): Promise<Response> {
  const secret = url.searchParams.get('secret') ?? '';
  if (!secret || secret !== WEBHOOK_SECRET) {
    return json({ error: 'Invalid secret' }, 403);
  }
  const webhookUrl = url.origin + url.pathname;
  const result = await telegramPost('setWebhook', {
    url:          webhookUrl,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'pre_checkout_query'],
  });
  console.log('setWebhook result:', JSON.stringify(result));
  return json({ ok: true, result, webhook_url: webhookUrl });
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Registration endpoint (GET) ───────────────────────────────────────────
  if (req.method === 'GET' && url.searchParams.get('register') === '1') {
    return handleRegister(url);
  }

  // ── Telegram webhook POST ─────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verify Telegram secret token
  const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
    console.warn('Webhook secret mismatch');
    return new Response('Unauthorized', { status: 401 });
  }

  let update: Record<string, unknown>;
  try { update = await req.json(); }
  catch { return new Response('Bad JSON', { status: 400 }); }

  console.log('Telegram update:', JSON.stringify(update).slice(0, 500));

  try {
    // ── pre_checkout_query: MUST answer within 10 seconds ─────────────────
    if (update.pre_checkout_query) {
      const pq = update.pre_checkout_query as Record<string, unknown>;
      await telegramPost('answerPreCheckoutQuery', {
        pre_checkout_query_id: pq.id,
        ok: true,
      });
      console.log(`✓ Answered pre_checkout_query ${pq.id}`);
      return json({ ok: true });
    }

    // ── successful_payment ────────────────────────────────────────────────
    const msg = update.message as Record<string, unknown> | undefined;
    if (msg?.successful_payment) {
      await handlePayment(update);
      return json({ ok: true });
    }

    // All other update types — silently ignore
    return json({ ok: true });

  } catch (e) {
    console.error('Webhook handler error:', e);
    // Always return 200 to prevent Telegram from retrying on errors
    return json({ ok: true, _error: String(e) });
  }
});
