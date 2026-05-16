// ═══════════════════════════════════════════════════════════
//  NAVA PEACE — Yoycol API Proxy  (Supabase Edge Function)
//  Handles HMAC-SHA256 V4 signing + proxies to Yoycol API
// ═══════════════════════════════════════════════════════════

const YOYCOL_BASE  = 'https://www.yoycol.com';
const ACCESS_KEY   = Deno.env.get('YOYCOL_ACCESS_KEY')           ?? '';
const SECRET_KEY   = Deno.env.get('YOYCOL_SECRET_KEY')           ?? '';
const STRIPE_KEY   = Deno.env.get('STRIPE_SECRET_KEY')           ?? '';
const SUPA_URL     = Deno.env.get('SUPABASE_URL')                ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')   ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ── Stripe form-encoder (Stripe API uses URL-encoded, not JSON) ─
function encodeStripeForm(obj: unknown, prefix = ''): string {
  if (Array.isArray(obj)) {
    return obj.map((item, i) => encodeStripeForm(item, `${prefix}[${i}]`))
      .filter(Boolean).join('&');
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => encodeStripeForm(v, prefix ? `${prefix}[${k}]` : k))
      .filter(Boolean).join('&');
  }
  if (obj === null || obj === undefined) return '';
  return `${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`;
}

// ── Helpers ─────────────────────────────────────────────────
function nonce32(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf   = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join('');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── HMAC V4 Signing ─────────────────────────────────────────
async function buildHeaders(
  method: string,
  path: string,
  queryParams: Record<string, string> = {}
): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const nonce     = nonce32();

  const lines: string[] = [
    `method=${method.toUpperCase()}`,
    `path=${path}`,
    `timestamp=${timestamp}`,
    `nonce=${nonce}`,
    `accessKey=${ACCESS_KEY}`,
    `algorithm=HmacSHA256`,
    `version=4.0`,
  ];

  const paramKeys = Object.keys(queryParams).sort();
  if (paramKeys.length > 0) {
    const sorted = paramKeys.map(k => `${k}=${queryParams[k]}`).join('&');
    lines.push(`params=${sorted}`);
  }

  const stringToSign = lines.join('\n');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf   = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(stringToSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  return {
    'X-API-Access-Key': ACCESS_KEY,
    'X-API-Timestamp':  timestamp,
    'X-API-Nonce':      nonce,
    'X-API-Algorithm':  'HmacSHA256',
    'X-API-Version':    '4.0',
    'X-API-Signature':  signature,
    'Content-Type':     'application/json',
  };
}

// ── Yoycol fetch wrapper ─────────────────────────────────────
async function yoyFetch(
  method: string,
  path: string,
  queryParams: Record<string, string> = {},
  body?: unknown
) {
  const headers = await buildHeaders(method, path, queryParams);

  const paramKeys = Object.keys(queryParams).sort();
  let url = YOYCOL_BASE + path;
  if (paramKeys.length > 0) {
    const qs = paramKeys.map(k =>
      `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`
    ).join('&');
    url += '?' + qs;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}

// ── Alert admin via Telegram ─────────────────────────────────
async function alertAdmin(botToken: string, message: string): Promise<void> {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: '788992758',
      text: `🚨 <b>NAVA MERCH ALERT</b>\n\n${message}`,
      parse_mode: 'HTML',
    }),
  }).catch(() => {}); // never throw on notification failure
}

