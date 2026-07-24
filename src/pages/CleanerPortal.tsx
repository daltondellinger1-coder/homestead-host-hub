import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Check, Clock3, DoorOpen, HelpCircle, LogOut, PackageOpen, RefreshCcw, ShieldCheck, Sparkles, TriangleAlert, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CleanerTutorial } from '@/components/OnboardingTutorial';
import { useCleanerOnboardingState } from '@/hooks/useTutorialState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CLEANING_STATUS_LABELS } from '@/lib/operations';

interface CleanerTask {
  id: string;
  status: string;
  confirmation_status: string;
  checkout_at: string;
  next_check_in_at?: string | null;
  cleaning_deadline: string;
  special_notes?: string | null;
  pet_notes?: string | null;
  linen_notes?: string | null;
  unit?: { name?: string } | null;
}

// The cleaning tables are added by the V1 migration; regenerate the Supabase
// client types after applying it and this compatibility cast can be removed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const operationsDb = supabase as any;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function when(value?: string | null) {
  return value ? new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No next check-in';
}

export default function CleanerPortal() {
  const { token } = useParams();
  const { session, signOut } = useAuth();
  const { isComplete: cleanerOnboardingComplete } = useCleanerOnboardingState();
  const [tasks, setTasks] = useState<CleanerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(!cleanerOnboardingComplete);
  const [active, setActive] = useState<CleanerTask | null>(null);
  const [notes, setNotes] = useState('');
  const [supplies, setSupplies] = useState('');
  const [damage, setDamage] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const invokePublic = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('cleaner-task-access', { body: { token, ...body } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (token) {
        const data = await invokePublic({ action: 'view' });
        setTasks(data.task ? [data.task] : []);
      } else if (session) {
        const { data, error } = await operationsDb
          .from('cleaning_tasks')
          .select('id,status,confirmation_status,checkout_at,next_check_in_at,cleaning_deadline,special_notes,pet_notes,linen_notes,unit:units(name)')
          .eq('assigned_cleaner_user_id', session.user.id)
          .not('status', 'in', '("ready","cancelled")')
          .order('cleaning_deadline');
        if (error) throw error;
        setTasks(data ?? []);
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'This cleaning link is invalid or expired.'));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [invokePublic, session, token]);

  useEffect(() => { load(); }, [load]);

  const act = async (task: CleanerTask, action: string, payload: Record<string, unknown> = {}) => {
    setBusyAction(`${task.id}:${action}`);
    try {
      if (token) {
        await invokePublic({ action, ...payload });
      } else {
        const updates: Record<string, unknown> = {};
        if (action === 'confirm') Object.assign(updates, { status: 'confirmed', confirmation_status: 'confirmed', confirmed_at: new Date().toISOString() });
        if (action === 'decline') Object.assign(updates, { status: 'cleaner_declined', confirmation_status: 'declined', declined_at: new Date().toISOString() });
        if (action === 'start') Object.assign(updates, { status: 'in_progress' });
        if (action === 'complete') Object.assign(updates, payload, { status: 'completed' });
        const { error } = await operationsDb.from('cleaning_tasks').update(updates).eq('id', task.id);
        if (error) throw error;
      }
      toast.success(action === 'complete' ? 'Cleaning submitted for readiness verification.' : `Cleaning ${action} recorded.`);
      setActive(null);
      await load();
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'That update could not be saved.'));
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const uploadPhotos = async () => {
    if (!active || !photos.length) return [] as string[];
    const paths: string[] = [];
    for (const photo of photos) {
      if (token) {
        const issued = await invokePublic({ action: 'upload_url', fileName: photo.name, contentType: photo.type, fileSize: photo.size });
        const { error } = await supabase.storage.from('cleaning-photos').uploadToSignedUrl(issued.path, issued.uploadToken, photo, { contentType: photo.type });
        if (error) throw error;
        paths.push(issued.path);
      } else {
        const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const path = `${active.id}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from('cleaning-photos').upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        });
        if (error) throw error;
        paths.push(path);
      }
    }
    return paths;
  };

  const complete = async () => {
    if (!active || busyAction) return;
    setBusyAction(`${active.id}:complete`);
    try {
      const photoPaths = await uploadPhotos();
      const saved = await act(active, 'complete', {
        completion_notes: notes,
        supplies_needed: supplies,
        damage_found: damage,
        maintenance_issue_found: maintenance,
        completion_photo_urls: photoPaths,
      });
      if (saved) {
        setNotes('');
        setSupplies('');
        setDamage('');
        setMaintenance('');
        setPhotos([]);
      }
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Photos could not be uploaded.'));
      setBusyAction(null);
    }
  };

  return (
    <div className="min-h-screen pattern-bg">
      <header className="border-b border-border/60 bg-background/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="gold-gradient flex h-10 w-10 items-center justify-center rounded-xl text-background"><Sparkles className="h-5 w-5" /></div>
            <div><h1 className="font-heading text-lg font-bold">Cleaning assignments</h1><p className="text-xs text-muted-foreground">Only the work assigned to you</p></div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowTutorial(true)} aria-label="Open cleaner tutorial">
              <HelpCircle className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Tutorial</span>
            </Button>
            <Button variant="ghost" size="sm" disabled={loading} onClick={load} aria-label="Refresh cleaning assignments">
              <RefreshCcw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
            {session && !token && <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-10">
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardContent className="flex gap-3 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
            <p className="text-sm text-emerald-100/80">This page shows unit and turnover details only. It does not include guest finances, owner records, passwords, or unrelated units.</p>
          </CardContent>
        </Card>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground"><RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Loading assignment…</div>
        ) : tasks.length === 0 ? (
          <Card><CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center"><Check className="mb-3 h-8 w-8 text-emerald-300" /><p className="font-medium">No active cleaning assignments</p><p className="mt-1 text-sm text-muted-foreground">You’re all caught up.</p></CardContent></Card>
        ) : tasks.map((task) => (
          <Card key={task.id} className="overflow-hidden border-border/70">
            <CardHeader className="border-b border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xl">{task.unit?.name ?? 'Unit'}</CardTitle>
                <Badge variant="outline">{CLEANING_STATUS_LABELS[task.status] ?? task.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info icon={LogOut} label="Guest checkout" value={when(task.checkout_at)} />
                <Info icon={DoorOpen} label="Next check-in" value={when(task.next_check_in_at)} />
                <Info icon={Clock3} label="Cleaning deadline" value={when(task.cleaning_deadline)} urgent />
              </div>
              {(task.special_notes || task.pet_notes || task.linen_notes) && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-amber-100">Special notes</p>
                  <p className="mt-1 text-amber-100/75">{[task.special_notes, task.pet_notes, task.linen_notes].filter(Boolean).join(' · ')}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {task.status === 'awaiting_confirmation' && (
                  <>
                    <Button
                      variant="outline"
                      className="min-h-12"
                      disabled={Boolean(busyAction)}
                      onClick={() => {
                        if (window.confirm('Decline this cleaning assignment? Briana will be notified to reassign it.')) {
                          act(task, 'decline');
                        }
                      }}
                    >
                      Decline
                    </Button>
                    <Button className="min-h-12" disabled={Boolean(busyAction)} onClick={() => act(task, 'confirm')}>Confirm assignment</Button>
                  </>
                )}
                {task.status === 'confirmed' && <Button className="col-span-2 min-h-12" disabled={Boolean(busyAction)} onClick={() => act(task, 'start')}>Start cleaning</Button>}
                {task.status === 'in_progress' && <Button className="col-span-2 min-h-12" disabled={Boolean(busyAction)} onClick={() => setActive(task)}><Check className="mr-2 h-4 w-4" /> Finish & report</Button>}
              </div>
              {['completed', 'readiness_verification_required'].includes(task.status) && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                  <p className="font-medium text-emerald-100">Your cleaning is submitted</p>
                  <p className="mt-1 text-sm text-emerald-100/75">No more action is needed. Briana will do the final readiness check.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </main>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complete {active?.unit?.name ?? 'cleaning'}</DialogTitle><DialogDescription>Report supplies, damage, or maintenance now. Briana will verify readiness next.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <Field icon={PackageOpen} label="Supplies needed"><Textarea value={supplies} onChange={(event) => setSupplies(event.target.value)} placeholder="Leave blank if none" /></Field>
            <Field icon={TriangleAlert} label="Damage found"><Textarea value={damage} onChange={(event) => setDamage(event.target.value)} placeholder="Leave blank if none" /></Field>
            <Field icon={Wrench} label="Maintenance issue"><Textarea value={maintenance} onChange={(event) => setMaintenance(event.target.value)} placeholder="Leave blank if none" /></Field>
            <Field icon={Camera} label="Completion photos">
              <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 10))} />
              <p className="text-xs text-muted-foreground">
                {photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected.` : 'JPEG, PNG, or WebP. Up to 10 photos.'}
              </p>
            </Field>
            <div className="space-y-2"><Label>Completion notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything Briana should know?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(busyAction)} onClick={() => setActive(null)}>Keep working</Button>
            <Button disabled={Boolean(busyAction)} onClick={complete}>
              {busyAction ? 'Submitting…' : 'Submit for readiness check'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CleanerTutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}

function Info({ icon: Icon, label, value, urgent = false }: { icon: typeof Clock3; label: string; value: string; urgent?: boolean }) {
  return <div className="rounded-xl border border-border/70 p-3"><Icon className={urgent ? 'h-4 w-4 text-amber-300' : 'h-4 w-4 text-secondary'} /><p className="mt-2 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}

function Field({ icon: Icon, label, children }: { icon: typeof Clock3; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</Label>{children}</div>;
}
