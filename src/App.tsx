import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Finances from "./pages/Finances";
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";

const queryClient = new QueryClient();

type ViewMode = 'units' | 'calendar';

function AuthenticatedApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('units');

  return (
    <>
      <Routes>
        <Route path="/" element={<Index viewMode={viewMode} onViewModeChange={setViewMode} />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/payments" element={<Finances />} />
        <Route path="/reports" element={<Finances />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <MobileBottomNav viewMode={viewMode} onViewModeChange={setViewMode} />
    </>
  );
}

function AppRouter() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pattern-bg flex items-center justify-center">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {session ? (
        <Route path="/*" element={<AuthenticatedApp />} />
      ) : (
        <>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      )}
    </Routes>
  );
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
