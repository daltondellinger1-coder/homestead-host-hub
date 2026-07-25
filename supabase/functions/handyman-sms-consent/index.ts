import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigin = Deno.env.get("APP_PUBLIC_URL") ?? "*";
const disclosureVersion = "2026-07-25";
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

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalizeUsPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (allowedOrigin !== "*" && origin && origin !== allowedOrigin) return json({ error: "Origin is not allowed." }, 403, origin);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400, origin);
  }

  // Honeypot fields are accepted without creating a record so automated
  // submissions do not learn how the form filters them.
  if (cleanText(body.website, 200)) return json({ ok: true }, 200, origin);

  const name = cleanText(body.name, 120);
  const company = cleanText(body.company, 120);
  const email = cleanText(body.email, 160).toLowerCase();
  const phoneE164 = normalizeUsPhone(cleanText(body.phone, 30));
  const sourceUrl = cleanText(body.sourceUrl, 500);
  const version = cleanText(body.disclosureVersion, 30);

  if (!name || !phoneE164) return json({ error: "Enter your full name and a valid US mobile number." }, 400, origin);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address or leave it blank." }, 400, origin);
  if (body.consented !== true || version !== disclosureVersion) return json({ error: "Current SMS consent is required." }, 400, origin);
  if (!sourceUrl.startsWith(`${allowedOrigin}/`) && allowedOrigin !== "*") return json({ error: "Signup source is not valid." }, 400, origin);

  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("vendors")
    .select("id")
    .eq("phone", phoneE164)
    .maybeSingle();

  let vendorId = existing?.id as string | undefined;
  if (vendorId) {
    const { error } = await admin.from("vendors").update({
      name,
      company: company || null,
      email: email || null,
      preferred_contact_method: "text",
      sms_consent_status: "consented",
      sms_consent_at: now,
      sms_opted_out_at: null,
      sms_consent_source: sourceUrl,
      sms_consent_disclosure_version: version,
      sms_consent_notes: "Consented through the public Homestead Hill handyman signup form.",
      updated_at: now,
    }).eq("id", vendorId);
    if (error) return json({ error: "The signup could not be saved." }, 500, origin);
  } else {
    const { data, error } = await admin.from("vendors").insert({
      name,
      company: company || null,
      email: email || null,
      phone: phoneE164,
      trade: "handyman",
      vendor_rank: "backup",
      preferred_contact_method: "text",
      sms_consent_status: "consented",
      sms_consent_at: now,
      sms_consent_source: sourceUrl,
      sms_consent_disclosure_version: version,
      sms_consent_notes: "Consented through the public Homestead Hill handyman signup form.",
    }).select("id").single();
    if (error || !data) return json({ error: "The signup could not be saved." }, 500, origin);
    vendorId = data.id;
  }

  const { error: eventError } = await admin.from("vendor_sms_consent_events").insert({
    vendor_id: vendorId,
    event_type: "consented",
    full_name: name,
    company: company || null,
    phone_e164: phoneE164,
    email: email || null,
    disclosure_version: version,
    source_url: sourceUrl,
    user_agent: cleanText(request.headers.get("User-Agent"), 500) || null,
  });
  if (eventError) return json({ error: "The consent record could not be completed." }, 500, origin);

  return json({ ok: true }, 200, origin);
});
