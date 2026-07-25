import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const allowedOrigin = Deno.env.get("APP_PUBLIC_URL") ?? "*";
const appPublicUrl = (Deno.env.get("APP_PUBLIC_URL") ?? "").replace(/\/$/, "");
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const twilioApiKeySid = Deno.env.get("TWILIO_API_KEY_SID") ?? "";
const twilioApiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET") ?? "";
const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "";
const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";
const smsEnabled = (Deno.env.get("MAINTENANCE_SMS_ENABLED") ?? "false").toLowerCase() === "true";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(origin: string | null) {
  const approved = allowedOrigin === "*" || origin === allowedOrigin ? (origin ?? "*") : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": approved,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{40,100}$/.test(value);
}

async function sendTwilio(to: string, body: string) {
  const form = new URLSearchParams({ To: to, Body: body });
  if (twilioMessagingServiceSid) form.set("MessagingServiceSid", twilioMessagingServiceSid);
  else form.set("From", twilioFromNumber);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioAccountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioApiKeySid || twilioAccountSid}:${twilioApiKeySecret || twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.message ?? `Twilio returned ${response.status}`).slice(0, 500));
  return String(payload.sid ?? "");
}

async function dispatchQueued(broadcastId: string) {
  const hasCredentials = (twilioApiKeySid && twilioApiKeySecret) || twilioAuthToken;
  if (!smsEnabled || !twilioAccountSid || !hasCredentials || !(twilioMessagingServiceSid || twilioFromNumber)) return;
  const { data: rows } = await admin
    .from("maintenance_sms_outbox")
    .select("*")
    .eq("broadcast_id", broadcastId)
    .eq("status", "queued")
    .in("message_kind", ["winner_confirmation", "job_filled"])
    .order("created_at");

  for (const row of rows ?? []) {
    const { data: claimed } = await admin
      .from("maintenance_sms_outbox")
      .update({ status: "sending", attempt_count: Number(row.attempt_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    try {
      const providerMessageId = await sendTwilio(row.recipient_phone_e164, row.message_body);
      const now = new Date().toISOString();
      await admin.from("maintenance_sms_outbox").update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: now,
        last_error: null,
        updated_at: now,
      }).eq("id", row.id);
    } catch (error) {
      await admin.from("maintenance_sms_outbox").update({
        status: "failed",
        last_error: error instanceof Error ? error.message : "SMS delivery failed.",
        next_attempt_at: new Date(Date.now() + 120_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
  }
}

async function loadOffer(tokenHash: string) {
  const { data: offer } = await admin
    .from("maintenance_offers")
    .select("id,status,recipient_name,initial_message_status,broadcast:maintenance_broadcasts(id,status,max_authorized_cost,manager_note,expires_at,accepted_vendor_id,accepted_at,request:maintenance_requests(id,title,description,priority,emergency,unit:units(name)))")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  return offer;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400, origin);
  }
  if (!validToken(body.token)) return json({ error: "This job link is invalid or expired." }, 403, origin);

  const tokenHash = await sha256(body.token);
  const action = typeof body.action === "string" ? body.action : "view";

  if (action === "view") {
    const offer = await loadOffer(tokenHash);
    if (!offer) return json({ error: "This job link is invalid or expired." }, 404, origin);
    const broadcast = Array.isArray(offer.broadcast) ? offer.broadcast[0] : offer.broadcast;
    const requestRow = Array.isArray(broadcast?.request) ? broadcast.request[0] : broadcast?.request;
    const unit = Array.isArray(requestRow?.unit) ? requestRow.unit[0] : requestRow?.unit;
    const expired = new Date(String(broadcast?.expires_at)).getTime() <= Date.now();
    const displayStatus = expired && broadcast?.status === "open"
      ? "expired"
      : offer.status === "accepted"
        ? "accepted"
        : broadcast?.status === "filled"
          ? "already_filled"
          : offer.status;
    return json({
      offer: {
        status: displayStatus,
        recipientName: offer.recipient_name,
        title: requestRow?.title,
        description: requestRow?.description,
        unitName: unit?.name ?? "Homestead Hill",
        priority: requestRow?.priority,
        emergency: requestRow?.emergency,
        maxAuthorizedCost: broadcast?.max_authorized_cost,
        managerNote: broadcast?.manager_note,
        expiresAt: broadcast?.expires_at,
      },
    }, 200, origin);
  }

  if (action === "accept") {
    const offer = await loadOffer(tokenHash);
    if (!offer) return json({ error: "This job link is invalid or expired." }, 404, origin);
    const broadcastBefore = Array.isArray(offer.broadcast) ? offer.broadcast[0] : offer.broadcast;
    const { data: result, error } = await admin.rpc("accept_maintenance_offer", { _token_hash: tokenHash });
    if (error || !result) return json({ error: "The job could not be accepted. Please try again." }, 500, origin);
    if (result.result === "accepted" && broadcastBefore?.id) {
      await dispatchQueued(String(broadcastBefore.id));
      await fetch(`${supabaseUrl}/functions/v1/maintenance-notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          event: "assigned",
          request_id: (Array.isArray(broadcastBefore.request) ? broadcastBefore.request[0] : broadcastBefore.request)?.id,
          app_url: appPublicUrl,
        }),
      }).catch(() => undefined);
    }
    return json(result, 200, origin);
  }

  return json({ error: "Unknown action." }, 400, origin);
});
