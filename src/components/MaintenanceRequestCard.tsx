import { motion } from 'framer-motion';
import { ImageIcon, User, Clock, AlertTriangle } from 'lucide-react';
import type { MaintenanceRequest } from '@/hooks/useMaintenanceRequests';

const photoCount = (r: MaintenanceRequest) => {
  const arr = (r.photo_urls ?? []) as string[];
  if (arr.length) return arr.length;
  return r.photo_url ? 1 : 0;
};

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest;
  unitName: string;
  onClick: () => void;
}

const formatRelative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) return 'Just now';
    return `${hours}h ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function MaintenanceRequestCard({ request, unitName, onClick }: MaintenanceRequestCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border/40 bg-card/60 hover:bg-card hover:border-secondary/40 transition-colors p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-body text-secondary font-semibold">{unitName}</span>
            {request.photo_url && <ImageIcon className="h-3 w-3 text-muted-foreground" />}
          </div>
          <h3 className="font-body text-sm text-foreground font-medium truncate">{request.title}</h3>
          {request.description && (
            <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">{request.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground font-body">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(request.reported_at)}</span>
            {request.reporter_name && (
              <span className="flex items-center gap-1 truncate"><User className="h-3 w-3" />{request.reporter_name}</span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
