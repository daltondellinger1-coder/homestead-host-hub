export type AppRole = 'admin' | 'property_manager' | 'maintenance' | 'cleaner';
export type LoginLane = 'property-manager' | 'maintenance' | 'cleaner';

export const PROPERTY_MANAGER_HOME = '/operations';
export const MAINTENANCE_HOME = '/maintenance-portal';
export const CLEANER_HOME = '/cleaner';

export function getStoredLoginLane(): LoginLane {
  if (typeof window === 'undefined') return 'property-manager';
  const lane = window.localStorage.getItem('hostHubLoginLane');
  return lane === 'maintenance' || lane === 'cleaner' ? lane : 'property-manager';
}

export function setStoredLoginLane(lane: LoginLane) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('hostHubLoginLane', lane);
  }
}

export function getPostLoginPath(roles: AppRole[], preferredLane: LoginLane = 'property-manager') {
  const hasAdmin = roles.includes('admin');
  const hasPropertyManager = roles.includes('property_manager');
  const hasMaintenance = roles.includes('maintenance');
  const hasCleaner = roles.includes('cleaner');

  if (preferredLane === 'maintenance' && hasMaintenance) return MAINTENANCE_HOME;
  if (preferredLane === 'cleaner' && hasCleaner) return CLEANER_HOME;
  if (hasAdmin || hasPropertyManager) return PROPERTY_MANAGER_HOME;
  if (hasMaintenance) return MAINTENANCE_HOME;
  if (hasCleaner) return CLEANER_HOME;
  return '/unauthorized';
}

export function canAccessPath(pathname: string, roles: AppRole[]) {
  const hasAdmin = roles.includes('admin');
  const hasPropertyManager = roles.includes('property_manager');
  const hasMaintenance = roles.includes('maintenance');
  const hasCleaner = roles.includes('cleaner');

  if (pathname.startsWith('/unauthorized')) {
    return !hasAdmin && !hasPropertyManager && !hasMaintenance && !hasCleaner;
  }
  if (pathname.startsWith('/admin')) {
    return hasAdmin;
  }
  if (hasAdmin) return true;
  if (hasPropertyManager) {
    return !pathname.startsWith('/finances')
      && !pathname.startsWith('/payments')
      && !pathname.startsWith('/reports')
      && !pathname.startsWith('/admin');
  }
  if (hasMaintenance) {
    return pathname.startsWith(MAINTENANCE_HOME) || pathname.startsWith('/auth') || pathname.startsWith('/extend-stay');
  }
  if (hasCleaner) {
    return pathname.startsWith(CLEANER_HOME) || pathname.startsWith('/auth');
  }
  return pathname.startsWith('/auth') || pathname.startsWith('/unauthorized') || pathname.startsWith('/extend-stay');
}
