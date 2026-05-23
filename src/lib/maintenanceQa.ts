export const MAINTENANCE_QA_MARKER = 'AUTOMATION TEST ONLY' as const;

export type MaintenanceQaPayload = {
  eventId: string;
  data: {
    submissionId: string;
    fields: Array<{ label: string; key: string; value: unknown }>;
  };
};

export function buildMaintenanceQaPayload({
  unitName,
  eventId = `hh-maintenance-qa-${Date.now()}`,
}: {
  unitName: string;
  eventId?: string;
}): MaintenanceQaPayload {
  return {
    eventId,
    data: {
      submissionId: eventId,
      fields: [
        { label: 'Unit', key: 'unit', value: unitName },
        { label: 'Your name', key: 'name', value: `Automation Test Guest - ${unitName}` },
        { label: 'Your phone number', key: 'phone', value: '+1 812-555-0155' },
        { label: 'Issue title', key: 'title', value: `${MAINTENANCE_QA_MARKER} - ${unitName} webhook smoke test` },
        {
          label: 'Describe the issue',
          key: 'description',
          value: `${MAINTENANCE_QA_MARKER} from Host Hub admin webhook health check. Synthetic ${unitName} request; no emergency. Safe to delete after verification.`,
        },
        { label: 'Photo(s) of the issue', key: 'photos', value: [{ url: 'https://example.com/automation-test-only-maintenance.jpg' }] },
        { label: 'Urgent', key: 'urgent', value: 'No' },
      ],
    },
  };
}

export function getSyntheticRequestFilter(ids: string[]) {
  return {
    ids: ids.filter(Boolean),
    marker: MAINTENANCE_QA_MARKER,
  };
}

export type MaintenanceQaResult = {
  httpStatus: number;
  requestId?: string | null;
  logId?: string | null;
  notificationOk?: boolean;
  cleanupDeleted?: number;
  duplicate?: boolean;
};

export function summarizeMaintenanceQaResult(result: MaintenanceQaResult): { status: 'pass' | 'fail'; lines: string[] } {
  const pass = result.httpStatus >= 200 && result.httpStatus < 300 && Boolean(result.requestId) && result.notificationOk !== false;
  const lines = [
    `Webhook returned HTTP ${result.httpStatus}${result.duplicate ? ' (duplicate ignored)' : ''}`,
    result.requestId ? `Created or reused request ${result.requestId}` : 'No maintenance request id returned',
    result.logId ? `Webhook log ${result.logId} recorded` : 'Webhook log not confirmed',
    result.notificationOk === undefined ? 'Notification not checked' : `Notification ${result.notificationOk ? 'succeeded' : 'failed'}`,
  ];
  if (typeof result.cleanupDeleted === 'number') {
    lines.push(`Cleanup deleted ${result.cleanupDeleted} synthetic row(s)`);
  }
  return { status: pass ? 'pass' : 'fail', lines };
}
