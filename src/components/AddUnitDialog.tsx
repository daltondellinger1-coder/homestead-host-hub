import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitType, UNIT_TYPE_LABELS, UNIT_TYPES } from '@/types/property';

interface AddUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, status?: any, unitType?: UnitType) => void;
}

export default function AddUnitDialog({ open, onClose, onSave }: AddUnitDialogProps) {
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('1br');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), 'vacant', unitType);
    setName('');
    setUnitType('1br');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setName(''); setUnitType('1br'); onClose(); } }}>
      <DialogContent className="sm:max-w-sm font-body">
        <DialogHeader>
          <DialogTitle className="font-heading">Add New Unit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="unit-name">Unit Name</Label>
            <Input
              id="unit-name"
              placeholder="e.g. Unit E, Cabin 3"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unit-type">Unit Type</Label>
            <Select value={unitType} onValueChange={v => setUnitType(v as UnitType)}>
              <SelectTrigger id="unit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setName(''); setUnitType('1br'); onClose(); }} className="font-body">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="font-body">Add Unit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
