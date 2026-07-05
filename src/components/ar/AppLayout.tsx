import { AnimatePresence } from "motion/react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/ar/AppSidebar";
import { MobileTabBar } from "@/components/ar/MobileTabBar";
import { AnimatedPage } from "@/components/ar/AnimatedPage";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden relative">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <AnimatedPage key={location.pathname}>
            {children}
          </AnimatedPage>
        </AnimatePresence>
        <MobileTabBar />
      </div>
      <div id="kudos-animation-container" className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />
    </div>
  );
}
