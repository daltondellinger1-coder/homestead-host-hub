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
  Search,
  Inbox,
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
      'This is your home base for managing everything — units, guests, payments, and money. Let\'s walk through it real quick.',
  },
  {
    icon: <LayoutGrid className="h-10 w-10 text-secondary" />,
    title: 'Unit Cards',
    description:
      'Each card shows you who\'s in the unit, what they pay, and when the next payment is due. Tap "More details" to see check-in/out dates, deposit info, and future bookings. You can drag cards around to put them in whatever order you want.',
  },
  {
    icon: <MoreHorizontal className="h-10 w-10 text-secondary" />,
    title: 'Quick Actions',
    description:
      'Tap the three dots (⋯) on any unit card to do stuff like edit the unit, check lease history, add or change a guest, record a payment, or end a lease.',
  },
  {
    icon: <Plus className="h-10 w-10 text-secondary" />,
    title: 'Adding Units & Guests',
    description:
      'Hit the gold "+" button at the top to add a new unit or book a future guest. Pick whether it\'s a 1BR, 2BR, or Cottage. If a unit is empty, you\'ll see a big "Add Guest" button right on the card.',
  },
  {
    icon: <BedDouble className="h-10 w-10 text-secondary" />,
    title: 'Next Available Units',
    description:
      'At the top of the dashboard you\'ll see three cards showing the next open unit for each type — 1 Bedroom, 2 Bedroom, and Cottage. Tap one to jump straight to the calendar for that type.',
  },
  {
    icon: <Search className="h-10 w-10 text-secondary" />,
    title: 'Find Open Units',
    description:
      'Got a booking request? Tap "Find Available Units by Date," plug in the dates, and you\'ll see every open unit right away. It shows you how many nights, the estimated cost, and who\'s booked before and after. You can book the unit right from there or jump to the calendar.',
  },
  {
    icon: <Inbox className="h-10 w-10 text-secondary" />,
    title: 'Booking Requests Inbox',
    description:
      'Guests can request a stay through homestead-hill.com and those requests land in the Requests tab. You\'ll see a banner on the dashboard when new ones come in. Tap "Approve & Book" to add them to the calendar in one shot, or "Decline" if it doesn\'t work out.',
  },
  {
    icon: <CalendarDays className="h-10 w-10 text-secondary" />,
    title: 'Calendar View',
    description:
      'Tap Calendar at the bottom to see all your bookings laid out on a timeline. Use the arrows to flip between months and hit "Today" to snap back to the current date. Pull down to refresh.',
  },
  {
    icon: <DollarSign className="h-10 w-10 text-secondary" />,
    title: 'Finances',
    description:
      'See how much money has come in vs what\'s expected. You can filter by month, year, or a custom date range, and it\'ll show you how things compare to the last period.',
  },
  {
    icon: <Target className="h-10 w-10 text-secondary" />,
    title: 'Management & Weekly Reports',
    description:
      'The Management tab shows how each unit is doing against its revenue target, occupancy, and Hannah\'s management fee. The Weekly tab gives you a Friday summary — what came in this week, what\'s booked for the next 30–60 days, and any gaps that need filling.',
  },
  {
    icon: <Mountain className="h-10 w-10 text-secondary" />,
    title: 'You\'re Good to Go!',
    description:
      'That\'s everything! Tap the three dots (⋮) in the top-right corner anytime to see this walkthrough again.',
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
