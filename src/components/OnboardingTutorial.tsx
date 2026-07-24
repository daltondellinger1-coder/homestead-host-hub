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
  Wrench,
  Filter,
  AlertTriangle,
  Camera,
  CheckCircle,
  Lightbulb,
  CreditCard,
  Split,
  ClipboardCheck,
  FileText,
  Hammer,
  Sparkles,
} from 'lucide-react';
import {
  adminQuickStartSteps,
  cleanerTutorialSteps,
  maintenanceTutorialSteps,
  propertyManagerQuickStartSteps,
  type TutorialIconName,
  type TutorialStepContent,
} from '@/components/tutorialContent';
import {
  CLEANER_ONBOARDING_KEY,
  MAINTENANCE_ONBOARDING_KEY,
  ONBOARDING_KEY,
  useTutorialState,
} from '@/hooks/useTutorialState';

function tutorialIcon(name: TutorialIconName) {
  const className = 'h-10 w-10 text-secondary';
  switch (name) {
    case 'layout-grid': return <LayoutGrid className={className} />;
    case 'calendar': return <CalendarDays className={className} />;
    case 'plus': return <Plus className={className} />;
    case 'dollar': return <DollarSign className={className} />;
    case 'more-horizontal': return <MoreHorizontal className={className} />;
    case 'bed-double': return <BedDouble className={className} />;
    case 'target': return <Target className={className} />;
    case 'search': return <Search className={className} />;
    case 'inbox': return <Inbox className={className} />;
    case 'wrench': return <Wrench className={className} />;
    case 'filter': return <Filter className={className} />;
    case 'alert': return <AlertTriangle className={className} />;
    case 'camera': return <Camera className={className} />;
    case 'check-circle': return <CheckCircle className={className} />;
    case 'lightbulb': return <Lightbulb className={className} />;
    case 'credit-card': return <CreditCard className={className} />;
    case 'split': return <Split className={className} />;
    case 'clipboard-check': return <ClipboardCheck className={className} />;
    case 'file-text': return <FileText className={className} />;
    case 'hammer': return <Hammer className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'mountain':
    default:
      return <Mountain className={className} />;
  }
}

interface TutorialDialogProps {
  open: boolean;
  onClose: () => void;
  steps: TutorialStepContent[];
  storageKey: string;
}

function TutorialDialog({ open, onClose, steps, storageKey }: TutorialDialogProps) {
  const [step, setStep] = useState(0);
  const { markComplete } = useTutorialState(storageKey);

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
        <div className="h-1 bg-muted">
          <div
            className="h-full gold-gradient transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-2xl bg-secondary/10">{tutorialIcon(current.icon)}</div>
          <h2 className="text-xl font-heading font-bold">{current.title}</h2>
          <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
            {current.description}
          </p>
        </div>

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

interface OnboardingTutorialProps {
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function OnboardingTutorial({ open, onClose, isAdmin = false }: OnboardingTutorialProps) {
  return (
    <TutorialDialog
      open={open}
      onClose={onClose}
      steps={isAdmin ? adminQuickStartSteps : propertyManagerQuickStartSteps}
      storageKey={ONBOARDING_KEY}
    />
  );
}

export function MaintenanceTutorial({ open, onClose }: OnboardingTutorialProps) {
  return <TutorialDialog open={open} onClose={onClose} steps={maintenanceTutorialSteps} storageKey={MAINTENANCE_ONBOARDING_KEY} />;
}

export function CleanerTutorial({ open, onClose }: OnboardingTutorialProps) {
  return <TutorialDialog open={open} onClose={onClose} steps={cleanerTutorialSteps} storageKey={CLEANER_ONBOARDING_KEY} />;
}

export { HelpCircle };
