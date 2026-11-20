// Secret-protected, source-neutral intake for normalized reservation evidence.
//
// This endpoint stages or refreshes a manager-review observation only. It never
// changes a canonical reservation, creates a cleaning task, or sends anything.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-reservation-observation-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_SECRET = Deno.env.get("RESERVATION_OBSERVATION_INTAKE_SECRET");

const sources = new Set([
  "airbnb",
  "furnished_finder",
  "grasshopper",
  "manual",
  "legacy_host_hub",
  "ical",
]);
const statuses = new Set(["confirmed", "inquiry", "text_signal", "cancelled", "unknown"]);
const confidenceValues = new Set(["verified", "high", "medium", "low", "conflict"]);

type IntakePayload = {
  schema_version?: unknown;
  source?: unknown;
  source_record_id?: unknown;
  listing_label?: unknown;
  proposed_unit_mapping?: unknown;
  unit_id?: unknown;
  guest_name?: unknown;
  check_in_date?: unknown;
  check_out_date?: unknown;
  status?: unknown;
  observation_status?: unknown;
  observed_at?: unknown;
  confidence?: unknown;
  evidence_reference?: unknown;
  evidence_summary?: unknown;
  conflicts?: unknown;
  idempotency_key?: unknown;
  raw_payload?: unknown;
};

