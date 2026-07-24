import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, CalendarDays, Wrench } from 'lucide-react';
import { useBookingRequests } from '@/hooks/useBookingRequests';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { cn } from '@/lib/utils';

type NavViewMode = 'units' | 'calendar' | 'requests';

interface MobileBottomNavProps {
  viewMode?: NavViewMode;
  onViewModeChange?: (mode: NavViewMode) => void;
}

export default function MobileBottomNav({ viewMode = 'units', onViewModeChange }: MobileBottomNavProps) {
  const location = useLocation();
  const { pendingCount } = useBookingRequests();
  const { newCount: maintenanceNewCount } = useMaintenanceRequests();
  const isDashboard = location.pathname === '/host-hub';

  const items = [
    {
      label: 'Today',
      icon: LayoutDashboard,
      active: location.pathname === '/operations',
      to: '/operations',
      onClick: () => undefined,
      badge: pendingCount,
    },
    {
      label: 'Units',
      icon: LayoutGrid,
      active: isDashboard && viewMode === 'units',
      to: '/host-hub',
      onClick: () => {
        if (isDashboard) onViewModeChange?.('units');
      },
      badge: 0,
    },
    {
      label: 'Calendar',
      icon: CalendarDays,
      active: isDashboard && viewMode === 'calendar',
      to: '/host-hub',
      onClick: () => {
        if (isDashboard) onViewModeChange?.('calendar');
      },
      badge: 0,
    },
    {
      label: 'Fix',
      icon: Wrench,
      active: location.pathname === '/maintenance',
      to: '/maintenance',
      badge: maintenanceNewCount,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const isRouteChange = item.to !== location.pathname;

          const inner = (
            <div
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 pt-3 text-xs font-body transition-colors',
                item.active
                  ? 'text-secondary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <item.icon className={cn('h-5 w-5', item.active && 'stroke-[2.5]')} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-secondary text-background text-[9px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </div>
          );

          if (isRouteChange) {
            return (
              <Link key={item.label} to={item.to} className="flex flex-1" onClick={item.onClick}>
                {inner}
              </Link>
            );
          }

          return (
            <button key={item.label} className="flex flex-1" onClick={item.onClick}>
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
