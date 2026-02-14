import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import UnitCard from '@/components/UnitCard';
import { Unit } from '@/types/property';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableUnitCardProps {
  unit: Unit;
  index: number;
  totalUnits: number;
  isDragging: boolean;
  onMoveUp: (unitId: string) => void;
  onMoveDown: (unitId: string) => void;
  onAddGuest: (unitId: string) => void;
  onEditGuest: (unitId: string) => void;
  onEditUnit: (unitId: string) => void;
  onRecordPayment: (unitId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
  onRemoveGuest: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onViewHistory: (unitId: string) => void;
  onSchedulePayments: (unitId: string, futureGuestId?: string) => void;
  onEditFutureGuest: (unitId: string, futureGuestId: string) => void;
  onDeleteFutureGuest: (futureGuestId: string) => void;
  onDeleteCurrentGuest: (unitId: string) => void;
}

export default function SortableUnitCard({
  unit,
  index,
  totalUnits,
  isDragging,
  onMoveUp,
  onMoveDown,
  onAddGuest,
  onEditGuest,
  onEditUnit,
  onRecordPayment,
  onMarkPaid,
  onRemoveGuest,
  onDeleteUnit,
  onViewHistory,
  onSchedulePayments,
  onEditFutureGuest,
  onDeleteFutureGuest,
  onDeleteCurrentGuest,
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

  const isFirst = index === 0;
  const isLast = index === totalUnits - 1;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Reorder controls — drag handle + arrow buttons */}
      <div className="absolute top-2 -left-0.5 sm:left-0.5 z-10 flex flex-col items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-20 disabled:pointer-events-none"
          onClick={() => onMoveUp(unit.id)}
          disabled={isFirst}
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-20 disabled:pointer-events-none"
          onClick={() => onMoveDown(unit.id)}
          disabled={isLast}
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="pl-7 sm:pl-8">
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
          onSchedulePayments={onSchedulePayments}
          onEditFutureGuest={onEditFutureGuest}
          onDeleteFutureGuest={onDeleteFutureGuest}
          onDeleteCurrentGuest={onDeleteCurrentGuest}
        />
      </div>
    </div>
  );
}
