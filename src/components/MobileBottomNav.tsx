import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, CalendarDays, BarChart3, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  viewMode?: 'units' | 'calendar';
  onViewModeChange?: (mode: 'units' | 'calendar') => void;
}

export default function MobileBottomNav({ viewMode = 'units', onViewModeChange }: MobileBottomNavProps) {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  const items = [
    {
      label: 'Units',
      icon: LayoutGrid,
      active: isDashboard && viewMode === 'units',
      to: '/',
      onClick: () => {
        if (isDashboard) onViewModeChange?.('units');
      },
    },
    {
      label: 'Calendar',
      icon: CalendarDays,
      active: isDashboard && viewMode === 'calendar',
      to: '/',
      onClick: () => {
        if (isDashboard) onViewModeChange?.('calendar');
      },
    },
    {
      label: 'Reports',
      icon: BarChart3,
      active: location.pathname === '/reports',
      to: '/reports',
    },
    {
      label: 'History',
      icon: History,
      active: location.pathname === '/payments',
      to: '/payments',
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
              <item.icon className={cn('h-5 w-5', item.active && 'stroke-[2.5]')} />
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
