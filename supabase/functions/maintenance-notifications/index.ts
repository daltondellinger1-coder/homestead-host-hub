// Send email notifications for maintenance events.
// Triggered from the Tally webhook (new request) and from the app (assigned, completed).
// Uses Resend if RESEND_API_KEY is set; otherwise logs "skipped" and returns 200
// so the calling flow never breaks.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";
const ADMIN_EMAILS = (Deno.env.get("MAINTENANCE_ADMIN_EMAILS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const VENDOR_EMAILS = (Deno.env.get("MAINTENANCE_VENDOR_EMAILS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

type Event = "new_request" | "assigned" | "completed";

interface Body {
  event: Event;
  request_id: string;
  app_url?: string;
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urgentBadge(urgent: boolean): string {
  return urgent
    ? `<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">Urgent</span>`
    : "";
}

function photoHtml(urls: string[]): string {
  if (!urls.length) return "";
  const imgs = urls.slice(0, 6).map((u) =>
    `<a href="${esc(u)}" style="display:inline-block;margin:4px;"><img src="${esc(u)}" alt="Photo" style="max-width:140px;max-height:140px;border-radius:6px;border:1px solid #ddd;" /></a>`
  ).join("");
  return `<div style="margin-top:12px;">${imgs}</div>`;
}

function renderNewRequest(req: any, unitName: string, appUrl: string): { subject: string; html: string } {
  const photos = (req.photo_urls?.length ? req.photo_urls : (req.photo_url ? [req.photo_url] : [])) as string[];
  const subject = `${req.priority_urgent ? "[URGENT] " : ""}New maintenance: ${unitName} — ${req.title}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 8px;">New maintenance request</h2>
      <p style="margin:0 0 16px;color:#666;">${esc(unitName)} ${urgentBadge(!!req.priority_urgent)}</p>
      <h3 style="margin:16px 0 4px;">${esc(req.title)}</h3>
      ${req.description ? `<p style="white-space:pre-wrap;color:#333;">${esc(req.description)}</p>` : ""}
      ${req.reporter_name ? `<p style="color:#666;font-size:13px;">Reported by: ${esc(req.reporter_name)}</p>` : ""}
      ${photoHtml(photos)}
      <p style="margin-top:24px;">
        <a href="${esc(appUrl)}/maintenance" style="background:#0f1b3d;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open in Host Hub</a>
      </p>
    </div>`;
  return { subject, html };
}

function renderAssigned(req: any, unitName: string, appUrl: string): { subject: string; html: string } {
  const photos = (req.photo_urls?.length ? req.photo_urls : (req.photo_url ? [req.photo_url] : [])) as string[];
  const subject = `${req.priority_urgent ? "[URGENT] " : ""}Assigned: ${unitName} — ${req.title}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 8px;">You have a new maintenance request</h2>
      <p style="margin:0 0 16px;color:#666;">${esc(unitName)} ${urgentBadge(!!req.priority_urgent)}</p>
      <h3 style="margin:16px 0 4px;">${esc(req.title)}</h3>
      ${req.description ? `<p style="white-space:pre-wrap;color:#333;">${esc(req.description)}</p>` : ""}
      ${photoHtml(photos)}
      <p style="margin-top:24px;">
        <a href="${esc(appUrl)}/maintenance-portal" style="background:#0f1b3d;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Maintenance Portal</a>
      </p>
    </div>`;
  return { subject, html };
}

function renderCompleted(req: any, unitName: string, appUrl: string, completionPhotos: string[]): { subject: string; html: string } {
  const subject = `Completed: ${unitName} — ${req.title}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 8px;">Maintenance completed</h2>
      <p style="margin:0 0 16px;color:#666;">${esc(unitName)}</p>
      <h3 style="margin:16px 0 4px;">${esc(req.title)}</h3>
      ${req.assigned_to_name ? `<p style="color:#666;font-size:13px;">Completed by: ${esc(req.assigned_to_name)}</p>` : ""}
      ${photoHtml(completionPhotos)}
      <p style="margin-top:24px;">
        <a href="${esc(appUrl)}/maintenance" style="background:#0f1b3d;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Review &amp; verify</a>
      </p>
    </div>`;
  return { subject, html };
}

async function sendResend(to: string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!to.length) return { ok: false, error: "no recipients" };
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, error: `Resend ${resp.status}: ${text.slice(0, 300)}` };
  }
  await resp.text();
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let logStatus = "ok";
  let logError: string | null = null;
  let body: Body | null = null;

  try {
    body = await req.json();
    if (!body?.event || !body?.request_id) {
      return new Response(JSON.stringify({ error: "event and request_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If user is signed in and is not admin/maintenance, reject (admins/maintenance can trigger).
    // The Tally webhook calls us with the anon key (no Authorization). That is allowed.
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) !== ANON_KEY) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userResult, error: userErr } = await userClient.auth.getUser(authHeader.slice(7));
      const uid = userResult?.user?.id;
      if (userErr || !uid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase.from("user_roles")
        .select("role").eq("user_id", uid).eq("active", true);
      const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "maintenance");
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check email config early
    if (!RESEND_API_KEY || !FROM_EMAIL) {
      logStatus = "skipped_no_config";
      logError = "RESEND_API_KEY or FROM_EMAIL not set";
      await supabase.from("webhook_payload_log").insert({
        source: "maintenance-notifications",
        raw_payload: body,
        processed_status: logStatus,
        error_text: logError,
        related_request_id: body.request_id,
      });
      return new Response(JSON.stringify({ skipped: true, reason: logError }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: request, error: rErr } = await supabase
      .from("maintenance_requests").select("*").eq("id", body.request_id).single();
    if (rErr || !request) {
      logStatus = "error"; logError = `Request not found: ${body.request_id}`;
      await supabase.from("webhook_payload_log").insert({
        source: "maintenance-notifications", raw_payload: body,
        processed_status: logStatus, error_text: logError, related_request_id: body.request_id,
      });
      return new Response(JSON.stringify({ error: logError }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: unit } = await supabase.from("units").select("name").eq("id", request.unit_id).maybeSingle();
    const unitName = unit?.name ?? "Unknown unit";
    const appUrl = body.app_url ?? "https://homestead-host-hub.lovable.app";

    const sends: Array<{ to: string[]; rendered: { subject: string; html: string }; label: string }> = [];

    if (body.event === "new_request") {
      const rendered = renderNewRequest(request, unitName, appUrl);
      if (ADMIN_EMAILS.length) sends.push({ to: ADMIN_EMAILS, rendered, label: "admins" });
    } else if (body.event === "assigned") {
      const rendered = renderAssigned(request, unitName, appUrl);
      const to: string[] = [];
      if (request.assigned_to_email) to.push(request.assigned_to_email);
      else to.push(...VENDOR_EMAILS);
      if (to.length) sends.push({ to, rendered, label: "assignee" });
      if (ADMIN_EMAILS.length) sends.push({ to: ADMIN_EMAILS, rendered, label: "admins-cc" });
    } else if (body.event === "completed") {
      // Pull the most recent maintenance_updates row with completion photos
      const { data: updates } = await supabase.from("maintenance_updates")
        .select("photo_urls,note,created_at")
        .eq("request_id", request.id).order("created_at", { ascending: false }).limit(5);
      const completionPhotos = (updates ?? []).flatMap((u: any) => u.photo_urls ?? []).slice(0, 6);
      const rendered = renderCompleted(request, unitName, appUrl, completionPhotos);
      if (ADMIN_EMAILS.length) sends.push({ to: ADMIN_EMAILS, rendered, label: "admins" });
    }

    if (sends.length === 0) {
      logStatus = "skipped_no_recipients";
      logError = "No recipients configured for this event";
      await supabase.from("webhook_payload_log").insert({
        source: "maintenance-notifications", raw_payload: body,
        processed_status: logStatus, error_text: logError, related_request_id: body.request_id,
      });
      return new Response(JSON.stringify({ skipped: true, reason: logError }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const s of sends) {
      const r = await sendResend(s.to, s.rendered.subject, s.rendered.html);
      results.push({ label: s.label, ...r });
      if (!r.ok) { logStatus = "partial_error"; logError = (logError ? logError + "; " : "") + `${s.label}: ${r.error}`; }
    }

    await supabase.from("webhook_payload_log").insert({
      source: "maintenance-notifications",
      raw_payload: { ...body, results },
      processed_status: logStatus,
      error_text: logError,
      related_request_id: body.request_id,
    });

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logStatus = "error";
    logError = e instanceof Error ? e.message : "Unknown";
    console.error("notifications error:", e);
    try {
      await supabase.from("webhook_payload_log").insert({
        source: "maintenance-notifications", raw_payload: body,
        processed_status: logStatus, error_text: logError,
        related_request_id: body?.request_id ?? null,
      });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: logError }), {
      status: 200, // never break upstream
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
