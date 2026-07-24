import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const appPublicUrl = (Deno.env.get("APP_PUBLIC_URL") ?? "").replace(/\/$/, "");
const allowedOrigin = Deno.env.get("APP_PUBLIC_URL") ?? "*";
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
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maximum) : null;
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

async function issueLink(request: Request, body: Record<string, unknown>, origin: string | null) {
  const jwt = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Sign in is required." }, 401, origin);

  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("active", true);
  const authorized = (roleRows ?? []).some((row) => ["admin", "property_manager"].includes(String(row.role)));
  if (!authorized) return json({ error: "Property operations access is required." }, 403, origin);

  const cleaningTaskId = cleanText(body.cleaningTaskId, 80);
  if (!cleaningTaskId) return json({ error: "Cleaning task is required." }, 400, origin);
  const { data: task } = await admin.from("cleaning_tasks").select("id").eq("id", cleaningTaskId).maybeSingle();
  if (!task) return json({ error: "Cleaning task was not found." }, 404, origin);

  const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

  await admin
    .from("cleaner_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("cleaning_task_id", cleaningTaskId)
    .is("revoked_at", null);

  const { error } = await admin.from("cleaner_access_tokens").insert({
    cleaning_task_id: cleaningTaskId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: userData.user.id,
  });
  if (error) return json({ error: "The cleaner link could not be created." }, 500, origin);

  await admin.from("cleaning_tasks").update({
    status: "awaiting_confirmation",
    confirmation_status: "pending",
  }).eq("id", cleaningTaskId).in("status", ["needs_scheduling", "cleaner_declined", "awaiting_confirmation"]);

  return json({ url: `${appPublicUrl}/cleaning/${token}`, expiresAt }, 200, origin);
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

  const action = cleanText(body.action, 30);
  if (action === "issue") return issueLink(request, body, origin);

  const token = cleanText(body.token, 100);
  if (!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return json({ error: "This cleaning link is invalid or expired." }, 403, origin);
  }

  const tokenHash = await sha256(token);
  const { data: access } = await admin
    .from("cleaner_access_tokens")
    .select("id,cleaning_task_id,allowed_actions,expires_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!access || access.revoked_at || new Date(access.expires_at).getTime() <= Date.now()) {
    return json({ error: "This cleaning link is invalid or expired." }, 403, origin);
  }
  if (!(access.allowed_actions ?? []).includes(action)) {
    return json({ error: "This link does not allow that action." }, 403, origin);
  }

  const { data: task } = await admin
    .from("cleaning_tasks")
    .select("id,status,confirmation_status,checkout_at,next_check_in_at,cleaning_deadline,special_notes,pet_notes,linen_notes,unit:units(name)")
    .eq("id", access.cleaning_task_id)
    .maybeSingle();
  if (!task) return json({ error: "This cleaning assignment is no longer available." }, 404, origin);

  if (action === "view") return json({ task }, 200, origin);

  if (action === "upload_url") {
    const fileName = cleanText(body.fileName, 180) ?? "photo.jpg";
    const contentType = cleanText(body.contentType, 80) ?? "";
    const fileSize = Number(body.fileSize ?? 0);
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType) || fileSize > 10 * 1024 * 1024) {
      return json({ error: "Use a JPEG, PNG, or WebP image smaller than 10 MB." }, 400, origin);
    }
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const safeStem = fileName.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 60) || "photo";
    const path = `${task.id}/${crypto.randomUUID()}-${safeStem}.${extension}`;
    const { data, error } = await admin.storage.from("cleaning-photos").createSignedUploadUrl(path);
    if (error || !data) return json({ error: "Photo upload could not be prepared." }, 500, origin);
    return json({ path, uploadToken: data.token }, 200, origin);
  }

  const transitions: Record<string, { allowed: string[]; update: Record<string, unknown> }> = {
    confirm: {
      allowed: ["awaiting_confirmation", "needs_scheduling", "cleaner_declined"],
      update: { status: "confirmed", confirmation_status: "confirmed", confirmed_at: new Date().toISOString() },
    },
    decline: {
      allowed: ["awaiting_confirmation", "needs_scheduling", "confirmed"],
      update: { status: "cleaner_declined", confirmation_status: "declined", declined_at: new Date().toISOString() },
    },
    start: { allowed: ["confirmed"], update: { status: "in_progress" } },
    complete: {
      allowed: ["in_progress"],
      update: {
        status: "completed",
        completion_notes: cleanText(body.completion_notes),
        supplies_needed: cleanText(body.supplies_needed),
        damage_found: cleanText(body.damage_found),
        maintenance_issue_found: cleanText(body.maintenance_issue_found),
        completion_photo_urls: Array.isArray(body.completion_photo_urls)
          ? body.completion_photo_urls
            .filter((path): path is string => typeof path === "string" && path.startsWith(`${task.id}/`))
            .slice(0, 10)
          : [],
      },
    },
  };
  const transition = action ? transitions[action] : undefined;
  if (!transition || !transition.allowed.includes(task.status)) {
    return json({ error: "That cleaning step is no longer available." }, 409, origin);
  }

  const { error: updateError } = await admin
    .from("cleaning_tasks")
    .update(transition.update)
    .eq("id", task.id)
    .eq("status", task.status);
  if (updateError) return json({ error: "The cleaning update could not be saved." }, 500, origin);

  await admin.from("cleaner_access_tokens").update({ used_at: new Date().toISOString() }).eq("id", access.id);
  return json({ ok: true }, 200, origin);
});
