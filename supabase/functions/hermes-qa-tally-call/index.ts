// One-shot QA helper: invokes tally-maintenance-webhook internally using the
// server-side TALLY_WEBHOOK_SECRET so the secret never leaves the edge runtime.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET = Deno.env.get("TALLY_WEBHOOK_SECRET") ?? "";

function buildPayload(eventId: string) {
  return {
    eventId,
    data: {
      submissionId: eventId,
      fields: [
        { key: "unit", label: "Unit", value: "Unit 5" },
        { key: "issue_title", label: "Issue title", value: "AUTOMATION TEST ONLY - Host Hub duplicate QA" },
        {
          key: "description",
          label: "Describe the issue",
          value:
            "AUTOMATION TEST ONLY / Host Hub duplicate QA - synthetic duplicate idempotency check. Safe to delete.",
        },
        { key: "your_name", label: "Your name", value: "Automation Test Guest - Unit 5" },
        { key: "phone", label: "Your phone number", value: "+1 812-555-0155" },
        {
          key: "photos",
          label: "Photo(s) of the issue",
          value: [{ url: "https://placehold.co/600x400/png?text=AUTOMATION+TEST+ONLY" }],
        },
        { key: "urgency", label: "Is this urgent?", value: "No" },
      ],
    },
  };
}

async function postOnce(eventId: string) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/tally-maintenance-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tally-secret": SECRET },
    body: JSON.stringify(buildPayload(eventId)),
  });
  const text = await resp.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
  return { status: resp.status, body };
}

Deno.serve(async (req) => {
  let action = "single";
  let providedEventId: string | undefined;
  try {
    const j = await req.json();
    action = j?.action ?? action;
    providedEventId = j?.eventId;
  } catch { /* ignore */ }

  if (action === "duplicate_qa") {
    const eventId = providedEventId ?? `hh-dupe-qa-${crypto.randomUUID()}`;
    const first = await postOnce(eventId);
    const second = await postOnce(eventId);
    return new Response(
      JSON.stringify({ eventId, first, second, secret_present: SECRET.length > 0 }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const eventId = providedEventId ?? `hermes-qa-${Date.now()}`;
  const single = await postOnce(eventId);
  return new Response(
    JSON.stringify({ eventId, ...single, secret_present: SECRET.length > 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