// ── Verify Stripe webhook signature (HMAC-SHA256) ────────────
async function verifyStripeWebhook(sigHeader: string, rawBody: string, secret: string): Promise<boolean> {
  const ts = sigHeader.match(/t=(\d+)/)?.[1] ?? '';
  const v1 = sigHeader.match(/v1=([a-f0-9]+)/)?.[1] ?? '';
  if (!ts || !v1) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const buf      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${rawBody}`));
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time comparison to prevent timing attacks
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

// ── Router ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url    = new URL(req.url);
  const action = url.searchParams.get('action') ?? '';

  try {
    // ── GET products (self-store) ───────────────────────────
    if (action === 'products' && req.method === 'GET') {
      const page = url.searchParams.get('page') ?? '1';
      const size = url.searchParams.get('size') ?? '50';
      const data = await yoyFetch('GET',
        '/api/2025/open/v4/self_store/products',
        { page, size }
      );
      return json(data);
    }

    // ── GET product variants ────────────────────────────────
    if (action === 'variants' && req.method === 'GET') {
      const mappingId = url.searchParams.get('mappingId') ?? '';
      if (!mappingId) return json({ error: 'mappingId required' }, 400);
      const data = await yoyFetch('GET',
        `/api/2025/open/v4/self_store/products/${mappingId}/variants`
      );
      return json(data);
    }

    // ── GET shipping quote ──────────────────────────────────
    if (action === 'shipping' && req.method === 'GET') {
      const skuCode = url.searchParams.get('skuCode') ?? '';
      const country = url.searchParams.get('country') ?? 'US';
      const quantity = url.searchParams.get('quantity') ?? '1';
      if (!skuCode) return json({ error: 'skuCode required' }, 400);
      const data = await yoyFetch('GET',
        '/api/2025/open/v4/shipping/sku_quotes',
        { sku_code: skuCode, country, quantity }
      );
      return json(data);
    }

    // ── POST create order (Telegram Stars flow) ────────────
    if (action === 'create_order' && req.method === 'POST') {
      const body = await req.json();
      if (!body.storeOrderSn || !body.address || !body.items?.length) {
        return json({ error: 'storeOrderSn, address and items required' }, 400);
      }

      // Save Stars order to DB before calling YOYCOL (audit trail + retry support)
      const orderId  = crypto.randomUUID();
      const sbH      = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
      if (SUPA_URL && SERVICE_KEY) {
        await fetch(`${SUPA_URL}/rest/v1/merch_orders`, {
          method: 'POST',
          headers: sbH,
          body: JSON.stringify({
            id:              orderId,
            yoycol_order_sn: body.storeOrderSn,
            status:          'pending_stars',
            items:           body.items,
            customer_email:  body.address?.email || null,
            total_usd:       parseFloat((body.items as Array<{salesPrice?:number;quantity?:number}>)
              .reduce((s, i) => s + (i.salesPrice || 0) * (i.quantity || 1), 0).toFixed(2)),
          }),
        }).catch(() => {});
      }

      const data      = await yoyFetch('POST', '/api/2025/open/v4/orders', {}, body);
      const fulfilled = data?.code === '100000' || !!data?.data;

      // Update DB status
      if (SUPA_URL && SERVICE_KEY) {
        await fetch(`${SUPA_URL}/rest/v1/merch_orders?id=eq.${orderId}`, {
          method: 'PATCH', headers: sbH,
          body: JSON.stringify(fulfilled
            ? { status: 'fulfilled' }
            : { status: 'failed', error_detail: JSON.stringify(data).slice(0, 500) }),
        }).catch(() => {});
      }

      // Alert admin immediately on failure — client has already paid Stars
      if (!fulfilled) {
        const BOT = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
        await alertAdmin(BOT,
          `⭐ Stars order FAILED!\n\nOrder: <code>${body.storeOrderSn}</code>\nCustomer: ${body.address?.email || 'unknown'}\nItems: ${body.items.length}\n\nYOYCOL: <code>${JSON.stringify(data).slice(0, 200)}</code>`
        );
      }

      return json(data);
    }

    // ── GET product templates (full Yoycol catalog) ────────
    // Confirmed path: /api/2025/open/v4/product_templates
    if (action === 'templates' && req.method === 'GET') {
      const page       = url.searchParams.get('page')       ?? '1';
      const size       = url.searchParams.get('size')       ?? '50';
      const categoryId = url.searchParams.get('categoryId') ?? '';
      const params: Record<string, string> = { page, size };
      if (categoryId) params.categoryId = categoryId;
      const data = await yoyFetch('GET', '/api/2025/open/v4/product_templates', params);
      return json(data);
    }

    // ── GET single product template (variants + design slots) ─
    if (action === 'template' && req.method === 'GET') {
      const productId = url.searchParams.get('productId') ?? '';
      if (!productId) return json({ error: 'productId required' }, 400);
      const data = await yoyFetch('GET', `/api/2025/open/v4/product_templates/${productId}`);
      return json(data);
    }

    // ── GET order status ────────────────────────────────────
    if (action === 'order_status' && req.method === 'GET') {
      const orderId = url.searchParams.get('orderId') ?? '';
      if (!orderId) return json({ error: 'orderId required' }, 400);
      const data = await yoyFetch('GET', `/api/2025/open/v4/orders/${orderId}`);
      return json(data);
    }

    // ── POST create Telegram Stars invoice link ─────────────
    if (action === 'create_merch_invoice' && req.method === 'POST') {
      const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
      if (!BOT_TOKEN) return json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 500);

      const { title, description, starsAmount } = await req.json();
      if (!title || !starsAmount) return json({ error: 'title and starsAmount required' }, 400);

      const tgRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:       String(title).slice(0, 32),
            description: String(description || 'NAVA PEACE Merch').slice(0, 255),
            payload:     `merch_${Date.now()}`,
            currency:    'XTR',
            prices:      [{ label: 'Total', amount: Math.ceil(Number(starsAmount)) }],
          }),
        }
      );
      const tgData = await tgRes.json();
      return json(tgData);
    }

    // ── POST save user email (no auth needed beyond uid) ───────────
    if (action === 'save_user_email' && req.method === 'POST') {
      const SUPA_URL    = Deno.env.get('SUPABASE_URL') ?? '';
      const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (!SUPA_URL || !SERVICE_KEY) return json({ error: 'Supabase not configured' }, 500);

      const { uid, email } = await req.json();
      if (!uid || !email) return json({ error: 'uid and email required' }, 400);

      // Basic email format validation
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(email))) return json({ error: 'invalid email format' }, 400);

      // Store as key=user_email_<uid> in admin_settings (no schema change needed)
      const upsertRes = await fetch(`${SUPA_URL}/rest/v1/admin_settings`, {
        method: 'POST',
        headers: {
          apikey:          SERVICE_KEY,
          Authorization:   `Bearer ${SERVICE_KEY}`,
          'Content-Type':  'application/json',
          Prefer:          'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          key:        `user_email_${String(uid).replace(/[^a-z0-9_\-]/gi, '_')}`,
          value:      String(email).toLowerCase().trim(),
          updated_at: new Date().toISOString(),
        }),
      });
      if (!upsertRes.ok) {
        const err = await upsertRes.text();
        return json({ error: `DB write failed: ${err}` }, 500);
      }
      return json({ success: true });
    }

    // ── POST update admin setting (uses service role to bypass RLS) ─
    if (action === 'update_admin_setting' && req.method === 'POST') {
      const SUPA_URL   = Deno.env.get('SUPABASE_URL') ?? '';
      const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (!SUPA_URL || !SERVICE_KEY) return json({ error: 'Supabase not configured' }, 500);

      const { adminCode, key, value } = await req.json();
      if (!adminCode || !key || value === undefined) {
        return json({ error: 'adminCode, key and value are required' }, 400);
      }

      // 1. Verify admin code via nava_check_admin RPC (same as admin panel login)
      const verifyRes = await fetch(
        `${SUPA_URL}/rest/v1/rpc/nava_check_admin`,
        {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input_code: adminCode }),
        }
      );
      const verifyData = await verifyRes.json();
      if (!verifyData?.valid) {
        return json({ error: 'Invalid admin code' }, 403);
      }

      // 2. Upsert into admin_settings with service role (bypasses RLS)
      const upsertRes = await fetch(
        `${SUPA_URL}/rest/v1/admin_settings`,
        {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
        }
      );
      if (!upsertRes.ok) {
        const err = await upsertRes.text();
        return json({ error: `DB write failed: ${err}` }, 500);
      }
      return json({ success: true });
    }

    // ── POST create Stripe Checkout Session (web shop) ─────
    if (action === 'create_checkout_session' && req.method === 'POST') {
      if (!STRIPE_KEY) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);

      const { items, customer_email, success_url, cancel_url } = await req.json();
      if (!items?.length)              return json({ error: 'items required' }, 400);
      if (!success_url || !cancel_url) return json({ error: 'success_url and cancel_url required' }, 400);

      const orderId  = crypto.randomUUID();
      const orderSn  = `NP_WEB_${Date.now()}`;
      const totalUsd = items.reduce((s: number, i: {retail_price: number; qty: number}) =>
        s + (i.retail_price * i.qty), 0);

      // Build Stripe Checkout Session payload
      const lineItems = items.map((item: {title: string; image?: string; retail_price: number; qty: number}) => ({
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(item.retail_price * 100),
          product_data: {
            name:   item.title.slice(0, 227),
            images: item.image ? [item.image] : [],
          },
        },
        quantity: item.qty,
      }));

      const stripePayload: Record<string, unknown> = {
        mode:      'payment',
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url,
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: [
            'AC','AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AT','AU','AW','AZ',
            'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR',
            'BS','BT','BV','BW','BY','BZ','CA','CD','CF','CG','CH','CI','CK','CL','CM',
            'CN','CO','CR','CV','CW','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
            'EG','EH','ER','ES','ET','FI','FJ','FK','FO','FR','GA','GB','GD','GE','GF',
            'GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HN',
            'HR','HT','HU','ID','IE','IL','IN','IO','IQ','IS','IT','JM','JO','JP','KE',
            'KG','KH','KI','KM','KN','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR',
            'LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MK','ML','MM','MN',
            'MO','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NG',
            'NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL',
            'PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB',
            'SC','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV',
            'SX','SZ','TA','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR',
            'TT','TV','TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE','VG','VN','VU',
            'WF','WS','XK','YE','YT','ZA','ZM','ZW',
          ],
        },
        phone_number_collection: { enabled: true },
        metadata: { order_id: orderId, order_sn: orderSn },
      };
      if (customer_email) stripePayload.customer_email = customer_email;

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${STRIPE_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: encodeStripeForm(stripePayload),
      });
      const session = await stripeRes.json() as Record<string, unknown>;
      if (!session.id) {
        const err = (session.error as {message?: string})?.message ?? 'Stripe error';
        return json({ error: err }, 500);
      }

      // Persist pending order with the Stripe session ID
      if (SUPA_URL && SERVICE_KEY) {
        await fetch(`${SUPA_URL}/rest/v1/merch_orders`, {
          method: 'POST',
          headers: {
            apikey:         SERVICE_KEY,
            Authorization:  `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id:               orderId,
            stripe_session_id: session.id,
            yoycol_order_sn:  orderSn,
            status:           'pending',
            items,
            customer_email:   customer_email || null,
            total_usd:        parseFloat(totalUsd.toFixed(2)),
          }),
        });
      }

      return json({ url: session.url, session_id: session.id });
    }

    // ── GET confirm Stripe payment + create YOYCOL order ──
    // Called from success page after Stripe redirects back.
    // No webhook needed — we verify the session server-side.
    if (action === 'confirm_order' && req.method === 'GET') {
      const sessionId = url.searchParams.get('session_id') ?? '';
      if (!sessionId) return json({ error: 'session_id required' }, 400);
      if (!STRIPE_KEY)   return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
      if (!SUPA_URL || !SERVICE_KEY) return json({ error: 'Supabase not configured' }, 500);

      const sbHeaders = {
        apikey:         SERVICE_KEY,
        Authorization:  `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      };

      // 1. Check if already fulfilled (idempotent — user may refresh success page)
      const existRes  = await fetch(
        `${SUPA_URL}/rest/v1/merch_orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}`,
        { headers: sbHeaders }
      );
      const existing = (await existRes.json() as Record<string, unknown>[])?.[0];
      if (existing?.status === 'fulfilled') {
        return json({ success: true, already: true, order_sn: existing.yoycol_order_sn });
      }

      // 2. Retrieve Stripe session to verify payment
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=customer_details&expand[]=shipping_details`,
        { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
      );
      const session = await stripeRes.json() as Record<string, unknown>;

      if (session.payment_status !== 'paid') {
        return json({ error: 'Payment not completed', status: session.payment_status }, 402);
      }

      // 3. Fetch our pending order from DB
      const orderId  = (session.metadata as Record<string,string>)?.order_id;
      const orderSn  = (session.metadata as Record<string,string>)?.order_sn
                    || existing?.yoycol_order_sn as string;

      let order = existing;
      if (!order && orderId) {
        const oRes = await fetch(
          `${SUPA_URL}/rest/v1/merch_orders?id=eq.${orderId}`,
          { headers: sbHeaders }
        );
        order = (await oRes.json() as Record<string, unknown>[])?.[0];
      }
      // No order in DB → alert admin rather than creating orphan orderSn
      if (!order || !orderSn) {
        const BOT = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
        await alertAdmin(BOT, `⚠️ confirm_order: no DB record!\n\nSession: <code>${sessionId}</code>\nAmount: $${((session.amount_total as number || 0) / 100).toFixed(2)}`);
        return json({ error: 'Order record not found' }, 404);
      }

      // 3b. Atomic lock — prevents race condition on rapid page refresh
      const patchKey   = orderId ? `id=eq.${orderId}` : `stripe_session_id=eq.${encodeURIComponent(sessionId)}`;
      const lockRes    = await fetch(`${SUPA_URL}/rest/v1/merch_orders?${patchKey}&status=eq.pending`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'processing' }),
      });
      const locked = await lockRes.json() as Record<string, unknown>[];
      if (!locked?.length) {
        // Another request already took the lock — return current state
        return json({ success: true, already: true, order_sn: orderSn });
      }

      // 4. Build YOYCOL address from Stripe shipping_details
      const shipping = (session.shipping_details || session.shipping || {}) as Record<string, unknown>;
      const customer = (session.customer_details || {}) as Record<string, unknown>;
      const addr     = (shipping.address || {}) as Record<string, unknown>;
      const fullName = ((shipping.name || customer.name || 'Customer') as string).trim();
      const spaceIdx = fullName.indexOf(' ');
      const yoyAddress = {
        firstName:   spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName,
        lastName:    spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : '-',
        email:       (customer.email as string)        || '',
        phone:       (customer.phone as string)        || '',
        countryCode: (addr.country as string)          || 'US',
        stateCode:   (addr.state as string)            || '',
        city:        (addr.city as string)             || '',
        address:     [(addr.line1 as string) || '', (addr.line2 as string) || ''].filter(Boolean).join(', '),
        zip:         (addr.postal_code as string)      || '',
      };

      // 5. Mark as paid in DB
      await fetch(`${SUPA_URL}/rest/v1/merch_orders?${patchKey}`, {
        method: 'PATCH', headers: sbHeaders,
        body: JSON.stringify({ status: 'paid', shipping: yoyAddress,
          customer_email: yoyAddress.email || order.customer_email }),
      });

      // 6. Create YOYCOL order
      const items = order.items as Array<Record<string, unknown>>;
      const yoyItems = items.map((item, i) => ({
        thirdItemId: `item_${i}`,
        skuCode:     item.skuCode,
        quantity:    item.qty,
        salesPrice:  item.wholesale || item.retail_price,
        realPrice:   item.wholesale || item.retail_price,
      }));

      const yoyData = await yoyFetch('POST', '/api/2025/open/v4/orders', {}, {
        storeOrderSn: orderSn,
        address:      yoyAddress,
        items:        yoyItems,
        currency:     'USD',
      });

      // 7. Update DB with result
      const fulfilled = yoyData?.code === '100000' || !!yoyData?.data;
      await fetch(`${SUPA_URL}/rest/v1/merch_orders?${patchKey}`, {
        method: 'PATCH', headers: sbHeaders,
        body: JSON.stringify(fulfilled
          ? { status: 'fulfilled', yoycol_order_sn: orderSn }
          : { status: 'failed',   error_detail: JSON.stringify(yoyData).slice(0, 500) }),
      });

      if (!fulfilled) {
        // Alert admin immediately — payment succeeded but YOYCOL failed
        const BOT = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
        await alertAdmin(BOT,
          `🚨 YOYCOL failed after Stripe payment!\n\nOrder: <code>${orderSn}</code>\nSession: <code>${sessionId}</code>\nCustomer: ${yoyAddress.email}\nAmount: $${((session.amount_total as number || 0) / 100).toFixed(2)}\n\nYOYCOL: <code>${JSON.stringify(yoyData).slice(0, 200)}</code>`
        );
        return json({ success: true, order_sn: orderSn, yoycol_warning: true });
      }

      return json({ success: true, order_sn: orderSn });
    }

    // ── GET merch tab assignments (public) ────────────────
    if (action === 'get_merch_tabs' && req.method === 'GET') {
      if (!SUPA_URL || !SERVICE_KEY) return json({});
      const r = await fetch(
        `${SUPA_URL}/rest/v1/admin_settings?key=eq.merch_tabs&select=value`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      );
      const rows = await r.json() as Array<Record<string, unknown>>;
      const val  = rows?.[0]?.value;
      if (!val) return json({});
      try {
        const tabs = typeof val === 'object' ? val : JSON.parse(val as string);
        return json(tabs);
      } catch { return json({}); }
    }

    // ── GET price overrides (public — admin_settings may have RLS) ─
    if (action === 'get_price_overrides' && req.method === 'GET') {
      if (!SUPA_URL || !SERVICE_KEY) return json({});
      const settRes = await fetch(
        `${SUPA_URL}/rest/v1/admin_settings?key=eq.yoycol_price_overrides&select=value`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      );
      const rows = await settRes.json() as Array<Record<string, unknown>>;
      const val  = rows?.[0]?.value;
      if (!val) return json({});
      try {
        const overrides = typeof val === 'object' ? val : JSON.parse(val as string);
        return json(overrides);
      } catch { return json({}); }
    }

    // ── GET orders list (admin dashboard) ─────────────────
    if (action === 'orders' && req.method === 'GET') {
      // Require admin code — verify via nava_check_admin RPC
      const adminCode = url.searchParams.get('adminCode') ?? '';
      if (!adminCode) return json({ error: 'adminCode required' }, 403);
      const verifyRes = await fetch(`${SUPA_URL}/rest/v1/rpc/nava_check_admin`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_code: adminCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData?.valid) return json({ error: 'Unauthorized' }, 403);

      const page   = url.searchParams.get('page')   ?? '1';
      const size   = url.searchParams.get('size')   ?? '20';
      const status = url.searchParams.get('status') ?? '';
      const params: Record<string, string> = { page, size };
      if (status) params.status = status;
      const data = await yoyFetch('GET', '/api/2025/open/v4/orders', params);
      return json(data);
    }

    // ── GET account balance (admin dashboard) ─────────────
    if (action === 'balance' && req.method === 'GET') {
      // Require admin code — verify via nava_check_admin RPC
      const adminCode = url.searchParams.get('adminCode') ?? '';
      if (!adminCode) return json({ error: 'adminCode required' }, 403);
      const verifyRes = await fetch(`${SUPA_URL}/rest/v1/rpc/nava_check_admin`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_code: adminCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData?.valid) return json({ error: 'Unauthorized' }, 403);

      const data = await yoyFetch('GET', '/api/2025/open/v4/account/balance');
      return json(data);
    }

    // ── POST Stripe webhook (server-side fulfillment) ─────
    // Register in Stripe Dashboard: POST /functions/v1/yoycol-proxy?action=stripe_webhook
    // Event: checkout.session.completed
    if (action === 'stripe_webhook' && req.method === 'POST') {
      const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
      if (!WEBHOOK_SECRET) return json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, 500);
      if (!STRIPE_KEY)     return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
      if (!SUPA_URL || !SERVICE_KEY) return json({ error: 'Supabase not configured' }, 500);

      const rawBody   = await req.text();
      const sigHeader = req.headers.get('stripe-signature') ?? '';
      const valid     = await verifyStripeWebhook(sigHeader, rawBody, WEBHOOK_SECRET);
      if (!valid) return json({ error: 'Invalid signature' }, 400);

      const event = JSON.parse(rawBody) as Record<string, unknown>;

      // Acknowledge all events — only process checkout.session.completed
      if (event.type !== 'checkout.session.completed') {
        return json({ received: true });
      }

      const session   = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
      const sessionId = session?.id as string;
      const sbH2      = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
      const BOT       = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

      // Idempotency: already fulfilled?
      const existRes  = await fetch(
        `${SUPA_URL}/rest/v1/merch_orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}`,
        { headers: sbH2 }
      );
      const existing  = (await existRes.json() as Record<string, unknown>[])?.[0];
      if (existing?.status === 'fulfilled') return json({ received: true, already: true });

      if (session.payment_status !== 'paid') return json({ received: true, skipped: 'not paid' });

      // Find order in DB
      const orderId  = (session.metadata as Record<string, string>)?.order_id;
      const orderSn  = (session.metadata as Record<string, string>)?.order_sn
                    || existing?.yoycol_order_sn as string;

      let wOrder = existing;
      if (!wOrder && orderId) {
        const oRes = await fetch(`${SUPA_URL}/rest/v1/merch_orders?id=eq.${orderId}`, { headers: sbH2 });
        wOrder = (await oRes.json() as Record<string, unknown>[])?.[0];
      }
      if (!wOrder || !orderSn) {
        await alertAdmin(BOT, `⚠️ Webhook: order not in DB!\n\nSession: <code>${sessionId}</code>\nAmount: $${((session.amount_total as number || 0) / 100).toFixed(2)}`);
        return json({ received: true, warning: 'order not found' });
      }

      // Atomic lock — prevent race with client-side confirm_order
      const wPatchKey = orderId ? `id=eq.${orderId}` : `stripe_session_id=eq.${encodeURIComponent(sessionId)}`;
      const lockRes   = await fetch(`${SUPA_URL}/rest/v1/merch_orders?${wPatchKey}&status=eq.pending`, {
        method: 'PATCH', headers: { ...sbH2, Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'processing' }),
      });
      const locked = await lockRes.json() as Record<string, unknown>[];
      if (!locked?.length) return json({ received: true, skipped: 'already processing' });

      // Build YOYCOL address
      const wShip    = (session.shipping_details || session.shipping || {}) as Record<string, unknown>;
      const wCust    = (session.customer_details || {}) as Record<string, unknown>;
      const wAddr    = (wShip.address || {}) as Record<string, unknown>;
      const wName    = ((wShip.name || wCust.name || 'Customer') as string).trim();
      const wSpace   = wName.indexOf(' ');
      const yoyAddr2 = {
        firstName:   wSpace > -1 ? wName.slice(0, wSpace) : wName,
        lastName:    wSpace > -1 ? wName.slice(wSpace + 1) : '-',
        email:       (wCust.email as string)       || '',
        phone:       (wCust.phone as string)       || '',
        countryCode: (wAddr.country as string)     || 'US',
        stateCode:   (wAddr.state as string)       || '',
        city:        (wAddr.city as string)        || '',
        address:     [(wAddr.line1 as string) || '', (wAddr.line2 as string) || ''].filter(Boolean).join(', '),
        zip:         (wAddr.postal_code as string) || '',
      };

      await fetch(`${SUPA_URL}/rest/v1/merch_orders?${wPatchKey}`, {
        method: 'PATCH', headers: sbH2,
        body: JSON.stringify({ status: 'paid', shipping: yoyAddr2, customer_email: yoyAddr2.email || wOrder.customer_email }),
      });

      // Create YOYCOL order
      const wItems    = (wOrder.items as Array<Record<string, unknown>>).map((item, i) => ({
        thirdItemId: `item_${i}`, skuCode: item.skuCode, quantity: item.qty,
        salesPrice: item.wholesale || item.retail_price,
        realPrice:  item.wholesale || item.retail_price,
      }));
      const wYoyData  = await yoyFetch('POST', '/api/2025/open/v4/orders', {}, {
        storeOrderSn: orderSn, address: yoyAddr2, items: wItems, currency: 'USD',
      });
      const wFulfilled = wYoyData?.code === '100000' || !!wYoyData?.data;

      await fetch(`${SUPA_URL}/rest/v1/merch_orders?${wPatchKey}`, {
        method: 'PATCH', headers: sbH2,
        body: JSON.stringify(wFulfilled
          ? { status: 'fulfilled', yoycol_order_sn: orderSn }
          : { status: 'failed', error_detail: JSON.stringify(wYoyData).slice(0, 500) }),
      });

      if (!wFulfilled) {
        await alertAdmin(BOT,
          `🚨 Webhook: YOYCOL failed after Stripe!\n\nOrder: <code>${orderSn}</code>\nSession: <code>${sessionId}</code>\nCustomer: ${yoyAddr2.email}\nAmount: $${((session.amount_total as number || 0) / 100).toFixed(2)}\n\nYOYCOL: <code>${JSON.stringify(wYoyData).slice(0, 200)}</code>`
        );
      }

      return json({ received: true, fulfilled: wFulfilled });
    }

    return json({ error: 'unknown action' }, 400);

  } catch (e) {
    console.error('yoycol-proxy error', e);
    return json({ error: String(e) }, 500);
  }
});
