// ══════════════════════════════════════════════════════
//  NAVA PEACE — Supabase Edge Function
//  Create Telegram Stars invoice link
//
//  Deploy:
//    supabase functions deploy create-stars-invoice
//
//  Set secret:
//    supabase secrets set TELEGRAM_BOT_TOKEN=<your_token>
// ══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://nava-peace.app",
  "https://nava-peace.world",
  "https://navapeace-web.david-dancingelephant.workers.dev",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ── Telegram initData HMAC validation ──────────────────────────
// Verifies that the request genuinely comes from a Telegram WebApp user.
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function verifyTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");

    // Build data_check_string: sorted key=value pairs joined by \n
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuf = await crypto.subtle.sign(
      "HMAC", webAppDataKey, new TextEncoder().encode(botToken)
    );

    // signature = HMAC-SHA256(secret_key, data_check_string)
    const sigKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await crypto.subtle.sign(
      "HMAC", sigKey, new TextEncoder().encode(dataCheckString)
    );
    const computed = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    // Constant-time comparison
    if (computed.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    if (diff !== 0) return false;

    // Check auth_date is not older than 1 hour
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (age > 3600) return false; // initData expired

    return true;
  } catch {
    return false;
  }
}

interface Tier {
  title:       string;
  description: string;
  payload:     string;
  amount:      number; // in Stars (1 Star = 1 unit)
}

const TIERS: Record<string, Tier> = {
  cafe: {
    title:       "☕ Support NAVA PEACE",
    description: "Buy the team a coffee! Every Star helps us build peace together.",
    payload:     "donation_cafe",
    amount:      50,
  },
  dove: {
    title:       "🕊 Peace Builder",
    description: "Support the mission and receive a Peace Builder badge + bonus doves.",
    payload:     "donation_dove",
    amount:      200,
  },
  arch: {
    title:       "🚢 Arch Founder",
    description: "Become an Arch Founder — your name in the credits + max bonus doves.",
    payload:     "donation_arch",
    amount:      500,
  },
};

serve(async (req: Request) => {
  const CORS = corsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { tier, initData } = body;

    // ── Validate Telegram initData HMAC ──────────────────────
    // Required to ensure requests come from real Telegram WebApp users.
    // Skip validation only in local dev (no initData available).
    const IS_PROD = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    if (IS_PROD) {
      if (!initData || typeof initData !== "string" || initData.length < 10) {
        return new Response(JSON.stringify({ error: "initData required" }), {
          status: 401,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      const valid = await verifyTelegramInitData(initData, BOT_TOKEN);
      if (!valid) {
        console.warn("Invalid or expired Telegram initData");
        return new Response(JSON.stringify({ error: "Unauthorized: invalid initData" }), {
          status: 401,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
    }

    // ── Validate tier ─────────────────────────────────────────
    const t = TIERS[tier as string];
    if (!t) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── Create invoice link via Telegram Bot API ──────────────
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       t.title,
          description: t.description,
          payload:     t.payload,
          currency:    "XTR",
          prices:      [{ label: t.title, amount: t.amount }],
        }),
      }
    );

    const data = await res.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return new Response(JSON.stringify({ error: data.description }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ link: data.result }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
