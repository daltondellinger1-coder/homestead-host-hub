export type AppRole = 'admin' | 'maintenance';
export type LoginLane = 'property-manager' | 'maintenance';

export const PROPERTY_MANAGER_HOME = '/';
export const MAINTENANCE_HOME = '/maintenance-portal';

export function getStoredLoginLane(): LoginLane {
  if (typeof window === 'undefined') return 'property-manager';
  return window.localStorage.getItem('hostHubLoginLane') === 'maintenance'
    ? 'maintenance'
    : 'property-manager';
}

export function setStoredLoginLane(lane: LoginLane) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('hostHubLoginLane', lane);
  }
}

export function getPostLoginPath(roles: AppRole[], preferredLane: LoginLane = 'property-manager') {
  const hasAdmin = roles.includes('admin');
  const hasMaintenance = roles.includes('maintenance');

  if (preferredLane === 'maintenance' && hasMaintenance) return MAINTENANCE_HOME;
  if (hasAdmin) return PROPERTY_MANAGER_HOME;
  if (hasMaintenance) return MAINTENANCE_HOME;
  return '/unauthorized';
}

export function canAccessPath(pathname: string, roles: AppRole[]) {
  const hasAdmin = roles.includes('admin');
  const hasMaintenance = roles.includes('maintenance');

  if (pathname.startsWith('/unauthorized')) {
    return !hasAdmin && !hasMaintenance;
  }
  if (hasAdmin) return true;
  if (hasMaintenance) {
    return pathname.startsWith(MAINTENANCE_HOME) || pathname.startsWith('/auth') || pathname.startsWith('/extend-stay');
  }
  return pathname.startsWith('/auth') || pathname.startsWith('/unauthorized') || pathname.startsWith('/extend-stay');
}