function requiredString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}`);
  const result = value.trim();
  if (result.length > maxLength) throw new Error(`${field} is too long`);
  return result;
}

function optionalString(value: unknown, field: string, maxLength = 2_000): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const result = value.trim();
  if (!result) return null;
  if (result.length > maxLength) throw new Error(`${field} is too long`);
  return result;
}

function enumValue(value: unknown, field: string, allowed: Set<string>): string {
  const candidate = requiredString(value, field, 100).toLowerCase();
  if (!allowed.has(candidate)) throw new Error(`Invalid ${field}`);
  return candidate;
}

function optionalDate(value: unknown, field: string): string | null {
  const result = optionalString(value, field, 10);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new Error(`Invalid ${field}; expected YYYY-MM-DD`);
  }
  return result;
}

function isoTimestamp(value: unknown, field: string): string {
  const result = requiredString(value, field, 100);
  if (Number.isNaN(Date.parse(result))) throw new Error(`Invalid ${field}; expected ISO timestamp`);
  return new Date(result).toISOString();
}

function optionalUuid(value: unknown, field: string): string | null {
  const result = optionalString(value, field, 36);
  if (!result) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new Error(`Invalid ${field}`);
  }
  return result;
}

function jsonValue(value: unknown, field: string): unknown {
  if (value === undefined) return {};
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length > 65_536) throw new Error(`${field} is too large`);
  return value;
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
  let sourceRecordId: string | null = null;
  let idempotencyKey: string | null = null;
  let observationId: string | null = null;

  const log = async (
    outcome: "created" | "updated" | "terminal_ignored" | "rejected_secret" | "invalid_payload" | "error",
    errorText: string | null = null,
    includePayload = false,
  ) => {
    const { error } = await supabase.from("reservation_observation_intake_events").insert({
      source,
      source_record_id: sourceRecordId,
      idempotency_key: idempotencyKey,
      observation_id: observationId,
      outcome,
      error_text: errorText,
      raw_payload: includePayload ? payload : null,
    });
    if (error) console.error("Reservation observation intake log failed", error);
  };

  try {
    if (!SHARED_SECRET) return json({ error: "Reservation observation intake is not configured" }, 503);
    if (req.headers.get("x-reservation-observation-secret") !== SHARED_SECRET) {
      try {
        payload = await req.json();
        source = typeof payload?.source === "string" ? payload.source.slice(0, 100) : null;
        sourceRecordId =
          typeof payload?.source_record_id === "string" ? payload.source_record_id.slice(0, 500) : null;
        idempotencyKey =
          typeof payload?.idempotency_key === "string" ? payload.idempotency_key.slice(0, 500) : null;
      } catch {
        // Keep the rejected request metadata-only.
      }
      await log("rejected_secret", "Invalid or missing reservation observation secret");
      return json({ error: "Unauthorized" }, 401);
    }

    payload = await req.json();
    source = enumValue(payload.source, "source", sources);
    sourceRecordId = optionalString(payload.source_record_id, "source_record_id", 500);
    idempotencyKey = requiredString(payload.idempotency_key, "idempotency_key", 500);
    const schemaVersion =
      optionalString(payload.schema_version, "schema_version", 100) ??
      "homestead.reservation-observation.v1";
    const listingLabel = optionalString(payload.listing_label, "listing_label", 500);
    const proposedUnitMapping = optionalString(
      payload.proposed_unit_mapping,
      "proposed_unit_mapping",
      200,
    );
    const guestName = optionalString(payload.guest_name, "guest_name", 500);
    const checkIn = optionalDate(payload.check_in_date, "check_in_date");
    const checkOut = optionalDate(payload.check_out_date, "check_out_date");
    if (checkIn && checkOut && checkOut < checkIn) {
      throw new Error("check_out_date must be on or after check_in_date");
    }
    const observationStatus = enumValue(
      payload.observation_status ?? payload.status,
      "status",
      statuses,
    );
    const confidence = enumValue(payload.confidence, "confidence", confidenceValues);
    const observedAt = isoTimestamp(payload.observed_at, "observed_at");
    const evidenceReference = optionalString(
      payload.evidence_reference,
      "evidence_reference",
      2_000,
    );
    const evidenceSummary = optionalString(payload.evidence_summary, "evidence_summary", 4_000);
    const conflicts = jsonValue(payload.conflicts ?? [], "conflicts");
    const rawPayload = jsonValue(payload.raw_payload ?? {}, "raw_payload");
    let unitId = optionalUuid(payload.unit_id, "unit_id");

    if (unitId) {
      const { data: unit, error } = await supabase.from("units").select("id").eq("id", unitId).maybeSingle();
      if (error) throw error;
      if (!unit) throw new Error("unit_id was not found");
    } else if (proposedUnitMapping) {
      const { data: unit, error } = await supabase
        .from("units")
        .select("id")
        .ilike("name", proposedUnitMapping)
        .maybeSingle();
      if (error) throw error;
      unitId = unit?.id ?? null;
    }

    const reviewStatus = unitId ? "pending" : "needs_mapping";
    const proposedAction =
      observationStatus === "cancelled"
        ? "cancel"
        : observationStatus === "confirmed"
          ? "create"
          : "ignore";
    const stagedPayload = {
      schema_version: schemaVersion,
      source,
      source_record_id: sourceRecordId,
      listing_label: listingLabel,
      unit_id: unitId,
      guest_name: guestName,
      check_in_date: checkIn,
      check_out_date: checkOut,
      observation_status: observationStatus,
      confidence,
      observed_at: observedAt,
      evidence_reference: evidenceReference,
      evidence_summary: evidenceSummary,
      raw_payload: { observation: rawPayload, conflicts, proposed_unit_mapping: proposedUnitMapping },
      review_status: reviewStatus,
      proposed_action: proposedAction,
      idempotency_key: idempotencyKey,
    };

    const { data: existing, error: existingError } = await supabase
      .from("reservation_source_observations")
      .select("id,review_status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing && !["pending", "needs_mapping"].includes(existing.review_status)) {
      observationId = existing.id;
      await log("terminal_ignored", `Existing observation is ${existing.review_status}; human decision preserved`);
      return json({
        success: true,
        action: "terminal_ignored",
        id: existing.id,
        review_status: existing.review_status,
        canonical_changed: false,
        outbound_sent: false,
      });
    }

    if (existing) {
      const { data: updated, error } = await supabase
        .from("reservation_source_observations")
        .update(stagedPayload)
        .eq("id", existing.id)
        .select("id,review_status")
        .single();
      if (error) throw error;
      observationId = updated.id;
      await log("updated", null, true);
      return json({
        success: true,
        action: "updated",
        id: updated.id,
        review_status: updated.review_status,
        canonical_changed: false,
        outbound_sent: false,
      });
    }

    const { data: inserted, error } = await supabase
      .from("reservation_source_observations")
      .insert(stagedPayload)
      .select("id,review_status")
      .single();
    if (error) throw error;
    observationId = inserted.id;
    await log("created", null, true);
    return json({
      success: true,
      action: "created",
      id: inserted.id,
      review_status: inserted.review_status,
      canonical_changed: false,
      outbound_sent: false,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown reservation observation intake error";
    await log(payload ? "invalid_payload" : "error", message);
    return json({ error: message, canonical_changed: false, outbound_sent: false }, 400);
  }
});

