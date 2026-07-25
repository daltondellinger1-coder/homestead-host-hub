import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2, MessageSquareText, ShieldCheck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DISCLOSURE_VERSION = '2026-07-25';

export default function HandymanSmsSignup() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!consented) {
      setError('Please check the consent box before joining the maintenance text list.');
      return;
    }

    setSubmitting(true);
    const { data, error: invokeError } = await supabase.functions.invoke('handyman-sms-consent', {
      body: {
        name,
        company,
        phone,
        email,
        website,
        consented,
        disclosureVersion: DISCLOSURE_VERSION,
        sourceUrl: window.location.href,
      },
    });
    setSubmitting(false);

    if (invokeError || data?.error) {
      setError(data?.error ?? 'We could not save your signup. Please check your information and try again.');
      return;
    }
    setComplete(true);
  };

  return (
    <div className="min-h-screen pattern-bg px-4 py-8 sm:py-14">
      <Card className="mx-auto w-full max-w-xl overflow-hidden border-border/60 shadow-lg">
        <div className="bg-primary px-6 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wrench className="h-4 w-4 text-secondary" />
            Homestead Hill maintenance network
          </div>
          <h1 className="mt-3 font-heading text-2xl font-bold">Get maintenance job offers by text</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-primary-foreground/80">
            Join the handyman list for occasional repair opportunities and job-status updates from We Flip Houses LLC.
          </p>
        </div>

        {complete ? (
          <CardContent className="space-y-5 p-6 text-center sm:p-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <div>
              <h2 className="font-heading text-xl font-semibold">You’re on the list</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We saved your consent. When a matching Homestead Hill maintenance job comes up, you may receive a text with the scope, spending limit, and a secure acceptance link.
              </p>
            </div>
            <Alert className="text-left">
              <MessageSquareText className="h-4 w-4" />
              <AlertDescription>
                Message frequency varies. Reply STOP at any time to opt out or HELP for help.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="company" autoComplete="organization" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={120} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(812) 555-1234" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={160} />
                  </div>
                </div>

                <div className="hidden" aria-hidden="true">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="sms-consent" checked={consented} onCheckedChange={(checked) => setConsented(checked === true)} />
                    <Label htmlFor="sms-consent" className="font-normal leading-5">
                      I agree to receive recurring operational text messages from We Flip Houses LLC about Homestead Hill maintenance opportunities and job-status updates at the mobile number provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchasing goods or services.
                    </Label>
                  </div>
                  <p className="mt-3 pl-7 text-xs leading-5 text-muted-foreground">
                    Read the <Link className="underline underline-offset-2" to="/sms-terms">SMS Terms</Link> and <Link className="underline underline-offset-2" to="/privacy-policy">Privacy Policy</Link>.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button className="w-full" size="lg" type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Saving your signup…' : 'Join the handyman text list'}
                </Button>
              </form>

              <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                Your mobile information will not be sold or shared with third parties for their marketing purposes.
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
