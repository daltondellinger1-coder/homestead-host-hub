import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import UnitCard from '@/components/UnitCard';
import { Unit } from '@/types/property';
import { GripVertical } from 'lucide-react';

interface SortableUnitCardProps {
  unit: Unit;
  index: number;
  isDragging: boolean;
  onAddGuest: (unitId: string) => void;
  onEditGuest: (unitId: string) => void;
  onEditUnit: (unitId: string) => void;
  onRecordPayment: (unitId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
  onRemoveGuest: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onViewHistory: (unitId: string) => void;
}

export default function SortableUnitCard({
  unit,
  index,
  isDragging,
  onAddGuest,
  onEditGuest,
  onEditUnit,
  onRecordPayment,
  onMarkPaid,
  onRemoveGuest,
  onDeleteUnit,
  onViewHistory,
}: SortableUnitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: unit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle — sits inside the card top-right on mobile for better space */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3.5 -left-0.5 sm:left-1 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 sm:h-4 sm:w-4" />
      </div>
      <div className="pl-6 sm:pl-7">
        <UnitCard
          unit={unit}
          index={index}
          onAddGuest={onAddGuest}
          onEditGuest={onEditGuest}
          onEditUnit={onEditUnit}
          onRecordPayment={onRecordPayment}
          onMarkPaid={onMarkPaid}
          onRemoveGuest={onRemoveGuest}
          onDeleteUnit={onDeleteUnit}
          onViewHistory={onViewHistory}
        />
      </div>
    </div>
  );
}
