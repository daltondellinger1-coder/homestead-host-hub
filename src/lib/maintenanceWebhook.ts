export type TallyField = {
  key?: string | null;
  label?: string | null;
  value?: unknown;
};

export type MaintenanceInsert = {
  unit_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  photo_urls: string[];
  reporter_name: string | null;
  status: 'new';
  tally_event_id: string | null;
  priority_urgent: boolean;
};

export const HH_MAINTENANCE_QR_BRAND = {
  navy: '#071222',
  navyDeep: '#040b15',
  gold: '#cda360',
  cream: '#FCFBF8',
  slate: '#293b56',
  fontFamily: 'DM Sans',
  heading: 'Maintenance Issue?',
  subheading: 'Scan to report it fast',
} as const;

export const HH_MAINTENANCE_QR_UNITS = [
  'Unit 1',
  'Unit 2',
  'Unit 3',
  'Unit 4',
  'Unit 5',
  'Unit 6',
  'Unit 7',
  'Unit 8',
  'Unit 9',
  'Unit 10',
  'Unit 11',
  'Unit 13',
  'Unit 14',
] as const;

function fieldsFromPayload(payload: unknown): TallyField[] {
  const root = payload as { data?: { fields?: TallyField[] }; fields?: TallyField[] } | null | undefined;
  return root?.data?.fields ?? root?.fields ?? [];
}

function findField(fields: TallyField[], matchers: string[]): TallyField | undefined {
  return fields.find((field) => {
    const label = (field.label ?? '').toString().toLowerCase();
    const key = (field.key ?? '').toString().toLowerCase();
    return matchers.some((matcher) => label.includes(matcher) || key.includes(matcher));
  });
}

function fieldString(field: TallyField | undefined): string | undefined {
  if (!field || field.value == null) return undefined;
  const value = field.value;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const objectItem = item as { text?: string; label?: string; name?: string; url?: string };
          return objectItem.text ?? objectItem.label ?? objectItem.name ?? objectItem.url ?? '';
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
    return joined || undefined;
  }
  return String(value);
}

function fieldFiles(field: TallyField | undefined): string[] {
  if (!field || !Array.isArray(field.value)) return [];
  return field.value
    .map((file) => {
      if (typeof file === 'string') return file;
      if (file && typeof file === 'object') return (file as { url?: string }).url;
      return undefined;
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

export function getTallyEventId(payload: unknown): string | null {
  const root = payload as {
    eventId?: string | null;
    data?: { submissionId?: string | null; responseId?: string | null };
  } | null | undefined;
  return root?.eventId ?? root?.data?.submissionId ?? root?.data?.responseId ?? null;
}

function normalizeUnitName(unitName: string): string {
  return unitName.trim().toLowerCase();
}

function isUrgentValue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return ['yes', 'urgent', 'emergency', 'active leak', 'no heat', 'safety'].some((signal) => normalized.includes(signal));
}

export function buildMaintenanceInsert(payload: unknown, unitIdByName: Map<string, string>): MaintenanceInsert {
  const fields = fieldsFromPayload(payload);
  const unitField = findField(fields, ['unit']);
  const titleField = findField(fields, ['issue title', 'title']);
  const descField = findField(fields, ['describe', 'description']);
  const nameField = findField(fields, ['your name', 'name']);
  const phoneField = findField(fields, ['phone']);
  const photoField = findField(fields, ['photo']);
  const urgentField = findField(fields, ['urgent', 'emergency', 'priority']);

  const unitName = fieldString(unitField);
  if (!unitName) throw new Error('Missing unit field');

  const unitLookup = new Map(Array.from(unitIdByName.entries()).map(([name, id]) => [normalizeUnitName(name), id]));
  const unitId = unitLookup.get(normalizeUnitName(unitName));
  if (!unitId) throw new Error(`Unit not found: ${unitName}`);

  const title = fieldString(titleField) ?? 'Maintenance request';
  const description = fieldString(descField);
  const reporterName = fieldString(nameField);
  const phone = fieldString(phoneField);
  const photoUrls = fieldFiles(photoField);
  const phoneLine = phone ? `\n\nPhone: ${phone}` : '';
  const fullDescription = `${description ?? ''}${phoneLine}`.trim() || null;

  return {
    unit_id: unitId,
    title: title.slice(0, 200),
    description: fullDescription,
    photo_url: photoUrls[0] ?? null,
    photo_urls: photoUrls,
    reporter_name: reporterName ?? null,
    status: 'new',
    tally_event_id: getTallyEventId(payload),
    priority_urgent: isUrgentValue(fieldString(urgentField)),
  };
}

export function maintenanceQrTargetUrl(formUrl: string, unitName: string): string {
  const url = new URL(formUrl);
  url.searchParams.set('unit', unitName);
  return url.toString();
}
