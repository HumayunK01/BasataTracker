import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Easing, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/ar/AppSidebar";
import { MobileTabBar } from "@/components/ar/MobileTabBar";
import { PageHeader } from "@/components/ar/PageHeader";

const pageEase: Easing = [0.23, 1, 0.32, 1];

const pageTitles: Record<string, string> = {
  "/log": "Daily Log",
  "/counter": "Counter",
  "/tracker": "Tracker",
  "/report": "Report",
  "/vault": "Vault",
  "/console": "Console",
  "/settings": "Settings",
};

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: pageEase }}
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const title = pageTitles[location.pathname] ?? "";

  return (
    <div className="flex h-dvh w-full bg-background text-foreground overflow-hidden relative">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageHeader now={now} title={title} />
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
