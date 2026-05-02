import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/ar/AuthGuard";
import Index from "./pages/Index.tsx";
import DailyLogPage from "./pages/DailyLog.tsx";
import SettingsPage from "./pages/Settings.tsx";
import ReportPage from "./pages/Report.tsx";
import CounterPage from "./pages/Counter.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/log" element={<DailyLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/report" element={<ReportPage />} />
          <Route path="/counter" element={<CounterPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
