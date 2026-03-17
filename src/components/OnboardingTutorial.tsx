import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  CalendarDays,
  Plus,
  DollarSign,
  Mountain,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  MoreHorizontal,
  BedDouble,
  Target,
} from 'lucide-react';

const ONBOARDING_KEY = 'homestead-hill-onboarding-complete';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: TutorialStep[] = [
  {
    icon: <Mountain className="h-10 w-10 text-secondary" />,
    title: 'Welcome to Homestead Hill',
    description:
      'Your property management dashboard — track units, guests, payments, and finances all in one place.',
  },
  {
    icon: <LayoutGrid className="h-10 w-10 text-secondary" />,
    title: 'Unit Cards',
    description:
      'Each card shows the guest name, rent, and next payment at a glance. Tap "More details" to expand dates, deposit info, notes, and upcoming bookings. Drag the grip handle to reorder units.',
  },
  {
    icon: <MoreHorizontal className="h-10 w-10 text-secondary" />,
    title: 'Quick Actions',
    description:
      'Tap the ⋯ menu on any unit card to edit the unit, view lease history, manage the guest, record payments, or end a lease — all in one place.',
  },
  {
    icon: <Plus className="h-10 w-10 text-secondary" />,
    title: 'Adding Units & Guests',
    description:
      'Use the gold "+" button in the header to add a unit or book a future guest. When adding a unit, choose its type (1BR, 2BR, or Cottage). Vacant cards show an "Add Guest" button front and center.',
  },
  {
    icon: <BedDouble className="h-10 w-10 text-secondary" />,
    title: 'Next Available Units',
    description:
      'Three cards at the top of the dashboard show the next available unit for each type — 1 Bedroom, 2 Bedroom, and Cottage. Tap any card to jump to the calendar view filtered to that unit type.',
  },
  {
    icon: <CalendarDays className="h-10 w-10 text-secondary" />,
    title: 'Calendar View',
    description:
      'Switch to Calendar to see bookings on a scrollable timeline. Use the arrows to change months and tap "Today" to jump back. Pull down anywhere to refresh data.',
  },
  {
    icon: <DollarSign className="h-10 w-10 text-secondary" />,
    title: 'Finances & Reports',
    description:
      'View collected vs expected income, filter by month, year, or custom range, and compare against the previous period with percentage-change indicators.',
  },
  {
    icon: <Mountain className="h-10 w-10 text-secondary" />,
    title: 'You\'re All Set!',
    description:
      'Tap ⋮ in the header to replay this tutorial anytime. Happy managing!',
  },
];

export function useOnboardingState() {
  const isComplete = localStorage.getItem(ONBOARDING_KEY) === 'true';
  const markComplete = () => localStorage.setItem(ONBOARDING_KEY, 'true');
  const reset = () => localStorage.removeItem(ONBOARDING_KEY);
  return { isComplete, markComplete, reset };
}

interface OnboardingTutorialProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingTutorial({ open, onClose }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const { markComplete } = useOnboardingState();

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const handleFinish = () => {
    markComplete();
    setStep(0);
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleFinish();
      }}
    >
      <DialogContent className="glass-card border-border/60 sm:max-w-md p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full gold-gradient transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-2xl bg-secondary/10">{current.icon}</div>
          <h2 className="text-xl font-heading font-bold">{current.title}</h2>
          <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
            {current.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between">
          {!isFirst ? (
            <Button
              variant="ghost"
              size="sm"
              className="font-body text-muted-foreground"
              onClick={() => setStep(s => s - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="font-body text-muted-foreground"
              onClick={handleFinish}
            >
              Skip
            </Button>
          )}

          <span className="text-xs text-muted-foreground font-body">
            {step + 1} / {steps.length}
          </span>

          <Button
            size="sm"
            className="font-body gold-gradient border-0 text-background font-semibold hover:opacity-90"
            onClick={handleNext}
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { HelpCircle };
