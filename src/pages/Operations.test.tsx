import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Operations from './Operations';

const operationsState = vi.hoisted(() => ({
  refresh: vi.fn(),
  createReservation: vi.fn(),
  updateUnitStatus: vi.fn(),
  updateReservation: vi.fn(),
  updateCleaning: vi.fn(),
  assignCleaner: vi.fn(),
  verifyCleaning: vi.fn(),
  completeTask: vi.fn(),
  saveChecklist: vi.fn(),
  issueCleanerLink: vi.fn(),
  getCleaningPhotoUrls: vi.fn(),
  assignVendor: vi.fn(),
  decideApproval: vi.fn(),
  createVendor: vi.fn(),
}));

const operationsData = vi.hoisted(() => ({
  cleanings: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'owner' } }, signOut: vi.fn() }),
}));

vi.mock('@/hooks/useAuthRoles', () => ({
  useAuthRoles: () => ({ isAdmin: true }),
}));

vi.mock('@/hooks/useTutorialState', () => ({
  useOnboardingState: () => ({ isComplete: true }),
}));

vi.mock('@/components/OnboardingTutorial', () => ({
  default: () => null,
}));

vi.mock('@/hooks/useOperationsData', () => ({
  CHECKLIST_TEMPLATES: {
    morning: ['Review arrivals'],
    end_of_day: ['Review unresolved work'],
    weekly: ['Review vendor follow-up'],
  },
  useOperationsData: () => ({
    ...operationsState,
    units: [],
    reservations: [],
    cleanings: operationsData.cleanings,
    maintenance: [],
    tasks: [],
    approvals: [],
    activity: [],
    vendors: [],
    checklists: [],
    cleaners: [],
    loading: false,
    schemaReady: true,
    summary: {
      urgentCount: 0,
      arrivalsToday: [],
      departuresToday: [],
      arrivalsNextSevenDays: [],
      departuresNextSevenDays: [],
      sameDayTurnoverUnitIds: new Set(),
      cleaningAction: [],
      openMaintenance: [],
      overdueTasks: [],
    },
  }),
}));

describe('Operations navigation', () => {
  afterEach(() => {
    operationsData.cleanings = [];
    operationsState.getCleaningPhotoUrls.mockReset();
  });

  it('turns summary cards into useful navigation', async () => {
    render(
      <MemoryRouter>
        <Operations />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '0 Cleaning action' }));
    expect(await screen.findByText('No cleaning tasks yet.')).toBeInTheDocument();
  });

  it('groups secondary tools under More', async () => {
    render(
      <MemoryRouter>
        <Operations />
      </MemoryRouter>,
    );
    const moreTab = screen.getByRole('tab', { name: 'More' });
    fireEvent.mouseDown(moreTab, { button: 0, ctrlKey: false });
    fireEvent.click(moreTab);
    expect(await screen.findByText('Maintenance & vendor contacts')).toBeInTheDocument();
    expect(screen.getByText('Routine checklists')).toBeInTheDocument();
    expect(screen.getByText('Activity history')).toBeInTheDocument();
  });

  it('lets a manager review everything shown to the cleaner plus completion evidence', async () => {
    operationsData.cleanings = [{
      id: 'cleaning-1',
      unit_id: 'unit-12',
      status: 'readiness_verification_required',
      confirmation_status: 'confirmed',
      checkout_at: '2026-07-24T15:00:00.000Z',
      next_check_in_at: '2026-07-25T19:00:00.000Z',
      cleaning_deadline: '2026-07-25T16:00:00.000Z',
      assigned_cleaner_name: 'Wendy',
      special_notes: 'Use fragrance-free products.',
      pet_notes: 'Dog stayed in the unit.',
      linen_notes: 'Replace both queen sets.',
      supply_notes: 'Extra paper towels are in the office.',
      completion_notes: 'Turnover is complete.',
      supplies_needed: 'Dishwasher pods',
      damage_found: 'None',
      maintenance_issue_found: 'Loose bathroom handle',
      completion_photo_urls: ['cleaning-1/finish.jpg'],
      unit: { id: 'unit-12', name: 'Unit 12' },
    }];
    operationsState.getCleaningPhotoUrls.mockResolvedValue([{
      path: 'cleaning-1/finish.jpg',
      signedUrl: 'https://example.test/private-photo',
    }]);

    render(
      <MemoryRouter>
        <Operations />
      </MemoryRouter>,
    );

    const cleaningTab = screen.getByRole('tab', { name: 'Cleaning' });
    fireEvent.mouseDown(cleaningTab, { button: 0, ctrlKey: false });
    fireEvent.click(cleaningTab);
    fireEvent.click(await screen.findByRole('button', { name: 'View details' }));

    expect(await screen.findByText('Instructions shown to the cleaner')).toBeInTheDocument();
    expect(screen.getByText('Use fragrance-free products.')).toBeInTheDocument();
    expect(screen.getByText('Dog stayed in the unit.')).toBeInTheDocument();
    expect(screen.getByText('Replace both queen sets.')).toBeInTheDocument();
    expect(screen.getByText('Turnover is complete.')).toBeInTheDocument();
    expect(screen.getByText('Loose bathroom handle')).toBeInTheDocument();
    expect(await screen.findByAltText('Completion evidence 1 for Unit 12')).toHaveAttribute(
      'src',
      'https://example.test/private-photo',
    );
  });
});
