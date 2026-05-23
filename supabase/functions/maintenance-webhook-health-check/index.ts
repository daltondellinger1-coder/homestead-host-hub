// Admin-only maintenance webhook QA endpoint.
// Runs a synthetic Tally-style smoke test through the deployed webhook path and cleans up test rows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TALLY_SECRET =
  Deno.env.get("TALLY_WEBHOOK_SECRET") ??
  Deno.env.get("TALLY_MAINTENANCE_WEBHOOK_SECRET") ??
  Deno.env.get("MAINTENANCE_WEBHOOK_SECRET") ??
  "";
const TEST_MARKER = "AUTOMATION TEST ONLY";

type Action = "run_test" | "cleanup";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return { ok: false as const, error: "Unauthorized" };

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: role, error: roleError } = await service
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .eq("active", true)
    .maybeSingle();

  if (roleError || !role) return { ok: false as const, error: "Admin role required" };
  return { ok: true as const, service, userId: user.id };
}

function buildPayload(unitName: string, eventId: string) {
  return {
    eventId,
    data: {
      submissionId: eventId,
      fields: [
        { label: "Unit", key: "unit", value: unitName },
        { label: "Your name", key: "name", value: `Automation Test Guest - ${unitName}` },
        { label: "Your phone number", key: "phone", value: "+1 812-555-0155" },
        { label: "Issue title", key: "title", value: `${TEST_MARKER} - ${unitName} webhook smoke test` },
        { label: "Describe the issue", key: "description", value: `${TEST_MARKER} from Host Hub admin webhook health check. Safe to delete.` },
        { label: "Photo(s) of the issue", key: "photos", value: [{ url: "https://example.com/automation-test-only-maintenance.jpg" }] },
        { label: "Urgent", key: "urgent", value: "No" },
      ],
    },
  };
}

async function runTest(service: any, unitName: string) {
  const eventId = `hh-admin-qa-${crypto.randomUUID()}`;
  const url = new URL(`${SUPABASE_URL}/functions/v1/tally-maintenance-webhook`);
  if (TALLY_SECRET) url.searchParams.set("secret", TALLY_SECRET);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(unitName, eventId)),
  });
  const text = await response.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }

  const requestId = body?.id ?? null;
  let request = null;
  let log = null;
  if (requestId) {
    const { data } = await service
      .from("maintenance_requests")
      .select("id,title,status,tally_event_id,unit_id,created_at")
      .eq("id", requestId)
      .maybeSingle();
    request = data;

    const { data: logData } = await service
      .from("webhook_payload_log")
      .select("id,processed_status,related_request_id,created_at")
      .eq("related_request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    log = logData;
  }

  return {
    ok: response.ok && Boolean(requestId),
    http_status: response.status,
    request_id: requestId,
    webhook_log_id: log?.id ?? null,
    processed_status: log?.processed_status ?? null,
    notification_sent: response.ok ? (body?.notification_sent ?? !body?.duplicate) : false,
    duplicate: Boolean(body?.duplicate),
    event_id: eventId,
    request,
  };
}

async function cleanup(service: any, ids: string[]) {
  const cleanIds = ids.filter((id) => typeof id === "string" && id.length > 0);
  if (cleanIds.length === 0) return { deleted_requests: 0, deleted_logs: 0 };

  const { data: requests } = await service
    .from("maintenance_requests")
    .select("id")
    .in("id", cleanIds)
    .or(`title.ilike.%${TEST_MARKER}%,description.ilike.%${TEST_MARKER}%`);
  const safeIds = (requests ?? []).map((row: { id: string }) => row.id);
  if (safeIds.length === 0) return { deleted_requests: 0, deleted_logs: 0 };

  const { data: deletedLogs } = await service
    .from("webhook_payload_log")
    .delete()
    .in("related_request_id", safeIds)
    .select("id");

  const { data: deletedRequests } = await service
    .from("maintenance_requests")
    .delete()
    .in("id", safeIds)
    .select("id");

  return {
    deleted_requests: deletedRequests?.length ?? 0,
    deleted_logs: deletedLogs?.length ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = await requireAdmin(req);
  if (!admin.ok) return json({ error: admin.error }, admin.error === "Unauthorized" ? 401 : 403);

  let body: { action?: Action; unitName?: string; requestIds?: string[] } = {};
  try { body = await req.json(); } catch { /* default body */ }

  if (body.action === "run_test") {
    const unitName = body.unitName || "Unit 5";
    return json(await runTest(admin.service, unitName));
  }
  if (body.action === "cleanup") {
    return json(await cleanup(admin.service, body.requestIds ?? []));
  }
  return json({ error: "Unsupported action" }, 400);
});
