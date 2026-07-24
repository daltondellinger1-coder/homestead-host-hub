import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Operations from './Operations';

const operationsState = vi.hoisted(() => ({
  refresh: vi.fn(),
  createReservation: vi.fn(),
  updateUnitStatus: vi.fn(),
  updateReservation: vi.fn(),
  updateCleaning: vi.fn(),
  verifyCleaning: vi.fn(),
  completeTask: vi.fn(),
  saveChecklist: vi.fn(),
  issueCleanerLink: vi.fn(),
  assignVendor: vi.fn(),
  decideApproval: vi.fn(),
  createVendor: vi.fn(),
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
    cleanings: [],
    maintenance: [],
    tasks: [],
    approvals: [],
    activity: [],
    vendors: [],
    checklists: [],
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
});
