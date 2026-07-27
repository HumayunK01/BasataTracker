import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Easing, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/ar/AppSidebar";
import { MobileTabBar } from "@/components/ar/MobileTabBar";
import { PageHeader } from "@/components/ar/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

const INACTIVITY_WARNING_MS = 22 * 60 * 1000;
const INACTIVITY_COUNTDOWN_SEC = 180;

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
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(INACTIVITY_COUNTDOWN_SEC);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const warningActiveRef = useRef(false);

  useEffect(() => { warningActiveRef.current = showWarning; }, [showWarning]);

  function clearTimers() {
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = undefined; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = undefined; }
  }

  function startWarningTimer() {
    clearTimers();
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(INACTIVITY_COUNTDOWN_SEC);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { signOut(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_WARNING_MS);
  }

  function handleStillHere() {
    clearTimers();
    setShowWarning(false);
    startWarningTimer();
  }

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll", "wheel"];
    function onActivity() {
      if (warningActiveRef.current) return;
      startWarningTimer();
    }
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    startWarningTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimers();
    };
  }, [signOut]);

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

      <Dialog open={showWarning} onOpenChange={(open) => { if (!open) handleStillHere(); }}>
        <DialogContent className="sm:max-w-sm [&>button:last-child]:hidden">
          <DialogHeader>
            <DialogTitle>Inactivity warning</DialogTitle>
            <DialogDescription>
              Your session will expire due to inactivity.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-4xl font-bold tabular-nums text-foreground">{countdown}s</div>
            <p className="text-sm text-foreground/70 text-center">
              Signing out in <span className="font-semibold tabular-nums">{countdown}</span> seconds.
            </p>
            <Button className="w-full mt-2" onClick={handleStillHere}>
              I'm still here
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
