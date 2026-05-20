import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useUpsertLog, useDailyLogs } from "@/hooks/useDailyLogs";
import { useIsMobile } from "@/hooks/use-mobile";
import { isoDate, totalForLog } from "@/types/log";
import { PageHeader } from "@/components/ar/PageHeader";
import { Minus, Plus, RotateCcw, Save, CheckCircle2, X, Hash, Search } from "lucide-react";
import { colorForKey } from "@/lib/cat-colors";

const COUNTS_KEY = "counter_counts";
const SELECTED_KEY = "counter_selected_keys";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

interface CounterState { counts: Record<string, number>; selectedKeys: string[]; saved: boolean; }
type CounterAction =
  | { type: "set_count"; key: string; val: number }
  | { type: "add_key"; key: string }
  | { type: "remove_key"; key: string }
  | { type: "set_saved"; v: boolean }
  | { type: "reset" }
  | { type: "hydrate"; counts: Record<string, number>; keys: string[] };

function counterReducer(s: CounterState, a: CounterAction): CounterState {
  switch (a.type) {
    case "set_count": return { ...s, counts: { ...s.counts, [a.key]: Math.max(0, a.val) } };
    case "add_key": return { ...s, selectedKeys: [...s.selectedKeys, a.key] };
    case "remove_key": return { ...s, selectedKeys: s.selectedKeys.filter((k) => k !== a.key) };
    case "set_saved": return { ...s, saved: a.v };
    case "reset": return { ...s, counts: {}, saved: false };
    case "hydrate": return { counts: { ...a.counts }, selectedKeys: a.keys, saved: true };
    default: return s;
  }
}

/** Eases a displayed number toward `value` so the hero total animates. */
function useAnimatedNumber(value: number, duration = 400) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = 0;
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const step = (t: number) => {
      if (!startRef.current) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + delta * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

/** Press-and-hold auto-repeat for the +/- buttons. */
function useHoldRepeat(action: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (interval.current) clearInterval(interval.current);
    timer.current = null;
    interval.current = null;
  }, []);

  const start = useCallback(() => {
    action();
    timer.current = setTimeout(() => {
      interval.current = setInterval(action, 80);
    }, 400);
  }, [action]);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

interface CategoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onPick: (cat: Category) => void;
}

