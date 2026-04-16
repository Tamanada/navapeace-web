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

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { tier } = await req.json();
    const t = TIERS[tier as string];

    if (!t) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!BOT_TOKEN) {
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

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
