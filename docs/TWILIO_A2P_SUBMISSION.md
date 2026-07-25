# Homestead Hill maintenance SMS — A2P submission

This is the carrier-registration copy for the Homestead Hill maintenance
network. Do not add the EIN, Twilio credentials, personal phone numbers, or
other secrets to this file.

## Registration choice

- Customer type: Direct Customer
- Legal business/brand: We Flip Houses LLC
- Property/program name: Homestead Hill Maintenance Network
- Brand type: Low-Volume Standard
- Campaign use case: Low Volume Mixed
- Industry: Real Estate
- Expected traffic: fewer than 100 maintenance text messages per month
- Marketing content: No
- Age-gated, lending, gambling, political, or affiliate content: No
- Embedded links: Yes, first-party secure job-acceptance links
- Embedded phone numbers: No

## Campaign description

We Flip Houses LLC sends operational maintenance job-offer and job-status text
messages to independent handymen who explicitly join the Homestead Hill
Maintenance Network. Messages may include the apartment property or unit, a
repair summary, an authorized spending limit, a first-party secure acceptance
link, and accepted, filled, cancelled, or expired job updates. Messages are not
marketing promotions. Volume is expected to remain below 100 messages per
month.

## Message flow / opt-in

Handymen opt in by visiting:

`https://homestead-helper.daltondellinger1.chatgpt.site/handyman-sms-signup`

The handyman enters a name and mobile number, may enter a company and email,
and must actively check an unchecked SMS consent box. The disclosure identifies
We Flip Houses LLC, describes Homestead Hill maintenance opportunities and
job-status updates, says message frequency varies, states that message and data
rates may apply, provides STOP and HELP instructions, and states that consent is
not a condition of purchasing goods or services. The form links directly to the
public SMS Terms and Privacy Policy. Submission records the disclosure version,
source URL, consent timestamp, contact information, and user agent. The roster
allows dispatch only to records with current `consented` status and a valid US
mobile number.

Privacy Policy:

`https://homestead-helper.daltondellinger1.chatgpt.site/privacy-policy`

SMS Terms:

`https://homestead-helper.daltondellinger1.chatgpt.site/sms-terms`

## Representative message samples

1. `We Flip Houses LLC — Homestead Hill job: [unit/property] — [repair summary]. Authorized up to $[amount]. First confirmed acceptance gets it: [secure first-party link] Reply STOP to opt out or HELP for help.`

2. `We Flip Houses LLC — You accepted the Homestead Hill job at [unit/property]. The job is assigned to you. Contact Dalton or Briana before exceeding the $[amount] authorization. Reply STOP to opt out or HELP for help.`

3. `We Flip Houses LLC — The Homestead Hill job at [unit/property] was accepted by another handyman and is no longer available. No action is needed. Reply STOP to opt out or HELP for help.`

4. `We Flip Houses LLC — The Homestead Hill maintenance offer for [unit/property] was cancelled. No action is needed. Reply STOP to opt out or HELP for help.`

## HELP and STOP behavior

- Twilio Advanced Opt-Out should recognize `STOP`, `UNSUBSCRIBE`, `CANCEL`,
  `END`, `QUIT`, `STOPALL`, and `REVOKE`.
- STOP confirmation: `We Flip Houses LLC: You have been unsubscribed from the Homestead Hill Maintenance Network and will receive no further messages.`
- HELP response: `We Flip Houses LLC: Homestead Hill maintenance text help. Email dalton@wefliphouses.com. Reply STOP to opt out.`
- START confirmation: `We Flip Houses LLC: You are subscribed to Homestead Hill maintenance opportunities and job updates. Message frequency varies. Msg & data rates may apply. Reply HELP for help or STOP to opt out.`

## Final submission checks

- Verify the legal name, EIN, entity type, and registered address exactly match
  IRS records.
- Verify the authorized representative's full mobile number and business email.
- Complete the Brand Contact Email 2FA.
- Put the existing Twilio 10DLC number in the campaign's Messaging Service
  sender pool before submission.
- Confirm all three public compliance URLs resolve without login.
- Keep `MAINTENANCE_SMS_ENABLED=false` until the Brand and Campaign are approved
  and one controlled canary is explicitly authorized.
