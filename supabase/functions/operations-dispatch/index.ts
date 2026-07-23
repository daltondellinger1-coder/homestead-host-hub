import { createClient } from "npm:@supabase/supabase-js@2";

interface DeliveryResult {
  ok: boolean;
  temporary?: boolean;
  providerId?: string;
  error?: string;
}

interface NotificationProvider {
  send(message: {
    to: string;
    subject: string;
    text: string;
    idempotencyKey: string;
  }): Promise<DeliveryResult>;
}

class EmailProvider implements NotificationProvider {
  constructor(private apiKey: string, private from: string) {}

  async send(message: { to: string; subject: string; text: string; idempotencyKey: string }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (response.ok) {
      const result = await response.json();
      return { ok: true, providerId: result.id } satisfies DeliveryResult;
    }
    return {
      ok: false,
      temporary: response.status === 429 || response.status >= 500,
      error: `Email provider returned ${response.status}.`,
    } satisfies DeliveryResult;
  }
}

class SmsProvider implements NotificationProvider {
  async send() {
    return {
      ok: false,
      temporary: false,
      error: "SMS provider is not configured for Version 1.",
    } satisfies DeliveryResult;
  }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const deliveryEnabled = Deno.env.get("OPERATIONS_DELIVERY_ENABLED") === "true";
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function authorized(request: Request) {
  const cronSecret = Deno.env.get("OPERATIONS_CRON_SECRET");
  if (cronSecret && request.headers.get("x-cron-secret") === cronSecret) return true;
  const jwt = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) return false;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("active", true);
  return (roles ?? []).some((row) => ["admin", "property_manager"].includes(String(row.role)));
}

async function googleAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Google token request returned ${response.status}.`);
  return (await response.json()).access_token as string;
}

async function syncCleaningCalendar() {
  const calendarId = Deno.env.get("GOOGLE_CLEANING_CALENDAR_ID");
  if (!calendarId) return { synced: 0, failed: 0, skipped: true };
  const { data: tasks } = await admin
    .from("cleaning_tasks")
    .select("id,google_calendar_event_id,checkout_at,next_check_in_at,cleaning_deadline,assigned_cleaner_name,special_notes,unit:units(name)")
    .in("calendar_sync_status", ["pending", "failed"])
    .neq("status", "cancelled")
    .limit(50);
  if (!tasks?.length) return { synced: 0, failed: 0 };

  const accessToken = await googleAccessToken();
  let synced = 0;
  let failed = 0;
  for (const task of tasks) {
    const event = {
      summary: `Cleaning — ${task.unit?.name ?? "Unit"}`,
      description: [
        `Checkout: ${task.checkout_at}`,
        `Next check-in: ${task.next_check_in_at ?? "None scheduled"}`,
        `Cleaning deadline: ${task.cleaning_deadline}`,
        `Assigned cleaner: ${task.assigned_cleaner_name ?? "Not assigned"}`,
        task.special_notes ? `Special notes: ${task.special_notes}` : null,
      ].filter(Boolean).join("\n"),
      start: { dateTime: task.checkout_at, timeZone: "America/New_York" },
      end: { dateTime: task.cleaning_deadline, timeZone: "America/New_York" },
      extendedProperties: { private: { homesteadCleaningTaskId: task.id } },
    };
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const url = task.google_calendar_event_id
      ? `${base}/${encodeURIComponent(task.google_calendar_event_id)}`
      : base;
    const response = await fetch(url, {
      method: task.google_calendar_event_id ? "PATCH" : "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (response.ok) {
      const saved = await response.json();
      await admin.from("cleaning_tasks").update({
        google_calendar_event_id: saved.id,
        calendar_sync_status: "synced",
      }).eq("id", task.id);
      synced += 1;
    } else {
      await admin.from("cleaning_tasks").update({ calendar_sync_status: "failed" }).eq("id", task.id);
      failed += 1;
    }
  }
  return { synced, failed };
}

async function deliverNotifications() {
  const emailKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const emailFrom = Deno.env.get("OPERATIONS_EMAIL_FROM") ?? "";
  const providers: Record<string, NotificationProvider> = {
    email: new EmailProvider(emailKey, emailFrom),
    sms: new SmsProvider(),
  };
  const { data: messages } = await admin
    .from("notifications")
    .select("*")
    .in("delivery_status", ["pending", "temporary_failure"])
    .lte("scheduled_at", new Date().toISOString())
    .lt("retry_count", 3)
    .limit(50);
  let sent = 0;
  let failed = 0;
  for (const message of messages ?? []) {
    const provider = providers[message.channel];
    if (!provider || !message.recipient_address) continue;
    const claimed = await admin
      .from("notifications")
      .update({ delivery_status: "sending" })
      .eq("id", message.id)
      .in("delivery_status", ["pending", "temporary_failure"])
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;
    const result = await provider.send({
      to: message.recipient_address,
      subject: String(message.payload?.subject ?? "Homestead Helper update"),
      text: String(message.payload?.text ?? ""),
      idempotencyKey: message.idempotency_key,
    });
    await admin.from("notifications").update(result.ok ? {
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
      failure_reason: null,
    } : {
      delivery_status: result.temporary ? "temporary_failure" : "permanent_failure",
      failure_reason: result.error,
      retry_count: message.retry_count + 1,
    }).eq("id", message.id);
    result.ok ? sent += 1 : failed += 1;
  }
  return { sent, failed };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!(await authorized(request))) return json({ error: "Not authorized." }, 403);
  if (!deliveryEnabled) {
    return json({
      enabled: false,
      message: "Calendar and email delivery remain disabled until their production settings are verified.",
    });
  }
  try {
    const [calendar, notifications] = await Promise.all([
      syncCleaningCalendar(),
      deliverNotifications(),
    ]);
    return json({ enabled: true, calendar, notifications });
  } catch (error) {
    console.error("Operations dispatch failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Operations dispatch failed safely." }, 500);
  }
});

