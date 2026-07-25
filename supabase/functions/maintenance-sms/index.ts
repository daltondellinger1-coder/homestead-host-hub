import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const appPublicUrl = (Deno.env.get("APP_PUBLIC_URL") ?? "").replace(/\/$/, "");
const allowedOrigin = Deno.env.get("APP_PUBLIC_URL") ?? "*";
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

function cleanText(value: unknown, maximum = 2000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maximum);
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUsPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function twilioConfigured() {
  const hasCredentials = (twilioApiKeySid && twilioApiKeySecret) || twilioAuthToken;
  return Boolean(twilioAccountSid && hasCredentials && (twilioMessagingServiceSid || twilioFromNumber));
}

async function authorize(request: Request) {
  const jwt = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return null;
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("active", true);
  const allowed = (roleRows ?? []).some((row) => ["admin", "property_manager"].includes(String(row.role)));
  return allowed ? userData.user : null;
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
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : `Twilio returned ${response.status}`;
    throw new Error(message.slice(0, 500));
  }
  return String(payload.sid ?? "");
}

async function dispatchQueued(limit = 40, broadcastId = "") {
  if (!smsEnabled || !twilioConfigured()) return { sent: 0, failed: 0, skipped: true };
  let query = admin
    .from("maintenance_sms_outbox")
    .select("*")
    .in("status", ["queued", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempt_count", 5)
    .order("created_at")
    .limit(limit);
  if (broadcastId) query = query.eq("broadcast_id", broadcastId);
  const { data: rows } = await query;

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    if (row.message_kind === "job_offer" && row.offer_id) {
      const { data: liveOffer } = await admin
        .from("maintenance_offers")
        .select("status,broadcast:maintenance_broadcasts(status)")
        .eq("id", row.offer_id)
        .maybeSingle();
      const liveBroadcast = Array.isArray(liveOffer?.broadcast) ? liveOffer.broadcast[0] : liveOffer?.broadcast;
      if (liveOffer?.status !== "pending" || liveBroadcast?.status !== "open") {
        await admin.from("maintenance_sms_outbox").update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("id", row.id).in("status", ["queued", "failed"]);
        continue;
      }
    }

    const { data: claimed } = await admin
      .from("maintenance_sms_outbox")
      .update({
        status: "sending",
        attempt_count: Number(row.attempt_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("status", ["queued", "failed"])
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const providerMessageId = await sendTwilio(row.recipient_phone_e164, row.message_body);
      const now = new Date().toISOString();
      await admin.from("maintenance_sms_outbox").update({
        status: "sent",
        provider_message_id: providerMessageId,
        last_error: null,
        sent_at: now,
        updated_at: now,
      }).eq("id", row.id);
      if (row.offer_id && row.message_kind === "job_offer") {
        await admin.from("maintenance_offers").update({
          initial_message_status: "sent",
          initial_provider_message_id: providerMessageId,
          initial_sent_at: now,
          updated_at: now,
        }).eq("id", row.offer_id);
      }
      sent += 1;
    } catch (error) {
      const attempts = Number(row.attempt_count ?? 0) + 1;
      const terminal = attempts >= 5;
      const retryAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString();
      await admin.from("maintenance_sms_outbox").update({
        status: "failed",
        last_error: error instanceof Error ? error.message : "SMS delivery failed.",
        next_attempt_at: retryAt,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (terminal && row.offer_id && row.message_kind === "job_offer") {
        await admin.from("maintenance_offers").update({
          status: "send_failed",
          initial_message_status: "failed",
          updated_at: new Date().toISOString(),
        }).eq("id", row.offer_id).eq("status", "pending");
      }
      failed += 1;
    }
  }

  return { sent, failed, skipped: false };
}

async function broadcast(body: Record<string, unknown>, userId: string, origin: string | null) {
  if (!smsEnabled || !twilioConfigured()) {
    return json({
      error: "Text delivery is not active yet.",
      code: "sms_not_ready",
      configured: twilioConfigured(),
      enabled: smsEnabled,
    }, 409, origin);
  }

  const requestId = cleanText(body.requestId, 80);
  const vendorIds = Array.isArray(body.vendorIds)
    ? [...new Set(body.vendorIds.filter((id): id is string => typeof id === "string"))].slice(0, 30)
    : [];
  const maxAuthorizedCost = Number(body.maxAuthorizedCost);
  const expiresHours = Math.min(24, Math.max(1, Number(body.expiresHours ?? 4)));
  const managerNote = cleanText(body.managerNote, 500);
  if (!requestId || !vendorIds.length || !Number.isFinite(maxAuthorizedCost) || maxAuthorizedCost < 0) {
    return json({ error: "Select at least one handyman and enter an authorized amount." }, 400, origin);
  }

  const { data: requestRow } = await admin
    .from("maintenance_requests")
    .select("*,unit:units(name)")
    .eq("id", requestId)
    .maybeSingle();
  if (!requestRow) return json({ error: "Maintenance request not found." }, 404, origin);
  if (["done", "completed", "closed_verified", "archived"].includes(String(requestRow.status))) {
    return json({ error: "Completed or archived work cannot be broadcast." }, 409, origin);
  }

  const emergency = Boolean(requestRow.emergency) || requestRow.priority === "emergency";
  const approvalThreshold = emergency ? 500 : 250;
  if (maxAuthorizedCost > approvalThreshold && !["approved", "emergency_override"].includes(String(requestRow.approval_status))) {
    await admin.from("maintenance_requests").update({
      estimated_cost: maxAuthorizedCost,
      emergency,
    }).eq("id", requestId);
    return json({
      error: `Approval is required before broadcasting more than $${approvalThreshold}.`,
      code: "approval_required",
      threshold: approvalThreshold,
    }, 409, origin);
  }

  const { data: vendors } = await admin
    .from("vendors")
    .select("id,name,company,phone,email,active,sms_consent_status")
    .in("id", vendorIds)
    .eq("active", true);
  const eligible = (vendors ?? []).map((vendor) => ({
    ...vendor,
    phoneE164: normalizeUsPhone(String(vendor.phone ?? "")),
  })).filter((vendor) => vendor.sms_consent_status === "consented" && vendor.phoneE164);
  if (!eligible.length) {
    return json({ error: "None of the selected handymen has a valid phone number and confirmed text consent." }, 400, origin);
  }

  const expiresAt = new Date(Date.now() + expiresHours * 3_600_000).toISOString();
  const { data: broadcastRow, error: broadcastError } = await admin
    .from("maintenance_broadcasts")
    .insert({
      request_id: requestId,
      max_authorized_cost: maxAuthorizedCost,
      manager_note: managerNote || null,
      expires_at: expiresAt,
      created_by: userId,
    })
    .select("id")
    .single();
  if (broadcastError || !broadcastRow) {
    const conflict = broadcastError?.code === "23505";
    return json({ error: conflict ? "This request already has an open broadcast." : "The broadcast could not be created." }, conflict ? 409 : 500, origin);
  }

  const unitName = String(requestRow.unit?.name ?? "Homestead Hill");
  const title = cleanText(requestRow.title, 120) || "Maintenance request";
  const amount = maxAuthorizedCost.toFixed(2);
  const offerRows = [];
  const outboxRows = [];
  for (const vendor of eligible) {
    const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const offerId = crypto.randomUUID();
    const acceptUrl = `${appPublicUrl}/maintenance-offer/${token}`;
    offerRows.push({
      id: offerId,
      broadcast_id: broadcastRow.id,
      vendor_id: vendor.id,
      recipient_name: vendor.name,
      recipient_phone_e164: vendor.phoneE164,
      token_hash: await sha256(token),
    });
    outboxRows.push({
      broadcast_id: broadcastRow.id,
      offer_id: offerId,
      recipient_phone_e164: vendor.phoneE164,
      message_kind: "job_offer",
      message_body: `Homestead Hill job: ${unitName} — ${title}. Authorized up to $${amount}. First confirmed acceptance gets it: ${acceptUrl} Reply STOP to opt out.`,
    });
  }

  const { error: offersError } = await admin.from("maintenance_offers").insert(offerRows);
  const { error: outboxError } = offersError
    ? { error: offersError }
    : await admin.from("maintenance_sms_outbox").insert(outboxRows);
  if (offersError || outboxError) {
    await admin.from("maintenance_broadcasts").delete().eq("id", broadcastRow.id);
    return json({ error: "The handyman offers could not be prepared." }, 500, origin);
  }

  await admin.from("maintenance_requests").update({
    vendor_contacted_at: new Date().toISOString(),
    estimated_cost: maxAuthorizedCost,
  }).eq("id", requestId);

  const delivery = await dispatchQueued(eligible.length, broadcastRow.id);
  return json({
    ok: true,
    broadcastId: broadcastRow.id,
    recipientCount: eligible.length,
    expiresAt,
    delivery,
  }, 200, origin);
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

  const user = await authorize(request);
  if (!user) return json({ error: "Property operations access is required." }, 403, origin);

  const action = cleanText(body.action, 30);
  if (action === "status") {
    return json({ configured: twilioConfigured(), enabled: smsEnabled, ready: twilioConfigured() && smsEnabled }, 200, origin);
  }
  if (action === "broadcast") return broadcast(body, user.id, origin);
  if (action === "dispatch") return json(await dispatchQueued(), 200, origin);
  if (action === "cancel") {
    const broadcastId = cleanText(body.broadcastId, 80);
    if (!broadcastId) return json({ error: "Broadcast is required." }, 400, origin);
    const { data, error } = await admin.rpc("cancel_maintenance_broadcast", { _broadcast_id: broadcastId });
    if (error || !data) return json({ error: "The broadcast could not be cancelled." }, 500, origin);
    if (data.result === "cancelled") await dispatchQueued();
    return json(data, data.result === "not_found" ? 404 : 200, origin);
  }
  return json({ error: "Unknown action." }, 400, origin);
});
