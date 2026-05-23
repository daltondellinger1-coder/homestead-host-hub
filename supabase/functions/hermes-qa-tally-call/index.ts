// One-shot QA helper: invokes tally-maintenance-webhook internally using the
// server-side TALLY_WEBHOOK_SECRET so the secret never leaves the edge runtime.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET = Deno.env.get("TALLY_WEBHOOK_SECRET") ?? "";

Deno.serve(async (_req) => {
  const payload = {
    eventId: `hermes-qa-${Date.now()}`,
    data: {
      submissionId: `hermes-qa-${Date.now()}`,
      fields: [
        { key: "unit", label: "Unit", value: "Unit 5" },
        { key: "issue_title", label: "Issue title", value: "AUTOMATION TEST ONLY - Unit 5 sink drip" },
        {
          key: "description",
          label: "Describe the issue",
          value:
            "AUTOMATION TEST ONLY from Hermes Lovable-assisted webhook QA after browser Tally upload stalled. Synthetic Unit 5 maintenance request; no emergency. Please delete after verification.",
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

  const url = `${SUPABASE_URL}/functions/v1/tally-maintenance-webhook`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tally-secret": SECRET,
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  return new Response(
    JSON.stringify({ status: resp.status, body: text, secret_present: SECRET.length > 0 }),
    { headers: { "Content-Type": "application/json" } },
  );
});
