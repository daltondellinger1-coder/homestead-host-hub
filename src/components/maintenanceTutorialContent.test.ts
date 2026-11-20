import { describe, expect, it } from 'vitest';
import {
  adminTutorialSteps,
  adminQuickStartSteps,
  cleanerTutorialSteps,
  maintenanceTutorialSteps,
  propertyManagerTutorialSteps,
  propertyManagerQuickStartSteps,
} from './tutorialContent';

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

  it('covers the complete V1 daily operations workflow', () => {
    expect(titles).toContain('Today — Daily Command Center');
    expect(titles).toContain('Operational Unit Statuses');
    expect(titles).toContain('Stays & Reservation Safety');
    expect(titles).toContain('Cleaning Handoff & Cleaner Links');
    expect(titles).toContain('Readiness Verification');
    expect(titles).toContain('Maintenance, Vendors & Approvals');
    expect(titles).toContain('Checklists, Activity & Safe Automation');
  });

  it('teaches the review-first reservation automation boundary', () => {
    const staysStep = propertyManagerTutorialSteps.find(step => step.title === 'Stays & Reservation Safety');
    const automationStep = propertyManagerTutorialSteps.find(step => step.title === 'Checklists, Activity & Safe Automation');

    expect(staysStep?.description).toContain('Reservation Review');
    expect(staysStep?.description).toContain('Inquiries and text signals cannot become stays');
    expect(automationStep?.description).toContain('only a manager can approve');
    expect(automationStep?.description).toContain('never sends a message');
  });

  it('documents the configured approval thresholds and disabled delivery state', () => {
    const approvalStep = propertyManagerTutorialSteps.find(step => step.title === 'Maintenance, Vendors & Approvals');
    const automationStep = propertyManagerTutorialSteps.find(step => step.title === 'Checklists, Activity & Safe Automation');

    expect(approvalStep?.description).toContain('$250 routine maintenance');
    expect(approvalStep?.description).toContain('$500 emergency maintenance');
    expect(approvalStep?.description).toContain('$250 supplies');
    expect(automationStep?.description).toContain('remain off');
  });
});

describe('cleaner tutorial content', () => {
  const titles = cleanerTutorialSteps.map(step => step.title);

  it('teaches the assignment lifecycle and readiness handoff', () => {
    expect(titles).toContain('Review the Turnover Window');
    expect(titles).toContain('Confirm or Decline Promptly');
    expect(titles).toContain('Start When Work Begins');
    expect(titles).toContain('Complete with Evidence');
    expect(titles).toContain('Briana Verifies Readiness Next');
  });

  it('makes the privacy and link-revocation boundary explicit', () => {
    const privacy = cleanerTutorialSteps.find(step => step.title === 'Privacy & Link Safety');

    expect(privacy?.description).toContain('never includes guest finances');
    expect(privacy?.description).toContain('old link will be revoked');
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

describe('first-run tutorial length', () => {
  it('keeps onboarding focused instead of overwhelming users', () => {
    expect(propertyManagerQuickStartSteps.length).toBeLessThanOrEqual(10);
    expect(adminQuickStartSteps.length).toBeLessThanOrEqual(10);
  });
});
