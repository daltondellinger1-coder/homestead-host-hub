import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthRoles } from "@/hooks/useAuthRoles";
import { canAccessPath, getPostLoginPath, getStoredLoginLane, type AppRole } from "@/lib/roleRouting";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Finances from "./pages/Finances";
import Maintenance from "./pages/Maintenance";
import MaintenanceHealth from "./pages/MaintenanceHealth";
import MaintenancePortal from "./pages/MaintenancePortal";
import ContractorOfficeLaundry from "./pages/ContractorOfficeLaundry";
import ExtendStay from "./pages/ExtendStay";
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";
import { Button } from "./components/ui/button";

const queryClient = new QueryClient();

type ViewMode = 'units' | 'calendar' | 'requests';

function Unauthorized() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
      <div className="glass-card rounded-xl p-6 max-w-sm text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-secondary mx-auto" />
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">Access not assigned yet</h1>
          <p className="text-sm text-muted-foreground font-body mt-2">
            This login worked, but this account has not been assigned a Property Manager or Maintenance role yet.
          </p>
        </div>
        <Button onClick={signOut} variant="outline" className="w-full">Sign out</Button>
      </div>
    </div>
  );
}

function AuthenticatedApp({ roles }: { roles: AppRole[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>('units');
  const isMaintenanceOnly = roles.includes('maintenance') && !roles.includes('admin');

  return (
    <>
      <Routes>
        <Route path="/" element={isMaintenanceOnly ? <Navigate to="/maintenance-portal" replace /> : <Index viewMode={viewMode} onViewModeChange={setViewMode} />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/payments" element={<Finances />} />
        <Route path="/reports" element={<Finances />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/maintenance/health" element={<MaintenanceHealth />} />
        <Route path="/maintenance-portal" element={<MaintenancePortal />} />
        <Route path="/extend-stay" element={<ExtendStay />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/auth" element={<Navigate to={getPostLoginPath(roles, getStoredLoginLane())} replace />} />
        <Route path="/auth/property-manager" element={<Navigate to={getPostLoginPath(roles, 'property-manager')} replace />} />
        <Route path="/auth/maintenance" element={<Navigate to={getPostLoginPath(roles, 'maintenance')} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isMaintenanceOnly && <MobileBottomNav viewMode={viewMode} onViewModeChange={setViewMode} />}
    </>
  );
}

function AppRouter() {
  const { session, loading } = useAuth();
  const { roles, loading: rolesLoading } = useAuthRoles(session?.user.id);
  const location = useLocation();

  if (loading || (session && rolesLoading)) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (
    location.pathname === '/contractors/office-laundry' ||
    location.pathname === '/contractor/office-laundry' ||
    location.pathname === '/contractor/office-laundry-bid-a7k29'
  ) {
    return (
      <Routes>
        <Route path="/contractors/office-laundry" element={<ContractorOfficeLaundry />} />
        <Route path="/contractor/office-laundry" element={<Navigate to="/contractors/office-laundry" replace />} />
        <Route path="/contractor/office-laundry-bid-a7k29" element={<Navigate to="/contractors/office-laundry" replace />} />
      </Routes>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/extend-stay" element={<ExtendStay />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/property-manager" element={<Auth />} />
        <Route path="/auth/maintenance" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  if (!canAccessPath(location.pathname, roles)) {
    return <Navigate to={getPostLoginPath(roles, getStoredLoginLane())} replace />;
  }

  return <AuthenticatedApp roles={roles} />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
