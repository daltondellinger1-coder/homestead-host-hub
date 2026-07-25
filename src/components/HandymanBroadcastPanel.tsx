import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, MessageSquareText, Send, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { MaintenanceRequest } from '@/hooks/useMaintenanceRequests';

type Handyman = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  trade: string;
  emergency_availability: boolean;
  sms_consent_status: 'unknown' | 'consented' | 'opted_out';
};

type BroadcastSummary = {
  id: string;
  status: string;
  max_authorized_cost: number;
  expires_at: string;
  accepted_at: string | null;
  accepted_vendor: { name: string } | { name: string }[] | null;
  offers: Array<{ id: string; status: string; initial_message_status: string }>;
};

function displayVendorName(vendor: Handyman) {
  return vendor.company ? `${vendor.name} · ${vendor.company}` : vendor.name;
}

function extractFunctionError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

export default function HandymanBroadcastPanel({
  request,
  unitName,
}: {
  request: MaintenanceRequest;
  unitName: string;
}) {
  // Broadcast tables are introduced by this rollout and will be added to the
  // generated Supabase types after the production migration is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const isEmergency = Boolean(request.emergency) || request.priority === 'emergency';
  const [handymen, setHandymen] = useState<Handyman[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState(isEmergency ? '500' : '250');
  const [expiresHours, setExpiresHours] = useState('4');
  const [managerNote, setManagerNote] = useState('');
  const [broadcasts, setBroadcasts] = useState<BroadcastSummary[]>([]);
  const [smsReady, setSmsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [vendorsResult, broadcastsResult, statusResult] = await Promise.all([
      db.from('vendors')
        .select('id,name,company,phone,trade,emergency_availability,sms_consent_status')
        .eq('active', true)
        .order('trade')
        .order('name'),
      db.from('maintenance_broadcasts')
        .select('id,status,max_authorized_cost,expires_at,accepted_at,accepted_vendor:vendors!accepted_vendor_id(name),offers:maintenance_offers(id,status,initial_message_status)')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.functions.invoke('maintenance-sms', { body: { action: 'status' } }),
    ]);

    const roster = ((vendorsResult.data ?? []) as Handyman[]);
    setHandymen(roster);
    setSelected((current) => {
      const valid = current.filter((id) => roster.some((vendor) => vendor.id === id && vendor.sms_consent_status === 'consented' && vendor.phone));
      if (valid.length) return valid;
      return roster
        .filter((vendor) => vendor.sms_consent_status === 'consented' && vendor.phone && (vendor.trade === 'handyman' || vendor.trade === 'general contractor'))
        .map((vendor) => vendor.id);
    });
    setBroadcasts((broadcastsResult.data ?? []) as BroadcastSummary[]);
    setSmsReady(Boolean(statusResult.data?.ready));
    setLoading(false);
  }, [db, request.id]);

  useEffect(() => {
    setAmount(isEmergency ? '500' : '250');
    setManagerNote('');
    void load();
  }, [isEmergency, load, request.id]);

  const eligible = useMemo(
    () => handymen.filter((vendor) => vendor.phone && vendor.sms_consent_status === 'consented'),
    [handymen],
  );
  const latest = broadcasts[0];
  const openBroadcast = broadcasts.find((broadcast) => broadcast.status === 'open');
  const winner = latest?.accepted_vendor
    ? (Array.isArray(latest.accepted_vendor) ? latest.accepted_vendor[0]?.name : latest.accepted_vendor.name)
    : null;

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id));
  };

  const send = async () => {
    const authorizedAmount = Number(amount);
    if (!selected.length) {
      toast.error('Select at least one handyman.');
      return;
    }
    if (!Number.isFinite(authorizedAmount) || authorizedAmount < 0) {
      toast.error('Enter a valid authorized amount.');
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('maintenance-sms', {
      body: {
        action: 'broadcast',
        requestId: request.id,
        vendorIds: selected,
        maxAuthorizedCost: authorizedAmount,
        expiresHours: Number(expiresHours),
        managerNote,
      },
    });
    setSending(false);
    if (error || data?.error) {
      toast.error(data?.error ?? extractFunctionError(error, 'The job texts could not be sent.'));
      return;
    }
    toast.success(`Job texted to ${data.recipientCount} ${data.recipientCount === 1 ? 'handyman' : 'handymen'}.`);
    await load();
  };

  const cancel = async () => {
    if (!openBroadcast) return;
    setCancelling(true);
    const { data, error } = await supabase.functions.invoke('maintenance-sms', {
      body: { action: 'cancel', broadcastId: openBroadcast.id },
    });
    setCancelling(false);
    if (error || data?.error) {
      toast.error(data?.error ?? extractFunctionError(error, 'The broadcast could not be cancelled.'));
      return;
    }
    toast.success('Broadcast cancelled. Handymen who received it are being notified.');
    await load();
  };

  return (
    <div className="space-y-4 rounded-lg border border-secondary/30 bg-secondary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-secondary" />
            <h3 className="font-heading text-sm font-semibold">Text this job to handymen</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The first confirmed acceptance gets the assignment. Everyone else is notified automatically.
          </p>
        </div>
        {latest && (
          <Badge variant={latest.status === 'filled' ? 'default' : 'outline'} className="shrink-0 capitalize">
            {latest.status.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {latest?.status === 'filled' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Assigned to <strong>{winner ?? 'the first handyman'}</strong>
            {latest.accepted_at ? ` on ${new Date(latest.accepted_at).toLocaleString()}` : ''}.
          </AlertDescription>
        </Alert>
      )}

      {!smsReady && (
        <Alert>
          <Clock3 className="h-4 w-4" />
          <AlertDescription>
            Twilio activation is still being finished. You can prepare the roster now; live job texts remain off until the connection is verified.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs">
          <UsersRound className="h-3.5 w-3.5" />
          Recipients
        </Label>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading handyman roster…</p>
        ) : eligible.length ? (
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-md border border-border/50 bg-background/40 p-2">
            {eligible.map((vendor) => (
              <label key={vendor.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                <Checkbox
                  checked={selected.includes(vendor.id)}
                  onCheckedChange={(checked) => toggle(vendor.id, checked === true)}
                  aria-label={`Text ${displayVendorName(vendor)}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{displayVendorName(vendor)}</span>
                  <span className="block text-xs text-muted-foreground">{vendor.trade} · {vendor.phone}</span>
                </span>
                {vendor.emergency_availability && <Badge variant="outline" className="text-[10px]">Emergency</Badge>}
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Add a vendor with a cellphone number and confirmed text consent in Operations → More.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`authorized-${request.id}`} className="text-xs">Authorized spending limit</Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
            <Input
              id={`authorized-${request.id}`}
              type="number"
              min="0"
              step="25"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="pl-7"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Approval is required above ${isEmergency ? '500 emergency' : '250 routine'}.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Acceptance window</Label>
          <Select value={expiresHours} onValueChange={setExpiresHours}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 hours</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="8">8 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`manager-note-${request.id}`} className="text-xs">Message note (optional)</Label>
        <Textarea
          id={`manager-note-${request.id}`}
          value={managerNote}
          onChange={(event) => setManagerNote(event.target.value)}
          placeholder={`Anything the handymen should know about ${unitName}`}
          rows={2}
          maxLength={500}
        />
      </div>

      <Button
        onClick={send}
        disabled={!smsReady || sending || !eligible.length || !selected.length || Boolean(openBroadcast)}
        className="w-full"
      >
        <Send className="mr-2 h-4 w-4" />
        {sending ? 'Sending job texts…' : openBroadcast ? 'Waiting for an acceptance' : `Text ${selected.length || ''} ${selected.length === 1 ? 'handyman' : 'handymen'}`}
      </Button>
      {openBroadcast && (
        <Button variant="ghost" onClick={cancel} disabled={cancelling} className="w-full text-muted-foreground">
          {cancelling ? 'Cancelling…' : 'Cancel this broadcast'}
        </Button>
      )}
    </div>
  );
}
