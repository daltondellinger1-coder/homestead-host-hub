import { AirbnbBlock } from '@/hooks/useAirbnbBlocks';

export type CalendarSyncUnitHealth = {
  unitId: string;
  unitName: string;
  blockedNightsNext30: number;
  upcomingBlocks: number;
  nextBlockStart?: string;
  lastBlockEnd?: string;
};

export function isDateBlockedByCalendar(date: string, blocks: Pick<AirbnbBlock, 'checkIn' | 'checkOut'>[]) {
  return blocks.some((block) => date >= block.checkIn && date < block.checkOut);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function summarizeCalendarSyncHealth({
  units,
  blocksByUnit,
  today = new Date(),
}: {
  units: { id: string; name: string }[];
  blocksByUnit: Map<string, AirbnbBlock[]>;
  today?: Date;
}) {
  const start = toIsoDate(today);
  const end = toIsoDate(addDays(today, 30));
  const unitsWithBlocks = units.map((unit): CalendarSyncUnitHealth => {
    const blocks = (blocksByUnit.get(unit.id) ?? []).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    let blockedNightsNext30 = 0;
    for (let cursor = new Date(`${start}T00:00:00`); toIsoDate(cursor) < end; cursor = addDays(cursor, 1)) {
      if (isDateBlockedByCalendar(toIsoDate(cursor), blocks)) blockedNightsNext30 += 1;
    }
    return {
      unitId: unit.id,
      unitName: unit.name,
      blockedNightsNext30,
      upcomingBlocks: blocks.length,
      nextBlockStart: blocks[0]?.checkIn,
      lastBlockEnd: blocks[blocks.length - 1]?.checkOut,
    };
  });

  const totalBlocks = unitsWithBlocks.reduce((sum, unit) => sum + unit.upcomingBlocks, 0);
  const mappedUnits = unitsWithBlocks.filter((unit) => unit.upcomingBlocks > 0).length;
  const blockedNightsNext30 = unitsWithBlocks.reduce((sum, unit) => sum + unit.blockedNightsNext30, 0);

  return {
    totalBlocks,
    mappedUnits,
    totalUnits: units.length,
    blockedNightsNext30,
    unitsWithBlocks: unitsWithBlocks.sort((a, b) => b.blockedNightsNext30 - a.blockedNightsNext30 || a.unitName.localeCompare(b.unitName)),
  };
}
