import { describe, expect, it } from 'vitest';
import { adminTutorialSteps, maintenanceTutorialSteps, propertyManagerTutorialSteps } from './tutorialContent';

describe('maintenance tutorial content', () => {
  it('teaches maintenance users the full work order flow', () => {
    const titles = maintenanceTutorialSteps.map(step => step.title);

    expect(titles).toContain('Triage — Start with New & Urgent');
    expect(titles).toContain('Open & Assign the Work Order');
    expect(titles).toContain('Keep Status Updated');
    expect(titles).toContain('Notes, Photos & Proof');
    expect(titles).toContain('Tips & Tricks');
  });

  it('includes the same maintenance training inside the admin tutorial', () => {
    const adminTitles = adminTutorialSteps.map(step => step.title);

    for (const step of maintenanceTutorialSteps) {
      expect(adminTitles).toContain(step.title);
    }
  });
});

describe('property manager tutorial content', () => {
  const titles = propertyManagerTutorialSteps.map(s => s.title);

  it('covers payment method + split + review queue', () => {
    expect(titles).toContain('Booking Source vs Payment Method');
    expect(titles).toContain('Recording & Editing Payments');
    expect(titles).toContain('Split Payments & Method "Other"');
    expect(titles).toContain('Needs Payment Method Review');
  });

  it('covers finance history filters, dual-date reporting, and CSV export', () => {
    expect(titles).toContain('Finance History — Filters & Totals');
    expect(titles).toContain('Report by: Received Date vs Due Date');
    expect(titles).toContain('CSV Export & Receipts');
  });

  it('describes dashboard/navigation for the correct roles', () => {
    expect(titles).toContain('Dashboard & Navigation');
  });
});

describe('admin tutorial content', () => {
  const titles = adminTutorialSteps.map(s => s.title);

  it('covers the draw dashboard, cash controls, and reports', () => {
    expect(titles).toContain('Draw Dashboard (Admin)');
    expect(titles).toContain('Cash Control & Evidence Rules');
    expect(titles).toContain('Draw Reports & CSV');
  });

  it('mentions the Airbnb Market and the recent changes recap', () => {
    expect(titles).toContain('Airbnb Market (Read-Only)');
    expect(titles).toContain('What Changed Recently');
  });
});
