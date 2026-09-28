// ═══════════════════════════════════════════════════════════════
//  NAVA PEACE — Edge Function: daily-reminder
//
//  Sends the daily "Choose Peace" push notification to all users.
//  Called automatically by Supabase pg_cron (see migration 20260928).
//
//  Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY> (internal cron only).
//  No admin_code required — this function is never exposed publicly.
//
//  Deploy:
//    supabase functions deploy daily-reminder --no-verify-jwt
// ═══════════════════════════════════════════════════════════════

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPA_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN')        ?? '';
const VAPID_PUB   = Deno.env.get('VAPID_PUBLIC_KEY')          ?? '';
const VAPID_PRIV  = Deno.env.get('VAPID_PRIVATE_KEY')         ?? '';

// Rotating daily messages — cycles by day-of-year
const MESSAGES = [
  { title: 'NAVA PEACE 🕊', body: 'Your daily vote for peace matters. Come choose peace today.' },
  { title: 'Peace is a choice 🌍', body: 'Every day, every person. Make yours count.' },
  { title: 'Time to choose peace 🕊', body: 'Join thousands of peacemakers around the world right now.' },
  { title: 'The world is watching 🌱', body: 'Your voice for peace is needed. Vote today.' },
  { title: 'NAVA PEACE 🕊', body: 'Peace begins with one decision. Make it today.' },
  { title: 'One vote, one world 🌏', body: 'Be part of the global peace movement — choose peace now.' },
  { title: 'Together for peace 🤝', body: 'Your daily peace vote is how change starts.' },
];

function todayMessage(): { title: string; body: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return MESSAGES[dayOfYear % MESSAGES.length];
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Telegram broadcast ────────────────────────────────────────
async function sendTelegramMessage(chatId: number, text: string): Promise<{ ok: boolean; permanent: boolean }> {
  try {
    const res  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:      chatId,
        text,
        parse_mode:   'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🕊 Choose Peace', web_app: { url: 'https://nava-peace.app/peace.html' } }]],
        },
      }),
    });
    const data = await res.json() as { ok: boolean; error_code?: number };
    return { ok: data.ok, permanent: data.error_code === 403 || data.error_code === 400 };
  } catch { return { ok: false, permanent: false }; }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Only allow internal cron calls — validate service role key
  const auth  = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { title, body } = todayMessage();
  const msgText = `<b>${escHtml(title)}</b>\n${escHtml(body)}`;

  const stats = { tg_sent: 0, tg_failed: 0, tg_blocked: 0 };

  // ── Telegram broadcast ──────────────────────────────────────
  if (BOT_TOKEN) {
    const res  = await fetch(
      `${SUPA_URL}/rest/v1/user_telegram?select=telegram_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const rows = await res.json() as { telegram_id: number }[];

    const BATCH = 29;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch   = rows.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(u => sendTelegramMessage(Number(u.telegram_id), msgText)),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.ok)             stats.tg_sent++;
          else if (r.value.permanent) stats.tg_blocked++;
          else                        stats.tg_failed++;
        } else { stats.tg_failed++; }
      }
      if (i + BATCH < rows.length) await sleep(1050);
    }
  }

  console.log('[daily-reminder]', new Date().toISOString(), stats);
  return new Response(JSON.stringify({ ok: true, message: title, ...stats }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
