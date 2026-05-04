// Public webhook endpoint for Tally form submissions.
// Inserts a row into maintenance_requests for each new submission.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, tally-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_SECRET = Deno.env.get("TALLY_WEBHOOK_SECRET"); // optional

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
    // multi-select / hidden could be string array
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

  try {
    // Optional shared-secret check (set TALLY_WEBHOOK_SECRET and pass ?secret= in webhook URL)
    if (SHARED_SECRET) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("secret") ?? req.headers.get("x-webhook-secret");
      if (provided !== SHARED_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    console.log("Tally webhook received:", JSON.stringify(payload).slice(0, 1000));

    const data = payload?.data ?? payload;
    const fields: any[] = data?.fields ?? [];

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
      console.error("Missing unit field in submission");
      return new Response(JSON.stringify({ error: "Missing unit field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id,name")
      .ilike("name", unitName)
      .maybeSingle();

    if (unitErr || !unit) {
      console.error("Unit not found:", unitName, unitErr);
      return new Response(JSON.stringify({ error: `Unit not found: ${unitName}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const photoUrl = photoUrls[0] ?? null;
    const extraPhotos = photoUrls.length > 1 ? `\n\nAdditional photos:\n${photoUrls.slice(1).join("\n")}` : "";
    const phoneLine = phone ? `\n\nPhone: ${phone}` : "";
    const fullDescription = `${description ?? ""}${phoneLine}${extraPhotos}`.trim() || null;

    const { data: inserted, error: insErr } = await supabase
      .from("maintenance_requests")
      .insert({
        unit_id: unit.id,
        title: title.slice(0, 200),
        description: fullDescription,
        photo_url: photoUrl,
        reporter_name: reporterName ?? null,
        status: "new",
      })
      .select()
      .single();

    if (insErr) {
      console.error("Insert failed:", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: inserted.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
