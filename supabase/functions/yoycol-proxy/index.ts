// ═══════════════════════════════════════════════════════════
//  NAVA PEACE — Yoycol API Proxy  (Supabase Edge Function)
//  Handles HMAC-SHA256 V4 signing + proxies to Yoycol API
// ═══════════════════════════════════════════════════════════

const YOYCOL_BASE  = 'https://www.yoycol.com';
const ACCESS_KEY   = Deno.env.get('YOYCOL_ACCESS_KEY') ?? '';
const SECRET_KEY   = Deno.env.get('YOYCOL_SECRET_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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

    // ── POST create order ───────────────────────────────────
    if (action === 'create_order' && req.method === 'POST') {
      const body = await req.json();
      // Validate minimum required fields
      if (!body.storeOrderSn || !body.address || !body.items?.length) {
        return json({ error: 'storeOrderSn, address and items required' }, 400);
      }
      const data = await yoyFetch('POST', '/api/2025/open/v4/orders', {}, body);
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

    return json({ error: 'unknown action' }, 400);

  } catch (e) {
    console.error('yoycol-proxy error', e);
    return json({ error: String(e) }, 500);
  }
});
