import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Home, Loader2, Wrench } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OfferView = {
  status: string;
  recipientName: string;
  title: string;
  description: string | null;
  unitName: string;
  priority: string;
  emergency: boolean;
  maxAuthorizedCost: number;
  managerNote: string | null;
  expiresAt: string;
};

export default function MaintenanceOffer() {
  const { token = '' } = useParams();
  const [offer, setOffer] = useState<OfferView | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('maintenance-offer', {
      body: { action: 'view', token },
    });
    if (error || data?.error || !data?.offer) {
      setMessage(data?.error ?? 'This job link is invalid or has expired.');
      setOffer(null);
    } else {
      setOffer(data.offer as OfferView);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async () => {
    setAccepting(true);
    const { data, error } = await supabase.functions.invoke('maintenance-offer', {
      body: { action: 'accept', token },
    });
    setAccepting(false);
    if (error || data?.error) {
      setMessage(data?.error ?? 'The job could not be accepted. Please try again.');
      return;
    }
    if (data.result === 'accepted') {
      setOffer((current) => current ? { ...current, status: 'accepted' } : current);
      setMessage(data.already_accepted ? 'This job is already assigned to you.' : 'The job is yours. Dalton or Briana can now see your acceptance.');
      return;
    }
    if (data.result === 'already_filled') {
      setOffer((current) => current ? { ...current, status: 'already_filled' } : current);
      setMessage(data.winner_name ? `This job was already accepted by ${data.winner_name}.` : 'Another handyman accepted this job first.');
      return;
    }
    setOffer((current) => current ? { ...current, status: data.result } : current);
    setMessage(data.result === 'expired' ? 'The acceptance window has expired.' : 'This job is no longer available.');
  };

  if (loading) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
        <Loader2 className="h-7 w-7 animate-spin text-secondary" aria-label="Loading job" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border/60">
          <CardContent className="space-y-3 p-6 text-center">
            <AlertTriangle className="mx-auto h-9 w-9 text-warning" />
            <h1 className="font-heading text-xl font-semibold">Job link unavailable</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unavailable = ['already_filled', 'lost', 'expired', 'cancelled', 'send_failed'].includes(offer.status);
  const accepted = offer.status === 'accepted';

  return (
    <div className="min-h-screen pattern-bg px-4 py-8 sm:py-14">
      <Card className="mx-auto w-full max-w-lg overflow-hidden border-border/60">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wrench className="h-4 w-4 text-secondary" />
            Homestead Hill maintenance
          </div>
          <h1 className="mt-3 font-heading text-2xl font-bold">{offer.title}</h1>
        </div>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1"><Home className="h-3 w-3" />{offer.unitName}</Badge>
            {(offer.emergency || offer.priority === 'emergency') && <Badge variant="destructive">Emergency</Badge>}
            <Badge variant="secondary">Up to ${Number(offer.maxAuthorizedCost).toFixed(2)}</Badge>
          </div>
          <CardTitle className="text-base">Hi {offer.recipientName}, are you available for this job?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {offer.description && <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{offer.description}</p>}
          {offer.managerNote && (
            <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Property manager note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{offer.managerNote}</p>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4 shrink-0" />
            The first confirmed acceptance gets the job. This offer expires {new Date(offer.expiresAt).toLocaleString()}.
          </div>

          {message && (
            <Alert>
              {accepted ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {accepted ? (
            <div className="rounded-lg bg-success/10 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <p className="mt-2 font-heading text-lg font-semibold">You got the job</p>
              <p className="mt-1 text-sm text-muted-foreground">The property manager has been notified.</p>
            </div>
          ) : unavailable ? (
            <div className="rounded-lg bg-muted/40 p-5 text-center">
              <p className="font-heading text-lg font-semibold">Job no longer available</p>
              <p className="mt-1 text-sm text-muted-foreground">No action is needed.</p>
            </div>
          ) : (
            <Button size="lg" onClick={accept} disabled={accepting} className="w-full text-base">
              {accepting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              {accepting ? 'Confirming…' : 'Accept this job'}
            </Button>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            Accepting assigns the job within the displayed spending limit. Contact Dalton or Briana before exceeding it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
