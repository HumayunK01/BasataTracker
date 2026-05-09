import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/ar/AuthGuard";
import { AppLayout } from "@/components/ar/AppLayout";
import { ThemeProvider } from "@/components/ar/ThemeProvider";
import Index from "./pages/Index.tsx";
import DailyLogPage from "./pages/DailyLog.tsx";
import SettingsPage from "./pages/Settings.tsx";
import ReportPage from "./pages/Report.tsx";
import CounterPage from "./pages/Counter.tsx";
import HelpPage from "./pages/Help.tsx";
import UsersPage from "./pages/Users.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <AuthGuard>
            <Routes>
              <Route element={<AppLayout><Outlet /></AppLayout>}>
                <Route path="/" element={<Index />} />
                <Route path="/log" element={<DailyLogPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/counter" element={<CounterPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGuard>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
