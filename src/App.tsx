import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthRoles } from "@/hooks/useAuthRoles";
import {
  canAccessPath,
  getPostLoginPath,
  getStoredLoginLane,
  isPasswordRecoveryLocation,
  type AppRole,
} from "@/lib/roleRouting";
import Auth from "./pages/Auth";
import MobileBottomNav from "./components/MobileBottomNav";
import { Button } from "./components/ui/button";

const Index = lazy(() => import("./pages/Index"));
const Finances = lazy(() => import("./pages/Finances"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const MaintenanceHealth = lazy(() => import("./pages/MaintenanceHealth"));
const MaintenancePortal = lazy(() => import("./pages/MaintenancePortal"));
const MaintenanceOffer = lazy(() => import("./pages/MaintenanceOffer"));
const HandymanSmsSignup = lazy(() => import("./pages/HandymanSmsSignup"));
const SmsPrivacy = lazy(() => import("./pages/SmsPrivacy"));
const SmsTerms = lazy(() => import("./pages/SmsTerms"));
const ContractorOfficeLaundry = lazy(() => import("./pages/ContractorOfficeLaundry"));
const ExtendStay = lazy(() => import("./pages/ExtendStay"));
const AirbnbMarket = lazy(() => import("./pages/AirbnbMarket"));
const AdminDraws = lazy(() => import("./pages/AdminDraws"));
const Operations = lazy(() => import("./pages/Operations"));
const CleanerPortal = lazy(() => import("./pages/CleanerPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

type ViewMode = 'units' | 'calendar' | 'requests';

function AppLoading() {
  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center">
      <div className="text-muted-foreground font-body text-sm animate-pulse">Loading Homestead Helper…</div>
    </div>
  );
}

function Unauthorized() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center px-4">
      <div className="glass-card rounded-xl p-6 max-w-sm text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-secondary mx-auto" />
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">Access not assigned yet</h1>
          <p className="text-sm text-muted-foreground font-body mt-2">
            This login worked, but this account has not been assigned a Property Manager, Cleaner, or Maintenance role yet.
          </p>
        </div>
        <Button onClick={signOut} variant="outline" className="w-full">Sign out</Button>
      </div>
    </div>
  );
}

function AuthenticatedApp({ roles }: { roles: AppRole[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>('units');
  const isMaintenanceOnly = roles.includes('maintenance') && !roles.includes('admin') && !roles.includes('property_manager');
  const isCleanerOnly = roles.includes('cleaner') && !roles.includes('admin') && !roles.includes('property_manager');

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={getPostLoginPath(roles)} replace />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/host-hub" element={<Index viewMode={viewMode} onViewModeChange={setViewMode} />} />
        <Route path="/cleaner" element={<CleanerPortal />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/payments" element={<Finances />} />
        <Route path="/reports" element={<Finances />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/airbnb-market" element={<AirbnbMarket />} />
        <Route path="/admin/draws" element={<AdminDraws />} />

        <Route path="/maintenance/health" element={<MaintenanceHealth />} />
        <Route path="/maintenance-portal" element={<MaintenancePortal />} />
        <Route path="/extend-stay" element={<ExtendStay />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/auth" element={<Navigate to={getPostLoginPath(roles, getStoredLoginLane())} replace />} />
        <Route path="/auth/property-manager" element={<Navigate to={getPostLoginPath(roles, 'property-manager')} replace />} />
        <Route path="/auth/maintenance" element={<Navigate to={getPostLoginPath(roles, 'maintenance')} replace />} />
        <Route path="/auth/cleaner" element={<Navigate to={getPostLoginPath(roles, 'cleaner')} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isMaintenanceOnly && !isCleanerOnly && <MobileBottomNav viewMode={viewMode} onViewModeChange={setViewMode} />}
    </>
  );
}

function AppRouter() {
  const { session, loading } = useAuth();
  const { roles, loading: rolesLoading } = useAuthRoles(session?.user.id);
  const location = useLocation();
  const isPasswordRecovery = location.pathname.startsWith('/auth/')
    && isPasswordRecoveryLocation(location.search, location.hash);

  if (loading || (session && rolesLoading && !isPasswordRecovery)) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (['/handyman-sms-signup', '/privacy', '/privacy-policy', '/sms-terms'].includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/handyman-sms-signup" element={<HandymanSmsSignup />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/privacy-policy" element={<SmsPrivacy />} />
        <Route path="/sms-terms" element={<SmsTerms />} />
      </Routes>
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

  if (location.pathname.startsWith('/cleaning/')) {
    return (
      <Routes>
        <Route path="/cleaning/:token" element={<CleanerPortal />} />
      </Routes>
    );
  }

  if (location.pathname.startsWith('/maintenance-offer/')) {
    return (
      <Routes>
        <Route path="/maintenance-offer/:token" element={<MaintenanceOffer />} />
      </Routes>
    );
  }

  if (isPasswordRecovery) {
    return (
      <Routes>
        <Route path="/auth/property-manager" element={<Auth />} />
        <Route path="/auth/maintenance" element={<Auth />} />
        <Route path="/auth/cleaner" element={<Auth />} />
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
        <Route path="/auth/cleaner" element={<Auth />} />
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
          <Suspense fallback={<AppLoading />}>
            <AppRouter />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
