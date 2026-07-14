import { Suspense } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/ar/AuthGuard";
import { AppLayout } from "@/components/ar/AppLayout";
import { ThemeProvider } from "@/components/ar/ThemeProvider";
import {
  ConsolePage,
  DailyLogPage,
  SettingsPage,
  ReportPage,
  CounterPage,
  FaxTrackerPage,
  NotFound,
} from "@/lib/routePreload";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is per-user and changes slowly; avoid refetching everything on
      // every window refocus. Queries that need tighter sync (e.g. daily_logs
      // cross-device polling) override this locally.
      staleTime: 60_000,
    },
  },
  // Mutations already toast their own errors in the hooks; queries previously
  // failed silently, so surface those here. The fixed id dedupes the toast
  // when several queries fail at once (e.g. network drop).
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(`Failed to load data: ${message}`, { id: "query-error" });
    },
  }),
});

const App = () => (
  <ThemeProvider>
  <SkeletonTheme baseColor="hsl(var(--skeleton-base))" highlightColor="hsl(var(--skeleton-highlight))">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SidebarProvider>
          <AuthGuard>
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground font-mono uppercase tracking-[0.2em]">
                  Loading…
                </div>
              }
            >
              <Routes>
                <Route element={<AppLayout><Outlet /></AppLayout>}>
                  <Route path="/" element={<ConsolePage />} />
                  <Route path="/log" element={<DailyLogPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/report" element={<ReportPage />} />
                  <Route path="/counter" element={<CounterPage />} />
                  <Route path="/tracker" element={<FaxTrackerPage />} />
                  {/* Legacy path — the page now hosts both Fax and Indexable */}
                  <Route path="/fax-tracker" element={<FaxTrackerPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthGuard>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </SkeletonTheme>
  </ThemeProvider>
);

export default App;
