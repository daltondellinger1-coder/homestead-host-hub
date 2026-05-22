import { describe, expect, it } from 'vitest';
import { adminTutorialSteps, maintenanceTutorialSteps } from './tutorialContent';

describe('maintenance tutorial content', () => {
  it('teaches maintenance users the full work order flow', () => {
    const titles = maintenanceTutorialSteps.map(step => step.title);

    expect(titles).toContain('Start with New Requests');
    expect(titles).toContain('Open the Work Order');
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
