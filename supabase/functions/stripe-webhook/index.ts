// ═══════════════════════════════════════════════════════════
//  NAVA PEACE — Stripe Webhook  (Supabase Edge Function)
//
//  ⚠️  PROXY ONLY — forwards every request to the canonical
//  implementation in yoycol-proxy?action=stripe_webhook which
//  includes idempotency checks, atomic lock, and admin alerts.
//
//  Both endpoints may be registered in Stripe Dashboard.
//  This function ensures a single fulfillment code path.
//
//  Canonical endpoint:
//    https://qvbxcxehhenpifhclhvs.supabase.co/functions/v1/yoycol-proxy?action=stripe_webhook
// ═══════════════════════════════════════════════════════════

const SUPA_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Forward raw body and Stripe signature to the canonical handler
  const rawBody   = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';

  const res = await fetch(
    `${SUPA_URL}/functions/v1/yoycol-proxy?action=stripe_webhook`,
    {
      method: 'POST',
      headers: {
        Authorization:    `Bearer ${SERVICE_KEY}`,
        'Content-Type':   'application/json',
        'stripe-signature': sigHeader,
      },
      body: rawBody,
    }
  );

  const body = await res.text();
  return new Response(body, {
    status:  res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
