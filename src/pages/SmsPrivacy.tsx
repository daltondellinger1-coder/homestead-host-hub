import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

export default function SmsPrivacy() {
  return (
    <div className="min-h-screen pattern-bg px-4 py-8 sm:py-14">
      <Card className="mx-auto max-w-3xl border-border/60">
        <CardContent className="space-y-7 p-6 sm:p-10">
          <header className="space-y-3 border-b border-border pb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary"><ShieldCheck className="h-4 w-4" />We Flip Houses LLC</div>
            <h1 className="font-heading text-3xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Effective July 25, 2026</p>
          </header>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Information we collect</h2>
            <p className="text-sm leading-7 text-muted-foreground">When a handyman joins the Homestead Hill maintenance text list, we collect the name, mobile number, optional company and email, consent date, signup source, and the version of the disclosure accepted. We also retain maintenance-offer and response records needed to operate the program.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">How we use information</h2>
            <p className="text-sm leading-7 text-muted-foreground">We use this information to send maintenance opportunities, scope and authorization details, acceptance links, and job-status updates; maintain the vendor roster; document consent and opt-out requests; prevent abuse; and comply with legal and carrier requirements.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Mobile information and sharing</h2>
            <p className="text-sm leading-7 text-muted-foreground"><strong className="text-foreground">We do not sell, rent, or share mobile numbers or SMS consent information with third parties for their marketing or promotional purposes.</strong> We may provide limited information to service providers such as our SMS carrier solely to deliver and support the messages, or when required by law. SMS consent is not transferred to unrelated organizations.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Text-message disclosures</h2>
            <p className="text-sm leading-7 text-muted-foreground">Message frequency varies based on available maintenance work and job activity. Message and data rates may apply. Reply STOP to opt out and HELP for help. Opting out of texts does not prevent a handyman from contacting us through another method.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Retention and choices</h2>
            <p className="text-sm leading-7 text-muted-foreground">We retain consent and opt-out evidence for compliance and operational purposes. You may request access, correction, or deletion of your contact information, subject to records we must retain. To stop messages immediately, reply STOP.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">Contact</h2>
            <p className="text-sm leading-7 text-muted-foreground">Questions may be sent to <a className="underline underline-offset-2" href="mailto:dalton@wefliphouses.com">dalton@wefliphouses.com</a>.</p>
          </section>

          <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
            <Link className="underline underline-offset-2" to="/handyman-sms-signup">Handyman signup</Link>
            <Link className="underline underline-offset-2" to="/sms-terms">SMS Terms</Link>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
