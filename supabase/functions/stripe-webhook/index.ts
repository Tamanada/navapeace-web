// ═══════════════════════════════════════════════════════════
//  NAVA PEACE — Stripe Webhook  (Supabase Edge Function)
//  Handles checkout.session.completed:
//    1. Marks order as paid
//    2. Creates YOYCOL fulfillment order
//    3. Updates order status to fulfilled / failed
//
//  Deploy: npx supabase functions deploy stripe-webhook \
//            --no-verify-jwt --project-ref qvbxcxehhenpifhclhvs
//
//  Stripe Dashboard → Webhooks → add endpoint:
//    https://qvbxcxehhenpifhclhvs.supabase.co/functions/v1/stripe-webhook
//    Event: checkout.session.completed
// ═══════════════════════════════════════════════════════════

const SUPA_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')  ?? '';

// ── Stripe signature verification (no SDK needed) ───────────
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const map: Record<string, string> = {};
    for (const part of sigHeader.split(',')) {
      const eq = part.indexOf('=');
      if (eq > -1) map[part.slice(0, eq)] = part.slice(eq + 1);
    }
    const t  = map['t'];
    const v1 = map['v1'];
    if (!t || !v1) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
    const computed = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    // Constant-time comparison to prevent timing attacks
    if (computed.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── DB helpers ──────────────────────────────────────────────
function supa(path: string, method = 'GET', body?: unknown) {
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

async function patchOrder(id: string, data: Record<string, unknown>) {
  await supa(`merch_orders?id=eq.${id}`, 'PATCH', data);
}

// ── YOYCOL address from Stripe shipping ─────────────────────
function toYoycolAddress(session: Record<string, unknown>) {
  const shipping = (session.shipping_details  || session.shipping   || {}) as Record<string, unknown>;
  const customer = (session.customer_details  || {}) as Record<string, unknown>;
  const addr     = (shipping.address          || {}) as Record<string, unknown>;
  const fullName = (shipping.name as string   || customer.name as string || 'Customer').trim();
  const spaceIdx = fullName.indexOf(' ');
  const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
  const lastName  = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : '-';

  return {
    firstName,
    lastName,
    email:       (customer.email   as string) || '',
    phone:       (customer.phone   as string) || '',
    countryCode: (addr.country     as string) || 'US',
    stateCode:   (addr.state       as string) || '',
    city:        (addr.city        as string) || '',
    address:     [(addr.line1 as string) || '', (addr.line2 as string) || '']
                   .filter(Boolean).join(', '),
    zip:         (addr.postal_code as string) || '',
  };
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  // Stripe sends POST; ignore everything else
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sigHeader = req.headers.get('stripe-signature') ?? '';
  const rawBody   = await req.text();

  if (!await verifyStripeSignature(rawBody, sigHeader, WEBHOOK_SECRET)) {
    console.error('stripe-webhook: invalid signature');
    return new Response('Invalid signature', { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // ── Only handle completed checkout sessions ──────────────
  if (event.type !== 'checkout.session.completed') {
    return new Response('Ignored', { status: 200 });
  }

  const session   = event.data  as Record<string, unknown>;
  const sessionObj = session.object as Record<string, unknown>;
  const orderId   = (sessionObj?.metadata as Record<string,string>)?.order_id;

  if (!orderId) {
    console.error('stripe-webhook: no order_id in metadata');
    return new Response('No order_id', { status: 200 }); // 200 so Stripe doesn't retry
  }

  try {
    // 1. Fetch our order
    const orderRes = await supa(`merch_orders?id=eq.${orderId}`);
    const orders   = await orderRes.json() as Record<string, unknown>[];
    const order    = orders?.[0];

    if (!order) {
      console.error('stripe-webhook: order not found', orderId);
      return new Response('Order not found', { status: 200 });
    }

    // 2. Mark as paid
    const yoyAddress = toYoycolAddress(sessionObj);
    await patchOrder(orderId, {
      status:           'paid',
      stripe_session_id: sessionObj.id,
      shipping:          yoyAddress,
      customer_email:   yoyAddress.email || order.customer_email,
    });

    // 3. Create YOYCOL order via yoycol-proxy (reuses HMAC signing)
    const items = order.items as Array<Record<string, unknown>>;
    const yoyItems = items.map((item, i) => ({
      thirdItemId: `item_${i}`,
      skuCode:     item.skuCode,
      quantity:    item.qty,
      salesPrice:  item.wholesale || item.retail_price,
      realPrice:   item.wholesale || item.retail_price,
    }));

    const orderSn = (order.yoycol_order_sn as string) || `NP_WEB_${Date.now()}`;

    const proxyRes = await fetch(
      `${SUPA_URL}/functions/v1/yoycol-proxy?action=create_order`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeOrderSn: orderSn,
          address:      yoyAddress,
          items:        yoyItems,
          currency:     'USD',
        }),
      }
    );

    const yoyData = await proxyRes.json() as Record<string, unknown>;

    if (yoyData?.code === '100000' || yoyData?.data) {
      // Success
      await patchOrder(orderId, {
        status:          'fulfilled',
        yoycol_order_sn: orderSn,
      });
      console.log('stripe-webhook: order fulfilled', orderId, orderSn);
    } else {
      // YOYCOL rejected — money taken, log for manual recovery
      const errDetail = JSON.stringify(yoyData).slice(0, 500);
      await patchOrder(orderId, {
        status:       'failed',
        error_detail: errDetail,
      });
      console.error('stripe-webhook: YOYCOL error', errDetail);
    }

  } catch (e) {
    console.error('stripe-webhook: unexpected error', String(e));
    // Still return 200 to prevent Stripe retries; order stays 'paid' for manual recovery
  }

  return new Response('OK', { status: 200 });
});
