import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, AlertTriangle, Archive } from 'lucide-react';
import { useMaintenanceRequests, type MaintenanceRequest, type MaintenanceStatus } from '@/hooks/useMaintenanceRequests';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface MaintenanceRequestDialogProps {
  request: MaintenanceRequest | null;
  unitName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function MaintenanceRequestDialog({ request, unitName, open, onOpenChange }: MaintenanceRequestDialogProps) {
  const { updateRequest, deleteRequest } = useMaintenanceRequests();
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(request?.notes ?? '');
  }, [request]);

  if (!request) return null;

  const handleStatus = async (status: MaintenanceStatus) => {
    await updateRequest(request.id, { status });
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await updateRequest(request.id, { notes: notes.trim() || null });
    setSavingNotes(false);
  };

  const handleDelete = async () => {
    const ok = await deleteRequest(request.id);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{request.title}</DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className="text-xs font-body">{unitName}</Badge>
            {request.reporter_name && (
              <span className="text-xs text-muted-foreground font-body">Reported by {request.reporter_name}</span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {request.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm font-body mt-1 whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {(() => {
            const photos = ((request.photo_urls ?? []) as string[]).length
              ? (request.photo_urls as string[])
              : (request.photo_url ? [request.photo_url] : []);
            if (!photos.length) return null;
            return (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Photos {photos.length > 1 && <span className="text-secondary">({photos.length})</span>}
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {photos.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-md overflow-hidden border border-border/40 bg-muted/30 hover:border-secondary/60 transition-colors"
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2">
            <Label className="flex items-center gap-2 text-sm font-body cursor-pointer" htmlFor="urgent-toggle">
              <AlertTriangle className={`h-4 w-4 ${request.priority_urgent ? 'text-destructive' : 'text-muted-foreground'}`} />
              Mark as urgent
            </Label>
            <Switch
              id="urgent-toggle"
              checked={!!request.priority_urgent}
              onCheckedChange={(checked) => updateRequest(request.id, { priority_urgent: checked })}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {STATUS_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={request.status === opt.value ? 'default' : 'outline'}
                  onClick={() => handleStatus(opt.value)}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes (work performed, parts needed, etc.)"
              rows={3}
              className="mt-1.5"
              maxLength={2000}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveNotes}
              disabled={savingNotes || notes === (request.notes ?? '')}
              className="mt-2"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-body space-y-0.5 pt-2 border-t border-border/40">
            <div>Reported: {formatDateTime(request.reported_at)}</div>
            {request.completed_at && <div>Completed: {formatDateTime(request.completed_at)}</div>}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {request.status !== 'archived' ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => updateRequest(request.id, { status: 'archived' })}
              >
                <Archive className="h-4 w-4 mr-1.5" /> Archive
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateRequest(request.id, { status: 'new' })}
              >
                <Archive className="h-4 w-4 mr-1.5" /> Unarchive
              </Button>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
