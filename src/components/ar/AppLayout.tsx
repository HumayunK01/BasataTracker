import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Easing, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/ar/AppSidebar";
import { MobileTabBar } from "@/components/ar/MobileTabBar";
import { PageHeader } from "@/components/ar/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const pageEase: Easing = [0.23, 1, 0.32, 1];

const pageTitles: Record<string, string> = {
  "/log": "Daily Log",
  "/counter": "Counter",
  "/tracker": "Tracker",
  "/report": "Report",
  "/vault": "Vault",
  "/console": "Console",
  "/settings": "Settings",
  "/team": "Team",
  "/faxed-back": "Faxed Back",
};

const INACTIVITY_WARNING_MS = 22 * 60 * 1000;
const INACTIVITY_LOGOUT_MS = 25 * 60 * 1000;

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
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const lastActivityRef = useRef(Date.now());
  const warningActiveRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_LOGOUT_MS) {
        signOutRef.current?.();
      } else if (elapsed >= INACTIVITY_WARNING_MS) {
        if (!warningActiveRef.current) {
          warningActiveRef.current = true;
          setShowWarning(true);
        }
      } else {
        if (warningActiveRef.current) {
          warningActiveRef.current = false;
          setShowWarning(false);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll", "wheel"];
    function onActivity() {
      if (warningActiveRef.current) return;
      lastActivityRef.current = Date.now();
    }
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, []);

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

      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm mx-4 border border-border/60 bg-background p-6 shadow-2xl">
            <div className="space-y-1.5 mb-4">
              <h2 className="text-lg font-semibold tracking-tight">Inactivity warning</h2>
              <p className="text-sm text-foreground/70">
                Your session will expire due to inactivity.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-foreground/70 text-center">
                You will be signed out automatically.
              </p>
              <Button
                className="w-full mt-2"
                onClick={() => {
                  warningActiveRef.current = false;
                  setShowWarning(false);
                  lastActivityRef.current = Date.now();
                }}
              >
                I'm still here
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
