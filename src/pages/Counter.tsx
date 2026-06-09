import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useUpsertLog, useDailyLogs } from "@/hooks/useDailyLogs";
import { isoDate, totalForLog } from "@/types/log";
import { PageHeader } from "@/components/ar/PageHeader";
import { RotateCcw, Save, CheckCircle2, Hash, Plus } from "lucide-react";
import { colorForKey } from "@/lib/cat-colors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Import modular components
import { CounterCard } from "@/components/ar/counter/CounterCard";
import { CategoryPicker } from "@/components/ar/counter/CategoryPicker";

const COUNTS_KEY = "counter_counts";
const SELECTED_KEY = "counter_selected_keys";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Ignore localStorage parse failures
  }
  return fallback;
}

interface CounterState {
  counts: Record<string, number>;
  selectedKeys: string[];
  saved: boolean;
}

type CounterAction =
  | { type: "set_count"; key: string; val: number }
  | { type: "add_key"; key: string }
  | { type: "remove_key"; key: string }
  | { type: "set_saved"; v: boolean }
  | { type: "reset" }
  | { type: "hydrate"; counts: Record<string, number>; keys: string[] };

function counterReducer(s: CounterState, a: CounterAction): CounterState {
  switch (a.type) {
    case "set_count":
      return { ...s, counts: { ...s.counts, [a.key]: Math.max(0, a.val) } };
    case "add_key":
      return { ...s, selectedKeys: [...s.selectedKeys, a.key] };
    case "remove_key":
      return { ...s, selectedKeys: s.selectedKeys.filter((k) => k !== a.key) };
    case "set_saved":
      return { ...s, saved: a.v };
    case "reset":
      return { ...s, counts: {}, saved: false };
    case "hydrate":
      return { counts: { ...a.counts }, selectedKeys: a.keys, saved: true };
    default:
      return s;
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

function triggerKudosAnimation(emoji: string) {
  const container = document.getElementById("kudos-animation-container");
  if (!container) return;

  const node = document.createElement("div");
  node.innerText = emoji;
  node.className = "kudos-float absolute text-4xl select-none pointer-events-none z-50";

  const randomX = Math.random() * 80 + 10;
  node.style.left = `${randomX}%`;
  node.style.bottom = "0px";
  node.style.fontSize = `${Math.random() * 25 + 28}px`;
  
  container.appendChild(node);
  setTimeout(() => {
    node.remove();
  }, 2000);
}

export default function CounterPage() {
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: logs = [] } = useDailyLogs();
  const upsert = useUpsertLog();
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

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
    if (!user) return;

    const channel = supabase.channel("basata_live_activity", {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on("broadcast", { event: "kudos" }, (payload: { payload: { senderEmail: string; receiverId: string; emoji: string } }) => {
        if (payload.payload.receiverId === user.id) {
          toast({
            title: "Kudos received! 🎉",
            description: `${payload.payload.senderEmail} sent you a ${payload.payload.emoji}!`,
          });
          triggerKudosAnimation(payload.payload.emoji);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast]);

  useEffect(() => {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  }, [counts]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const activeCategories = useMemo(() => {
    return categories.filter((c) => selectedKeys.includes(c.key));
  }, [categories, selectedKeys]);

  const availableToAdd = useMemo(() => {
    return categories.filter((c) => !selectedKeys.includes(c.key));
  }, [categories, selectedKeys]);

  const broadcastIncrement = useCallback((key: string, change: number) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "activity",
        payload: {
          user_id: user.id,
          email: user.email,
          category_key: key,
          change: change,
          timestamp: Date.now()
        }
      });
    }
  }, [user]);

  const getCount = (key: string) => counts[key] ?? 0;
  const setCount = (key: string, val: number) => cDispatch({ type: "set_count", key, val });
  
  const increment = useCallback((key: string) => {
    cDispatch({ type: "set_count", key, val: (counts[key] ?? 0) + 1 });
    broadcastIncrement(key, 1);
  }, [counts, broadcastIncrement]);
  
  const decrement = useCallback((key: string) => {
    cDispatch({ type: "set_count", key, val: (counts[key] ?? 0) - 1 });
    broadcastIncrement(key, -1);
  }, [counts, broadcastIncrement]);

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
    [logs, todayIso, upsert]
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
      const keys = categories.reduce<string[]>((acc, c) => {
        if (selectedKeys.includes(c.key)) acc.push(c.key);
        return acc;
      }, []);
      if (keys.length === 0) return;
      flush(counts, keys).then(
        () => cDispatch({ type: "set_saved", v: true }),
        () => {} // error toast handled by the mutation hook
      );
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts]);

  // Global Keyboard Shortcuts: Keys 1 to 9 instantly increment the 1st through 9th cards
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const idx = num - 1;
        if (idx >= 0 && idx < activeCategories.length) {
          e.preventDefault();
          increment(activeCategories[idx].key);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCategories, increment]);

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
      <style>{`
        @keyframes counter-pop{0%{transform:scale(1.18)}60%{transform:scale(0.97)}100%{transform:scale(1)}}
      `}</style>
      <PageHeader
        now={now}
        subtitle="Counter"
        actions={
          <div className="font-[system-ui]">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 sm:px-3 mr-2 border-border/60 hover:bg-muted/80 transition-all duration-200"
              onClick={handleReset}
              disabled={total === 0}
            >
              <RotateCcw className="size-4" />
              <span className="hidden xs:inline ml-1 font-semibold">Reset</span>
            </Button>
            <Button
              size="sm"
              className={`h-8 px-2.5 sm:px-3 shadow-sm transition-all duration-200 ${
                saved
                  ? "bg-success hover:bg-success/90 text-success-foreground shadow-success/10"
                  : "bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/10"
              }`}
              onClick={handleSave}
              disabled={upsert.isPending || total === 0}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="size-4" />
                  <span className="hidden xs:inline ml-1 font-semibold">Saved</span>
                </>
              ) : upsert.isPending ? (
                <span className="font-semibold">Saving…</span>
              ) : (
                <>
                  <Save className="size-4" />
                  <span className="hidden xs:inline ml-1 font-semibold">Save</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto font-[system-ui]">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
          {/* Hero total today */}
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-muted/40 backdrop-blur-md px-5 py-5 sm:px-6 sm:py-6 hover:border-primary/10 transition-all duration-300">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                      Total today
                    </p>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        saved
                          ? "bg-success/15 text-success border border-success/10"
                          : total > 0
                          ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/10"
                          : "bg-muted text-muted-foreground border border-border/40"
                      }`}
                    >
                      {saved ? "Saved" : total > 0 ? "Unsaved" : "Empty"}
                    </span>
                  </div>
                  <p className="text-6xl sm:text-7xl font-black tabular-nums text-primary leading-none mt-1.5 font-[system-ui]">
                    {animatedTotal}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                    {saved
                      ? "All counts synchronized to database"
                      : todayLog
                      ? `Last saved value: ${todayTotal} documents`
                      : "No documents saved yet today"}
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
                          <div key={cat.key} className="flex items-center gap-2 animate-fade-in">
                            <span className="text-[10px] font-mono font-bold w-10 shrink-0 text-right" style={{ color: clr }}>
                              {cat.short}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted/40 border border-border/20 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-[width] duration-500 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: clr }}
                              />
                            </div>
                            <span className="text-[10px] font-mono tabular-nums w-6 text-muted-foreground/80 text-right">
                              {c}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

          {/* Counter cards grid */}
          {activeCategories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 animate-fade-in">
              {activeCategories.map((cat, idx) => (
                <CounterCard
                  key={cat.key}
                  cat={cat}
                  count={getCount(cat.key)}
                  maxCount={maxCount}
                  onIncrement={() => increment(cat.key)}
                  onDecrement={() => decrement(cat.key)}
                  onRemove={() => removeCategory(cat.key)}
                  hotkeyIndex={idx < 9 ? idx + 1 : undefined} // Only first 9 cards get shortcuts 1-9
                />
              ))}
            </div>
          )}

          {/* Add category placeholder */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={catsLoading || availableToAdd.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/[0.04] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation font-semibold cursor-pointer"
          >
            <Plus className="size-4" />
            {catsLoading
              ? "Loading categories…"
              : availableToAdd.length === 0 && activeCategories.length === 0
              ? "No categories defined in Settings"
              : availableToAdd.length === 0
              ? "All active categories added"
              : "Add category to counter"}
          </button>

          {/* Empty state */}
          {activeCategories.length === 0 && !catsLoading && categories.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground animate-fade-in">
              <Hash className="size-10 opacity-20 animate-pulse" />
              <p className="text-sm font-medium">Select an active category above to begin document tracking.</p>
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
