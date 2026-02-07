import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableUnitCard from '@/components/SortableUnitCard';
import UnitCard from '@/components/UnitCard';
import { Unit } from '@/types/property';

interface SortableUnitGridProps {
  units: Unit[];
  onReorder: (activeId: string, overId: string) => void;
  onAddGuest: (unitId: string) => void;
  onEditGuest: (unitId: string) => void;
  onEditUnit: (unitId: string) => void;
  onRecordPayment: (unitId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
  onRemoveGuest: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
}

export default function SortableUnitGrid({
  units,
  onReorder,
  onAddGuest,
  onEditGuest,
  onEditUnit,
  onRecordPayment,
  onMarkPaid,
  onRemoveGuest,
  onDeleteUnit,
}: SortableUnitGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeUnit = activeId ? units.find(u => u.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  }, [onReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={units.map(u => u.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {units.map((unit, i) => (
            <SortableUnitCard
              key={unit.id}
              unit={unit}
              index={i}
              isDragging={activeId === unit.id}
              onAddGuest={onAddGuest}
              onEditGuest={onEditGuest}
              onEditUnit={onEditUnit}
              onRecordPayment={onRecordPayment}
              onMarkPaid={onMarkPaid}
              onRemoveGuest={onRemoveGuest}
              onDeleteUnit={onDeleteUnit}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeUnit ? (
          <div className="opacity-90 rotate-[2deg] scale-105">
            <UnitCard
              unit={activeUnit}
              index={0}
              onAddGuest={() => {}}
              onEditGuest={() => {}}
              onEditUnit={() => {}}
              onRecordPayment={() => {}}
              onMarkPaid={() => {}}
              onRemoveGuest={() => {}}
              onDeleteUnit={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
