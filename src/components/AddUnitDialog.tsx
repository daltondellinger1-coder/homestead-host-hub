import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export default function AddUnitDialog({ open, onClose, onSave }: AddUnitDialogProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setName(''); onClose(); } }}>
      <DialogContent className="sm:max-w-sm font-body">
        <DialogHeader>
          <DialogTitle className="font-heading">Add New Unit</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="unit-name">Unit Name</Label>
          <Input
            id="unit-name"
            placeholder="e.g. Unit E, Cabin 3"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setName(''); onClose(); }} className="font-body">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="font-body">Add Unit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
