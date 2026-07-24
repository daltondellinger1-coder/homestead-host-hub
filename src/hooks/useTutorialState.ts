export const ONBOARDING_KEY = 'homestead-hill-onboarding-v2-complete';
export const MAINTENANCE_ONBOARDING_KEY = 'homestead-hill-maintenance-onboarding-complete';
export const CLEANER_ONBOARDING_KEY = 'homestead-hill-cleaner-onboarding-complete';

export function useTutorialState(key: string) {
  const isComplete = localStorage.getItem(key) === 'true';
  const markComplete = () => localStorage.setItem(key, 'true');
  const reset = () => localStorage.removeItem(key);
  return { isComplete, markComplete, reset };
}

export function useOnboardingState() {
  return useTutorialState(ONBOARDING_KEY);
}

export function useMaintenanceOnboardingState() {
  return useTutorialState(MAINTENANCE_ONBOARDING_KEY);
}

export function useCleanerOnboardingState() {
  return useTutorialState(CLEANER_ONBOARDING_KEY);
}
