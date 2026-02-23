import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitStatus, UnitType, STATUS_LABELS, UNIT_TYPE_LABELS, UNIT_TYPES } from '@/types/property';

interface EditUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, status: UnitStatus, unitType: UnitType) => void;
  currentName: string;
  currentStatus: UnitStatus;
  currentUnitType: UnitType;
}

const EDITABLE_STATUSES: UnitStatus[] = ['vacant', 'occupied', 'rented', 'planning', 'storage'];

export default function EditUnitDialog({ open, onClose, currentName, currentStatus, currentUnitType, onSave }: EditUnitDialogProps) {
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState<UnitStatus>(currentStatus);
  const [unitType, setUnitType] = useState<UnitType>(currentUnitType);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setStatus(currentStatus);
      setUnitType(currentUnitType);
    }
  }, [open, currentName, currentStatus, currentUnitType]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), status, unitType);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm font-body">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Unit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-unit-name">Unit Name</Label>
            <Input
              id="edit-unit-name"
              placeholder="e.g. Unit E, Cabin 3"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-unit-type">Unit Type</Label>
            <Select value={unitType} onValueChange={v => setUnitType(v as UnitType)}>
              <SelectTrigger id="edit-unit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-unit-status">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as UnitStatus)}>
              <SelectTrigger id="edit-unit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-body">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="font-body">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