function CategoryPickerList({ categories, onPick }: Pick<CategoryPickerProps, "categories" | "onPick">) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter(
      (c) => c.label.toLowerCase().includes(s) || c.short.toLowerCase().includes(s),
    );
  }, [q, categories]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search categories…"
          className="pl-9"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No categories match.</p>
        ) : (
          filtered.map((cat) => {
            const clr = colorForKey(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onPick(cat)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 active:bg-muted transition-colors text-left touch-manipulation"
              >
                <span
                  className="size-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                  style={{ color: clr, backgroundColor: `${clr}22` }}
                >
                  {cat.short.slice(0, 3)}
                </span>
                <span className="text-sm flex-1 font-[system-ui] truncate">{cat.label}</span>
                <Plus className="size-4 text-muted-foreground shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function CategoryPicker({ open, onOpenChange, categories, onPick }: CategoryPickerProps) {
  const isMobile = useIsMobile();
  const handlePick = (cat: Category) => {
    onPick(cat);
    onOpenChange(false);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="font-[system-ui]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base font-semibold">Add category</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <CategoryPickerList categories={categories} onPick={handlePick} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-[system-ui]">
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
        </DialogHeader>
        <CategoryPickerList categories={categories} onPick={handlePick} />
      </DialogContent>
    </Dialog>
  );
}

interface CounterCardProps {
  cat: Category;
  count: number;
  maxCount: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

function CounterCard({ cat, count, maxCount, onIncrement, onDecrement, onRemove }: CounterCardProps) {
  const clr = colorForKey(cat.key);
  const [bump, setBump] = useState(0);
  const fill = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;

  const inc = useHoldRepeat(onIncrement);
  const dec = useHoldRepeat(onDecrement);

  const tap = () => {
    onIncrement();
    setBump((n) => n + 1);
  };

  return (
    <div
      className="group rounded-xl border flex flex-col relative overflow-hidden transition-shadow hover:shadow-sm focus-within:ring-2"
      style={{ borderColor: `${clr}40`, backgroundColor: `${clr}12` }}
    >
      {/* Progress fill (share of the busiest category) */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out pointer-events-none"
        style={{ height: `${fill}%`, backgroundColor: `${clr}1f` }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-center gap-1.5 px-3 pt-3 pb-1 pr-9">
        <p className="text-xs font-semibold truncate font-[system-ui]" style={{ color: clr }}>
          {cat.label}
        </p>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-auto"
          style={{ color: clr, backgroundColor: `${clr}2e` }}
        >
          {cat.short}
        </span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 size-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-colors touch-manipulation z-10 opacity-60 group-hover:opacity-100"
        title={`Remove ${cat.label}`}
        aria-label={`Remove ${cat.label}`}
      >
        <X className="size-3" />
      </button>

      {/* Big tap area */}
      <button
        type="button"
        onClick={tap}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "+" || e.key === "=") {
            e.preventDefault();
            tap();
          } else if (e.key === "ArrowDown" || e.key === "-") {
            e.preventDefault();
            onDecrement();
          }
        }}
        className="relative flex items-center justify-center py-7 sm:py-8 mx-2 rounded-lg active:scale-[0.97] transition-transform duration-100 touch-manipulation select-none outline-none"
        title="Tap to count (or press ↑ / +)"
        aria-label={`${cat.label}: ${count}. Tap to add one.`}
      >
        <span
          key={bump}
          className="text-5xl sm:text-6xl font-black tabular-nums leading-none font-[system-ui] [animation:counter-pop_180ms_ease-out]"
          style={{ color: count > 0 ? clr : "hsl(var(--muted-foreground) / 0.25)" }}
        >
          {count}
        </span>
      </button>

      {/* +/- controls */}
      <div className="relative flex gap-2 p-2 pt-1">
        <button
          type="button"
          onPointerDown={dec.start}
          onPointerUp={dec.stop}
          onPointerLeave={dec.stop}
          onPointerCancel={dec.stop}
          disabled={count === 0}
          className="flex-1 flex items-center justify-center h-11 rounded-lg border transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation"
          style={{ borderColor: `${clr}40`, backgroundColor: `${clr}26` }}
          aria-label={`Decrease ${cat.label}`}
        >
          <Minus className="size-4" style={{ color: clr }} />
        </button>
        <button
          type="button"
          onPointerDown={inc.start}
          onPointerUp={inc.stop}
          onPointerLeave={inc.stop}
          onPointerCancel={inc.stop}
          className="flex-1 flex items-center justify-center h-11 rounded-lg border transition-all active:scale-95 touch-manipulation"
          style={{ borderColor: `${clr}40`, backgroundColor: `${clr}26` }}
          aria-label={`Increase ${cat.label}`}
        >
          <Plus className="size-4" style={{ color: clr }} />
        </button>
      </div>
    </div>
  );
}

export default function CounterPage() {
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: logs = [] } = useDailyLogs();
  const upsert = useUpsertLog();

  const [{ counts, selectedKeys, saved }, cDispatch] = useReducer(counterReducer, undefined, () => ({
    counts: load<Record<string, number>>(COUNTS_KEY, {}),
    selectedKeys: load<string[]>(SELECTED_KEY, []),
    saved: false,
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Cross-device persistence. The counter auto-saves (debounced) into today's
  // daily_logs row, and on first load it hydrates from the server so a device
  // that wasn't the last writer continues where the others left off.
  const hydratedRef = useRef(false);
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  }, [counts]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const activeCategories = categories.filter((c) => selectedKeys.includes(c.key));
  const availableToAdd = categories.filter((c) => !selectedKeys.includes(c.key));

  const getCount = (key: string) => counts[key] ?? 0;
  const setCount = (key: string, val: number) => cDispatch({ type: "set_count", key, val });
  const increment = (key: string) => setCount(key, getCount(key) + 1);
  const decrement = (key: string) => setCount(key, getCount(key) - 1);

  const total = activeCategories.reduce((s, c) => s + getCount(c.key), 0);
  const maxCount = activeCategories.reduce((m, c) => Math.max(m, getCount(c.key)), 0);
  const animatedTotal = useAnimatedNumber(total);

  const addCategory = (cat: Category) => cDispatch({ type: "add_key", key: cat.key });
  const removeCategory = (key: string) => cDispatch({ type: "remove_key", key });

  const todayIso = isoDate();
  const todayLog = logs.find((l) => l.log_date === todayIso);
  const todayTotal = todayLog ? totalForLog(todayLog) : 0;

  // Shared write path for both debounced auto-save and the manual Save button.
  // Merges into today's row so categories tracked on other devices are kept.
  const flush = useCallback(
    async (current: Record<string, number>, keys: string[]) => {
      const existingLog = logs.find((l) => l.log_date === todayIso);
      const mergedCounts: Record<string, number> = { ...(existingLog?.counts ?? {}) };
      for (const key of keys) mergedCounts[key] = current[key] ?? 0;
      await upsert.mutateAsync({
        log_date: todayIso,
        is_off_day: false,
        notes: existingLog?.notes ?? null,
        counts: mergedCounts,
      });
    },
    [logs, todayIso, upsert],
  );

  // Hydrate from the server once, when today's row first arrives. Only seed if
  // this device has no local progress, so we never clobber in-progress taps.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (categories.length === 0) return;
    hydratedRef.current = true;

    const serverCounts = todayLog?.counts ?? {};
    const localTotal = Object.values(counts).reduce((s, v) => s + (v || 0), 0);
    const serverTotal = Object.values(serverCounts).reduce((s, v) => s + (v || 0), 0);
    if (localTotal === 0 && serverTotal > 0) {
      skipAutoSaveRef.current = true;
      const next = new Set(selectedKeys);
      for (const k of Object.keys(serverCounts)) {
        if ((serverCounts[k] ?? 0) > 0 && categories.some((c) => c.key === k)) next.add(k);
      }
      cDispatch({ type: "hydrate", counts: { ...serverCounts }, keys: [...next] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLog, categories]);

  // Debounced auto-save: ~1s after taps settle, push to the server.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    cDispatch({ type: "set_saved", v: false });
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const keys = categories.reduce<string[]>((acc, c) => { if (selectedKeys.includes(c.key)) acc.push(c.key); return acc; }, []);
      if (keys.length === 0) return;
      flush(counts, keys).then(
        () => cDispatch({ type: "set_saved", v: true }),
        () => {}, // error toast handled by the mutation hook
      );
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts]);

  const handleReset = () => cDispatch({ type: "reset" });

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const keys = activeCategories.map((c) => c.key);
    try {
      await flush(counts, keys);
      cDispatch({ type: "set_saved", v: true });
    } catch {
      // error handled by hook
    }
  };

  return (
    <>
      <style>{`@keyframes counter-pop{0%{transform:scale(1.18)}60%{transform:scale(0.97)}100%{transform:scale(1)}}`}</style>
      <PageHeader
        now={now}
        subtitle="Counter"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 sm:px-3"
              onClick={handleReset}
              disabled={total === 0}
            >
              <RotateCcw className="size-4" />
              <span className="hidden xs:inline ml-1">Reset</span>
            </Button>
            <Button
              size="sm"
              className={`h-8 px-2.5 sm:px-3 ${saved ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
              onClick={handleSave}
              disabled={upsert.isPending || total === 0}
            >
              {saved ? (
                <><CheckCircle2 className="size-4" /><span className="hidden xs:inline ml-1">Saved</span></>
              ) : upsert.isPending ? (
                <span>Saving…</span>
              ) : (
                <><Save className="size-4" /><span className="hidden xs:inline ml-1">Save</span></>
              )}
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">

          {/* Hero total */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-[system-ui]">
                    Total today
                  </p>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      saved
                        ? "bg-success/15 text-success"
                        : total > 0
                        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {saved ? "Saved" : total > 0 ? "Unsaved" : "Empty"}
                  </span>
                </div>
                <p className="text-6xl sm:text-7xl font-black tabular-nums text-primary leading-none mt-1.5 font-[system-ui]">
                  {animatedTotal}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-[system-ui]">
                  {saved
                    ? "Saved to today's log"
                    : todayLog
                    ? `Last saved: ${todayTotal} docs`
                    : "Not saved yet"}
                </p>
              </div>

              {activeCategories.length > 0 && (
                <div className="flex-1 min-w-[180px] max-w-xs space-y-1.5">
                  {activeCategories
                    .filter((c) => getCount(c.key) > 0)
                    .sort((a, b) => getCount(b.key) - getCount(a.key))
                    .slice(0, 5)
                    .map((cat) => {
                      const clr = colorForKey(cat.key);
                      const c = getCount(cat.key);
                      const pct = total > 0 ? (c / total) * 100 : 0;
                      return (
                        <div key={cat.key} className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-mono w-10 shrink-0 text-right"
                            style={{ color: clr }}
                          >
                            {cat.short}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-500 ease-out"
                              style={{ width: `${pct}%`, backgroundColor: clr }}
                            />
                          </div>
                          <span className="text-[10px] font-mono tabular-nums w-6 text-muted-foreground">
                            {c}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Counter cards */}
          {activeCategories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {activeCategories.map((cat) => (
                <CounterCard
                  key={cat.key}
                  cat={cat}
                  count={getCount(cat.key)}
                  maxCount={maxCount}
                  onIncrement={() => increment(cat.key)}
                  onDecrement={() => decrement(cat.key)}
                  onRemove={() => removeCategory(cat.key)}
                />
              ))}
            </div>
          )}

          {/* Add category */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={catsLoading || availableToAdd.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation font-[system-ui]"
          >
            <Plus className="size-4" />
            {catsLoading
              ? "Loading categories…"
              : availableToAdd.length === 0 && activeCategories.length === 0
              ? "No categories in Settings yet"
              : availableToAdd.length === 0
              ? "All categories added"
              : "Add category"}
          </button>

          {/* Empty state */}
          {activeCategories.length === 0 && !catsLoading && categories.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Hash className="size-10 opacity-20" />
              <p className="text-sm font-[system-ui]">Add a category above to start counting.</p>
            </div>
          )}

        </div>
      </main>

      <CategoryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        categories={availableToAdd}
        onPick={addCategory}
      />
    </>
  );
}
