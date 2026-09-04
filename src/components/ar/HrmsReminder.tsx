import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ackToday, readAck, reminderDue } from "@/lib/hrms-reminder";

// Daily nudge, shown once per org day (Phoenix time, not local) after login.
export function HrmsReminder() {
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<number | null>(null);
  const reduce = useReducedMotion();

  // Re-check every minute so the reminder also appears if the app stays open
  // across the org's midnight.
  useEffect(() => {
    const check = () => setOpen(reminderDue(readAck()));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  // Clear the auto-close timer if the dialog unmounts mid-celebration.
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const dismiss = (note?: string) => {
    ackToday();
    setOpen(false);
    setCelebrating(false);
    if (note) toast.info(note);
  };

  const confirmYes = () => {
    ackToday();
    if (reduce) {
      dismiss();
      return;
    }
    setCelebrating(true);
    timerRef.current = window.setTimeout(() => dismiss(), 1700);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Any way of closing counts as acknowledged for the day.
        if (!next) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-sm">
        {celebrating ? (
          <Celebration />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Daily reminder</DialogTitle>
              <DialogDescription>
                Have you logged into the HRMS system for today's shift?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => dismiss("Don't forget to log into HRMS.")}>
                Not yet
              </Button>
              <Button onClick={confirmYes}>Yes, I'm logged in</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CONFETTI_COLORS = ["#22c55e", "#4ade80", "#facc15", "#60a5fa", "#f472b6"];

function Celebration() {
  // ponytail: fixed 26-piece burst is plenty inside a small dialog; no need
  // for a particle system. Randomized per celebration via useMemo.
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: (Math.random() - 0.5) * 260,
        y: -40 - Math.random() * 160,
        rotate: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.15,
        wide: Math.random() > 0.5,
      })),
    [],
  );

  return (
    <div className="relative py-4" aria-live="polite">
      <div className="absolute inset-0 overflow-visible pointer-events-none" aria-hidden>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className={p.wide ? "absolute left-1/2 top-1/2 w-1.5 h-3 rounded-sm" : "absolute left-1/2 top-1/2 w-2 h-2 rounded-full"}
            style={{ backgroundColor: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.7 }}
            transition={{ duration: 1.3, ease: "easeOut", delay: p.delay }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className="size-16 rounded-full bg-green-500/15 border-2 border-green-500 grid place-items-center"
        >
          <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
            <motion.path
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="#22c55e"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-sm font-medium text-foreground"
        >
          Nice! You're all set for today.
        </motion.p>
      </div>
    </div>
  );
}