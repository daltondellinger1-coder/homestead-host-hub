import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import type { Unit } from '@/types/property';

interface LogMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  defaultUnitId?: string;
}

export default function LogMaintenanceDialog({ open, onOpenChange, units, defaultUnitId }: LogMaintenanceDialogProps) {
  const { createRequest } = useMaintenanceRequests();
  const [unitId, setUnitId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setUnitId(defaultUnitId || units[0]?.id || '');
      setTitle('');
      setDescription('');
      setPhotoUrl('');
      setReporterName('');
    }
  }, [open, defaultUnitId, units]);

  const handleSubmit = async () => {
    if (!unitId || !title.trim()) return;
    setSubmitting(true);
    const ok = await createRequest({
      unit_id: unitId,
      title: title.trim(),
      description: description.trim() || undefined,
      photo_url: photoUrl.trim() || undefined,
      reporter_name: reporterName.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Log Maintenance Request</DialogTitle>
          <DialogDescription className="font-body text-xs">
            Add a request from a tenant email, text, or call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Unit *</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {units.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Issue title *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Leaking kitchen faucet"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Details from the tenant..."
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Photo URL</Label>
            <Input
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="Paste a link from the form email"
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reported by</Label>
            <Input
              value={reporterName}
              onChange={e => setReporterName(e.target.value)}
              placeholder="Tenant name"
              maxLength={120}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !unitId || !title.trim()}>
            {submitting ? 'Logging...' : 'Log Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
