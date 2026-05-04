// Public webhook endpoint for Tally form submissions.
// Inserts a row into maintenance_requests for each new submission.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, tally-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_SECRET = Deno.env.get("TALLY_WEBHOOK_SECRET");

function findField(fields: any[], matchers: string[]): any {
  return fields.find((f) => {
    const label = (f.label ?? "").toString().toLowerCase();
    const key = (f.key ?? "").toString().toLowerCase();
    return matchers.some((m) => label.includes(m) || key.includes(m));
  });
}

function fieldString(f: any): string | undefined {
  if (!f) return undefined;
  const v = f.value;
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) {
    const joined = v.map((x) => (typeof x === "string" ? x : x?.text ?? x?.label ?? "")).filter(Boolean).join(", ");
    return joined || undefined;
  }
  return String(v);
}

function fieldFiles(f: any): string[] {
  if (!f || !Array.isArray(f.value)) return [];
  return f.value.map((file: any) => file?.url).filter((u: any) => typeof u === "string");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let rawPayload: any = null;
  let logStatus: "ok" | "duplicate" | "rejected_secret" | "error" = "ok";
  let logError: string | null = null;
  let relatedRequestId: string | null = null;

  const writeLog = async () => {
    try {
      await supabase.from("webhook_payload_log").insert({
        source: "tally",
        raw_payload: rawPayload,
        processed_status: logStatus,
        error_text: logError,
        related_request_id: relatedRequestId,
      });
    } catch (e) {
      console.error("Failed to write webhook log:", e);
    }
  };

  try {
    // Shared-secret check (required if secret is set)
    if (SHARED_SECRET) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("secret") ?? req.headers.get("x-webhook-secret");
      if (provided !== SHARED_SECRET) {
        logStatus = "rejected_secret";
        logError = "Invalid or missing secret";
        try { rawPayload = await req.json(); } catch { /* ignore */ }
        await writeLog();
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    rawPayload = await req.json();
    console.log("Tally webhook received:", JSON.stringify(rawPayload).slice(0, 500));

    const data = rawPayload?.data ?? rawPayload;
    const fields: any[] = data?.fields ?? [];
    const eventId: string | null =
      rawPayload?.eventId ?? data?.submissionId ?? data?.responseId ?? null;

    // Dedupe by Tally event/submission ID
    if (eventId) {
      const { data: existing } = await supabase
        .from("maintenance_requests")
        .select("id")
        .eq("tally_event_id", eventId)
        .maybeSingle();
      if (existing) {
        logStatus = "duplicate";
        relatedRequestId = existing.id;
        await writeLog();
        return new Response(JSON.stringify({ success: true, duplicate: true, id: existing.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const unitField = findField(fields, ["unit"]);
    const titleField = findField(fields, ["issue title", "title"]);
    const descField = findField(fields, ["describe", "description"]);
    const nameField = findField(fields, ["your name", "name"]);
    const phoneField = findField(fields, ["phone"]);
    const photoField = findField(fields, ["photo"]);

    const unitName = fieldString(unitField);
    const title = fieldString(titleField) ?? "Maintenance request";
    const description = fieldString(descField);
    const reporterName = fieldString(nameField);
    const phone = fieldString(phoneField);
    const photoUrls = fieldFiles(photoField);

    if (!unitName) {
      logStatus = "error";
      logError = "Missing unit field";
      await writeLog();
      return new Response(JSON.stringify({ error: "Missing unit field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id,name")
      .ilike("name", unitName)
      .maybeSingle();

    if (unitErr || !unit) {
      logStatus = "error";
      logError = `Unit not found: ${unitName}`;
      await writeLog();
      return new Response(JSON.stringify({ error: `Unit not found: ${unitName}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneLine = phone ? `\n\nPhone: ${phone}` : "";
    const fullDescription = `${description ?? ""}${phoneLine}`.trim() || null;

    const { data: inserted, error: insErr } = await supabase
      .from("maintenance_requests")
      .insert({
        unit_id: unit.id,
        title: title.slice(0, 200),
        description: fullDescription,
        photo_url: photoUrls[0] ?? null,
        photo_urls: photoUrls,
        reporter_name: reporterName ?? null,
        status: "new",
        tally_event_id: eventId,
      })
      .select()
      .single();

    if (insErr) {
      logStatus = "error";
      logError = insErr.message;
      await writeLog();
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    relatedRequestId = inserted.id;
    await writeLog();
    return new Response(JSON.stringify({ success: true, id: inserted.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logStatus = "error";
    logError = e instanceof Error ? e.message : "Unknown error";
    console.error("Webhook error:", e);
    await writeLog();
    return new Response(JSON.stringify({ error: logError }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
