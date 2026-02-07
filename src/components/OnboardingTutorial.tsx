import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  CalendarDays,
  BarChart3,
  History,
  Plus,
  Users,
  DollarSign,
  Mountain,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
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
      'Your property management dashboard — track units, guests, payments, and more all in one place.',
  },
  {
    icon: <LayoutGrid className="h-10 w-10 text-secondary" />,
    title: 'Units View',
    description:
      'The home screen shows all your rental units at a glance. Each card displays the current guest, rent amount, and payment status. Tap any card to manage it.',
  },
  {
    icon: <Plus className="h-10 w-10 text-secondary" />,
    title: 'Adding Units & Guests',
    description:
      'Tap the gold "+" button (top-right) to add a new unit. Once a unit is created, tap its card and choose "Add Guest" to assign a tenant.',
  },
  {
    icon: <DollarSign className="h-10 w-10 text-secondary" />,
    title: 'Recording Payments',
    description:
      'On each unit card you\'ll see a "Record Payment" option. You can also mark upcoming payments as paid directly from the card or the calendar view.',
  },
  {
    icon: <CalendarDays className="h-10 w-10 text-secondary" />,
    title: 'Calendar View',
    description:
      'Switch to Calendar (bottom nav or top toggle) to see all payments and lease timelines laid out by date. Great for planning ahead.',
  },
  {
    icon: <BarChart3 className="h-10 w-10 text-secondary" />,
    title: 'Reports & History',
    description:
      'Use the Reports tab for income breakdowns and the History tab to browse, filter, or bulk-delete past payment records.',
  },
  {
    icon: <Users className="h-10 w-10 text-secondary" />,
    title: 'You\'re All Set!',
    description:
      'You can replay this tutorial anytime from the Help button (?) in the header. Happy managing!',
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
