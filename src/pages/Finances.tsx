import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mountain, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialReportsContent from '@/components/FinancialReportsContent';
import PaymentHistoryContent from '@/components/PaymentHistoryContent';
import ManagementDashboard from '@/components/ManagementDashboard';
import WeeklyReport from '@/components/WeeklyReport';

export default function Finances() {
  const location = useLocation();
  const hasFilterParams = location.search.length > 0;
  const [tab, setTab] = useState(hasFilterParams ? 'history' : 'reports');

  return (
    <div className="min-h-screen pattern-bg">
      <header className="border-b border-border/40 sticky top-0 z-10" style={{ background: 'linear-gradient(180deg, hsl(222 47% 10%), hsl(222 47% 8%))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-secondary/15">
                <Mountain className="h-5 w-5 text-secondary" />
              </div>
              <h1 className="text-lg font-heading font-bold tracking-tight text-foreground">Finances</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className="grid w-full max-w-lg grid-cols-4 bg-muted/50">
            <TabsTrigger value="reports" className="font-body text-xs">Reports</TabsTrigger>
            <TabsTrigger value="weekly" className="font-body text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="management" className="font-body text-xs">Management</TabsTrigger>
            <TabsTrigger value="history" className="font-body text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-0">
            <FinancialReportsContent />
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <WeeklyReport />
          </TabsContent>

          <TabsContent value="management" className="mt-0">
            <ManagementDashboard />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <PaymentHistoryContent />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
