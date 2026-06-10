import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
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
import UsersPage from "./pages/Users.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <SkeletonTheme baseColor="hsl(var(--skeleton-base))" highlightColor="hsl(var(--skeleton-highlight))">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SidebarProvider>
          <AuthGuard>
            <Routes>
              <Route element={<AppLayout><Outlet /></AppLayout>}>
                <Route path="/" element={<Index />} />
                <Route path="/log" element={<DailyLogPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/counter" element={<CounterPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGuard>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </SkeletonTheme>
  </ThemeProvider>
);

export default App;
