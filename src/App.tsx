import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PaymentHistory from "./pages/PaymentHistory";
import FinancialReports from "./pages/FinancialReports";
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";

const queryClient = new QueryClient();

type ViewMode = 'units' | 'calendar';

const App = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('units');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index viewMode={viewMode} onViewModeChange={setViewMode} />} />
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="/reports" element={<FinancialReports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav viewMode={viewMode} onViewModeChange={setViewMode} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
