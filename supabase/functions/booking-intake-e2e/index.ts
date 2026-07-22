// Temporary internal E2E test harness for booking-intake. Reads the shared
// secret from env and posts three synthetic scenarios. NOT for external use.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET = Deno.env.get("BOOKING_INTAKE_SECRET")!;

async function call(body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-intake`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-booking-intake-secret": SECRET,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, body: parsed };
}

Deno.serve(async () => {
  const stamp = Date.now();
  const bookingId = `E2E-TEST-${stamp}`;
  const base = {
    source: "furnished_finder",
    external_booking_id: bookingId,
    external_listing_id: "951987_1",
    guest_name: "Automation Test Guest",
    guest_email: `automation+${stamp}@example.invalid`,
    guest_phone: "812-555-0100",
    check_in: "2026-11-04",
    check_out: "2026-11-07",
    guest_count: 2,
    booking_source: "furnished_finder",
    source_status: "inquiry",
    message: "AUTOMATION TEST ONLY - initial synthetic inquiry",
    source_updated_at: new Date(stamp).toISOString(),
  };

  const first = await call(base);

  const second = await call({
    ...base,
    source_status: "updated",
    message: "AUTOMATION TEST ONLY - updated synthetic inquiry",
    source_updated_at: new Date(stamp + 60_000).toISOString(),
  });

  const unknown = await call({
    ...base,
    external_booking_id: `E2E-TEST-UNKNOWN-${stamp}`,
    external_listing_id: "UNKNOWN-LISTING-DOES-NOT-EXIST",
    message: "AUTOMATION TEST ONLY - unknown listing",
  });

  return new Response(
    JSON.stringify({ bookingId, first, second, unknown }, null, 2),
    { headers: { "content-type": "application/json" } },
  );
});
