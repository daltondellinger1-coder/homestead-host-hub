import Dashboard from '@/components/Dashboard';

type ViewMode = 'units' | 'calendar';

interface IndexProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const Index = ({ viewMode, onViewModeChange }: IndexProps) => (
  <Dashboard viewMode={viewMode} onViewModeChange={onViewModeChange} />
);

export default Index;
