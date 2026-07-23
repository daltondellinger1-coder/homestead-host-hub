// Secure source-neutral booking intake for n8n/provider automations.
// This function only creates or refreshes pending review requests. It never
// auto-approves, auto-declines, sends guest messages, or overwrites a human decision.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-booking-intake-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_SECRET = Deno.env.get("BOOKING_INTAKE_SECRET");

const bookingSources = new Set([
  "airbnb",
  "vrbo",
  "furnished_finder",
  "direct",
  "long_term",
  "lease",
  "other",
  "extension",
]);

type IntakePayload = {
  source?: unknown;
  booking_source?: unknown;
  external_booking_id?: unknown;
  external_listing_id?: unknown;
  guest_name?: unknown;
  guest_email?: unknown;
  guest_phone?: unknown;
  check_in?: unknown;
  check_out?: unknown;
  guest_count?: unknown;
  message?: unknown;
  source_status?: unknown;
  source_updated_at?: unknown;
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}`);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isoDate(value: unknown, field: string): string {
  const date = requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`Invalid ${field}; expected YYYY-MM-DD`);
  }
  return date;
}

function validTimestamp(value: unknown): string | null {
  const timestamp = optionalString(value);
  if (!timestamp) return null;
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("Invalid source_updated_at; expected ISO timestamp");
  return timestamp;
}

function bookingSource(value: unknown): string {
  const candidate = optionalString(value)?.toLowerCase();
  return candidate && bookingSources.has(candidate) ? candidate : "other";
}

function appendIntakeNote(payload: IntakePayload): string | null {
  const values = [
    optionalString(payload.source_status) ? `Provider status: ${optionalString(payload.source_status)}` : null,
    optionalString(payload.message) ? `Provider message: ${optionalString(payload.message)}` : null,
  ].filter(Boolean);
  return values.length ? values.join("\n\n") : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let payload: IntakePayload | null = null;
  let source: string | null = null;
  let externalBookingId: string | null = null;
  let externalListingId: string | null = null;
  let requestId: string | null = null;

  const log = async (outcome: string, errorText: string | null = null) => {
    await supabase.from("booking_intake_events").insert({
      external_source: source,
      external_booking_id: externalBookingId,
      external_listing_id: externalListingId,
      booking_request_id: requestId,
      outcome,
      error_text: errorText,
      raw_payload: payload,
    });
  };

  try {
    // No unauthenticated fallback: n8n must use the secret stored as a Supabase secret.
    if (!SHARED_SECRET) return json({ error: "Booking intake is not configured" }, 503);
    if (req.headers.get("x-booking-intake-secret") !== SHARED_SECRET) {
      try { payload = await req.json(); } catch { /* leave null */ }
      source = optionalString(payload?.source);
      externalBookingId = optionalString(payload?.external_booking_id);
      externalListingId = optionalString(payload?.external_listing_id);
      await log("rejected_secret", "Invalid or missing booking intake secret");
      return json({ error: "Unauthorized" }, 401);
    }

    payload = await req.json();
    source = requiredString(payload.source, "source").toLowerCase();
    externalBookingId = requiredString(payload.external_booking_id, "external_booking_id");
    externalListingId = requiredString(payload.external_listing_id, "external_listing_id");
    const name = requiredString(payload.guest_name, "guest_name");
    const email = requiredString(payload.guest_email, "guest_email");
    const checkIn = isoDate(payload.check_in, "check_in");
    const checkOut = isoDate(payload.check_out, "check_out");
    if (checkOut <= checkIn) throw new Error("check_out must be after check_in");
    const guestCount = Number(payload.guest_count ?? 1);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 50) throw new Error("guest_count must be an integer from 1 to 50");

    const { data: mapping, error: mappingError } = await supabase
      .from("booking_listing_mappings")
      .select("unit_id")
      .eq("external_source", source)
      .eq("external_listing_id", externalListingId)
      .maybeSingle();
    if (mappingError) throw mappingError;
    if (!mapping) {
      await log("review_required", "No unit mapping exists for this source/listing");
      return json({
        accepted: false,
        review_required: true,
        reason: "listing_mapping_not_found",
        external_source: source,
        external_listing_id: externalListingId,
      }, 202);
    }

    const { data: existing, error: existingError } = await supabase
      .from("booking_requests")
      .select("id,status")
      .eq("external_source", source)
      .eq("external_booking_id", externalBookingId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing && existing.status !== "pending") {
      requestId = existing.id;
      await log("terminal_ignored", `Existing request is ${existing.status}; human decision preserved`);
      return json({ success: true, action: "terminal_ignored", id: existing.id, status: existing.status });
    }

    const request = {
      name,
      email,
      phone: optionalString(payload.guest_phone),
      check_in: checkIn,
      check_out: checkOut,
      num_guests: guestCount,
      preferred_unit_type: null,
      source: bookingSource(payload.booking_source ?? payload.source),
      notes: appendIntakeNote(payload),
      status: "pending",
      assigned_unit_id: mapping.unit_id,
      external_source: source,
      external_booking_id: externalBookingId,
      external_listing_id: externalListingId,
      source_updated_at: validTimestamp(payload.source_updated_at),
      raw_payload: payload,
    };

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("booking_requests")
        .update(request)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updateError) throw updateError;
      requestId = updated.id;
      await log("updated");
      return json({ success: true, action: "updated", id: updated.id, assigned_unit_id: mapping.unit_id });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("booking_requests")
      .insert(request)
      .select("id")
      .single();
    if (insertError) throw insertError;
    requestId = inserted.id;
    await log("created");
    return json({ success: true, action: "created", id: inserted.id, assigned_unit_id: mapping.unit_id }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown booking intake error";
    try { await log(payload ? "invalid_payload" : "error", message); } catch (logError) { console.error("Booking intake log write failed", logError); }
    return json({ error: message }, 400);
  }
});
