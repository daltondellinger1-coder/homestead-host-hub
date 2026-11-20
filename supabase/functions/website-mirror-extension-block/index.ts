import { createClient } from "npm:@supabase/supabase-js@2";

// Server-side proxy: Homestead Helper admins approve an extension in the
// browser; this function checks the Helper session + admin role, then calls
// the website's mirror-extension-block with the shared x-internal-key, which
// a browser must never hold. No guest names are forwarded.

const WEBSITE_FN = "https://qihhgwslsjicjtrqvzsv.supabase.co/functions/v1/mirror-extension-block";
const HELPER_PROJECT_ID = "033d1551-de33-473c-817e-b8c98aaa715f";
const FIXED_ORIGINS = new Set([
  "https://homestead-helper.daltondellinger1.chatgpt.site",
  `https://id-preview--${HELPER_PROJECT_ID}.lovable.app`,
  `https://${HELPER_PROJECT_ID}.lovableproject.com`,
]);
const PREVIEW_RE = new RegExp(
  `^https://([a-z0-9-]+--)?${HELPER_PROJECT_ID}\\.(lovable\\.app|lovableproject\\.com)$`,
);

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return FIXED_ORIGINS.has(origin) || PREVIEW_RE.test(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const ok = allowedOrigin(origin);
  if (ok) h["Access-Control-Allow-Origin"] = ok;
  return h;
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

let cachedKey: string | null = null;
async function internalKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await admin.rpc("get_internal_function_key");
  if (!error && typeof data === "string" && data.length > 0) {
    cachedKey = data;
    return data;
  }
  if (error) console.error("website-mirror-extension-block: vault key unavailable");
  return Deno.env.get("WEBSITE_INTERNAL_FUNCTION_KEY") ?? "";
}


Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: allowedOrigin(origin) ? 204 : 403, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  // Session check (explicit; same pattern as Helper's other functions).
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    console.log("website-mirror-extension-block auth=denied status=401");
    return json({ error: "Sign in is required." }, 401, origin);
  }
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    console.log("website-mirror-extension-block auth=denied status=401");
    return json({ error: "Sign in is required." }, 401, origin);
  }
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("active", true);
  const isAdmin = (roles ?? []).some((r) => String(r.role) === "admin");
  if (!isAdmin) {
    console.log("website-mirror-extension-block auth=forbidden status=403");
    return json({ error: "Admin access is required." }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }
  const { booking_request_id, unit_slug, check_in, check_out } = body ?? {};
  // Forward only the fields the website needs; summary/source are fixed so
  // no guest name ever reaches the website calendar.
  const forward = {
    booking_request_id,
    unit_slug,
    check_in,
    check_out,
    source: "extension_approved",
    summary: "Extension",
  };

  const key = await internalKey();
  if (!key) {
    console.error("website-mirror-extension-block: no internal key configured");
    return json({ error: "Website link not configured" }, 500, origin);
  }

  let res: Response;
  try {
    res = await fetch(WEBSITE_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": key },
      body: JSON.stringify(forward),
    });
  } catch {
    console.error("website-mirror-extension-block: website unreachable");
    return json({ error: "Website unreachable" }, 502, origin);
  }
  const text = await res.text();
  console.log(
    `website-mirror-extension-block auth=admin status=${res.status} unit_slug=${String(unit_slug ?? "-")} check_in=${String(check_in ?? "-")} check_out=${String(check_out ?? "-")}`,
  );
  return new Response(text, {
    status: res.status, // pass the website's status through
    headers: { ...corsHeaders(origin), "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
