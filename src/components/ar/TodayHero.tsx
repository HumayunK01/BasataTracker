import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type Easing } from "motion/react";
import { Flame, TrendingUp, TrendingDown, Minus, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ActivityRing } from "@/components/ar/ActivityRing";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useProfile, useUpdateDailyGoal } from "@/hooks/useProfile";
import { computeStreaks } from "@/lib/log-utils";
import { isoDate, totalForLog, type DailyLog } from "@/types/log";
import { cn } from "@/lib/utils";

const GOAL_KEY = "basata-daily-goal";

function loadLocalGoal(): number | null {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (!raw) return null;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveLocalGoal(n: number) {
  try {
    localStorage.setItem(GOAL_KEY, String(n));
  } catch {
    // Ignore localStorage failures
  }
}

const cardEase: Easing = [0.23, 1, 0.32, 1];

export function TodayHero({ logs }: { logs: DailyLog[] }) {
  const { data: profile } = useProfile();
  const updateDailyGoal = useUpdateDailyGoal();

  const stats = useMemo(() => {
    const today = isoDate();
    const todayLog = logs.find((l) => l.log_date === today);
    const todayTotal = todayLog ? totalForLog(todayLog) : 0;
    const pastWorking = logs.filter(
      (l) => l.log_date !== today && !l.is_off_day && totalForLog(l) > 0,
    );
    const avg = pastWorking.length
      ? pastWorking.reduce((s, l) => s + totalForLog(l), 0) / pastWorking.length
      : 0;
    return { todayTotal, avg, ...computeStreaks(logs) };
  }, [logs]);

  // Priority: Supabase profile → localStorage → average → 50
  const [goal, setGoal] = useState<number>(() => {
    const local = loadLocalGoal();
    if (local) return local;
    return stats.avg > 0 ? Math.round(stats.avg) : 50;
  });
  const [goalOpen, setGoalOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // Sync profile's daily_goal when it loads (overrides localStorage)
  useEffect(() => {
    if (profile?.daily_goal != null && profile.daily_goal > 0) {
      setGoal(profile.daily_goal);
    }
  }, [profile?.daily_goal]);

  const clampGoal = (n: number) => Math.min(9999, Math.max(1, Math.round(n)));

  const stepDraft = (dir: 1 | -1) => {
    const n = Number(draft);
    setDraft(String(clampGoal((Number.isFinite(n) ? n : goal) + dir * 5)));
  };

  const commitGoal = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) {
      const clamped = clampGoal(n);
      setGoal(clamped);
      saveLocalGoal(clamped);
      updateDailyGoal.mutate(clamped);
    }
    setGoalOpen(false);
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const animatedTotal = useAnimatedNumber(stats.todayTotal);
  const goalPct = Math.min(100, Math.round((stats.todayTotal / goal) * 100));

  const delta = stats.avg > 0 ? ((stats.todayTotal - stats.avg) / stats.avg) * 100 : null;
  const reduceMotion = useReducedMotion();

  const cardVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: () => ({ opacity: 1 }) }
    : {
        hidden: { opacity: 0, y: 12 },
        visible: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: i * 0.07, duration: 0.3, ease: cardEase },
        }),
      };

  const deltaDisplay =
    delta === null
      ? { Icon: Minus, text: "No history yet", tone: "text-muted-foreground" }
      : stats.todayTotal === 0
        ? { Icon: Minus, text: "—", tone: "text-muted-foreground" }
        : Math.abs(delta) < 5
          ? { Icon: Minus, text: "On pace", tone: "text-muted-foreground" }
          : delta > 0
            ? { Icon: TrendingUp, text: `+${Math.round(delta)}%`, tone: "text-success" }
            : { Icon: TrendingDown, text: `${Math.round(delta)}%`, tone: "text-destructive" };

  const cards = [
    <div key="goal" className="hover-lift h-full bg-card border border-border rounded-md p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <ActivityRing value={stats.todayTotal} target={goal} size={52} strokeWidth={5}>
        <span className="tabular-nums">{goalPct}%</span>
      </ActivityRing>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">Docs Today</p>
        <p className="text-xl sm:text-2xl font-bold tabular-nums">{animatedTotal}</p>
        <Popover
          open={goalOpen}
          onOpenChange={(open) => {
            if (open) setDraft(String(goal));
            setGoalOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <button
              title="Edit daily goal"
              className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              of {goal} goal <Pencil className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-3">
            <p className="text-xs font-semibold mb-2">Daily goal</p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => stepDraft(-1)}>
                <Minus className="size-3.5" />
              </Button>
              <input
                autoFocus
                type="number"
                min={1}
                max={9999}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitGoal();
                  if (e.key === "Escape") setGoalOpen(false);
                }}
                className="h-8 flex-1 min-w-0 bg-muted/30 border border-border rounded-md text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => stepDraft(1)}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            <Button size="sm" className="w-full mt-2.5" onClick={commitGoal}>
              Set goal
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>,
    <div key="streak" className="hover-lift h-full bg-card border border-border rounded-md p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <div className="size-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
        <Flame className="size-5 text-warning" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">Streak</p>
        <p className="text-xl sm:text-2xl font-bold tabular-nums">
          {stats.current}
          <span className="text-sm font-medium text-muted-foreground"> day{stats.current === 1 ? "" : "s"}</span>
        </p>
        <p className="text-xs text-muted-foreground">Best: {stats.best} day{stats.best === 1 ? "" : "s"}</p>
      </div>
    </div>,
    <div key="avg" className="hover-lift h-full bg-card border border-border rounded-md p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <div className="size-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
        <deltaDisplay.Icon className={cn("size-5", deltaDisplay.tone === "text-muted-foreground" ? "text-info" : deltaDisplay.tone)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">vs Your Average</p>
        <p className={cn("text-xl sm:text-2xl font-bold tabular-nums", deltaDisplay.tone)}>{deltaDisplay.text}</p>
        {stats.avg > 0 && (
          <p className="text-xs text-muted-foreground">avg {Math.round(stats.avg)} docs/day</p>
        )}
      </div>
    </div>,
  ];

  return (
    <section className="space-y-2 sm:space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-heading">Today</h2>
        <span className="text-xs text-muted-foreground truncate">{todayLabel}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            {card}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
