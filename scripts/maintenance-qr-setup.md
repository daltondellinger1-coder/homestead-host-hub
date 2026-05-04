# Maintenance Form & QR Code Setup

One-time setup, ~15 minutes total. Do this once and you're done.

---

## Step 1 — Build the form on Tally (recommended)

Tally is free, supports photo uploads, hidden fields, and email notifications.

1. Go to https://tally.so and sign up (free, no credit card).
2. Click **Create form** → **Start from scratch**.
3. Title it **Homestead Hill — Maintenance Request**.
4. Add these fields in order:

| Field | Type | Required | Notes |
|---|---|---|---|
| Your name | Short answer | Yes | |
| Your phone number | Short answer | Yes | So maintenance can call if needed |
| Issue title | Short answer | Yes | "Leaking faucet", "Heater not working", etc. |
| Describe the issue | Long answer | Yes | |
| Photo(s) of the issue | File upload | **Yes** | Allow multiple files, allow images only |
| Unit | Short answer | Yes | **Mark as "hidden field"** in field settings |

5. For the **Unit** field: open its settings → toggle **Hidden field** ON → set the parameter name to `unit`. This lets the URL prefill it.

## Step 2 — Configure email notifications

1. In Tally, click **Integrations** → **Email Notifications** → **Connect**.
2. Add **two** notification recipients:
   - Your own email
   - The maintenance contact's email
3. Customize the subject line: `🔧 Maintenance Request — {{Unit}}: {{Issue title}}`
4. Make sure **all answers** including photo links are included in the body.
5. Save.

## Step 3 — Get your form URL

In Tally, click **Publish** → copy the share URL. It will look like:

```
https://tally.so/r/ABC123
```

## Step 4 — Generate the per-unit QR codes

For each unit, the QR code links to the form with the unit prefilled. The URL pattern:

```
https://tally.so/r/ABC123?unit=Unit+1
```

Replace `ABC123` with your actual form ID, and `Unit+1` with the unit name (use `+` for spaces, or `%20`).

### Easy QR generator

Go to https://www.qr-code-generator.com/ (or any free generator) and paste each URL one at a time. Download each as PNG.

### URLs to generate (replace `ABC123` with your form ID)

You have 15 units total. Skip Unit 12 (office) and Unit 15 (long-term) if you don't want them on the maintenance program — or include them, your call.

```
https://tally.so/r/ABC123?unit=Unit+1
https://tally.so/r/ABC123?unit=Unit+2
https://tally.so/r/ABC123?unit=Unit+3
https://tally.so/r/ABC123?unit=Unit+4
https://tally.so/r/ABC123?unit=Unit+5
https://tally.so/r/ABC123?unit=Unit+6
https://tally.so/r/ABC123?unit=Unit+7
https://tally.so/r/ABC123?unit=Unit+8
https://tally.so/r/ABC123?unit=Unit+9
https://tally.so/r/ABC123?unit=Unit+10
https://tally.so/r/ABC123?unit=Unit+11
https://tally.so/r/ABC123?unit=Unit+13
https://tally.so/r/ABC123?unit=Unit+14
```

(Adjust unit names to match what you have in the app — e.g. if a unit is called "Cottage", use `?unit=Cottage`.)

## Step 5 — Print and post

Make a small card per unit with:
- The QR code (large enough to scan from 1-2 feet away)
- A short heading: **"Maintenance Issue? Scan to Report"**
- The unit number (helpful so you know it's the right one if it falls down)

Laminate and stick on the inside of a kitchen cabinet door, on the fridge, or near the breaker panel. Avoid bathrooms (humidity).

---

## How it works day-to-day

1. Tenant has an issue → scans QR → fills form (with photo)
2. You + maintenance contact get an email immediately with all details and photo link
3. Open Host Hub → **Maintenance** tab → **Log Request**
4. Paste the title, description, photo URL from the email; pick the unit
5. Track New → In Progress → Done with notes as work happens

Total time per request to log: ~30 seconds.

---

## If logging from email gets tedious later

We can build an automatic webhook that turns each form submission into a Host Hub request automatically — no manual logging. Say the word and we'll add it. For now, manual logging keeps things simple and gives you a chance to review/triage before it shows up in the tracker.
