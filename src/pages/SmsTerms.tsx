import { MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

export default function SmsTerms() {
  return (
    <div className="min-h-screen pattern-bg px-4 py-8 sm:py-14">
      <Card className="mx-auto max-w-3xl border-border/60">
        <CardContent className="space-y-7 p-6 sm:p-10">
          <header className="space-y-3 border-b border-border pb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary"><MessageSquareText className="h-4 w-4" />We Flip Houses LLC</div>
            <h1 className="font-heading text-3xl font-bold">SMS Terms and Conditions</h1>
            <p className="text-sm text-muted-foreground">Effective July 25, 2026</p>
          </header>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Program description</h2>
            <p className="text-sm leading-7 text-muted-foreground">The Homestead Hill Maintenance Network is an operational messaging program from We Flip Houses LLC. Consented handymen may receive repair opportunities, property or scope summaries, authorized spending limits, secure job-acceptance links, and accepted, filled, cancelled, or other job-status updates. These messages are not marketing promotions.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Consent and frequency</h2>
            <p className="text-sm leading-7 text-muted-foreground">By submitting the signup form and checking the SMS consent box, you authorize recurring automated operational texts to the mobile number provided. Message frequency varies and may be zero when no matching work is available. Consent is not a condition of purchasing goods or services.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Charges, opt-out, and help</h2>
            <p className="text-sm leading-7 text-muted-foreground">Message and data rates may apply. Reply STOP to any message to opt out. After opting out, you may receive one confirmation message and then no further program messages unless you opt in again. Reply HELP for help or email <a className="underline underline-offset-2" href="mailto:dalton@wefliphouses.com">dalton@wefliphouses.com</a>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Delivery and availability</h2>
            <p className="text-sm leading-7 text-muted-foreground">Carriers are not liable for delayed or undelivered messages. Receiving a job offer does not guarantee assignment. When an offer says the first confirmed acceptance receives the job, another handyman may accept before you. Any displayed scope and spending limit govern the offer unless a property manager approves a change.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Privacy and changes</h2>
            <p className="text-sm leading-7 text-muted-foreground">Our <Link className="underline underline-offset-2" to="/privacy">Privacy Policy</Link> explains how information is handled. We may update these terms and will post the effective date here. Material program changes may require renewed consent.</p>
          </section>

          <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
            <Link className="underline underline-offset-2" to="/handyman-sms-signup">Handyman signup</Link>
            <Link className="underline underline-offset-2" to="/privacy">Privacy Policy</Link>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
