import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useUpsertLog, useDailyLogs } from "@/hooks/useDailyLogs";
import { isoDate, totalForLog } from "@/types/log";
import { PageHeader } from "@/components/ar/PageHeader";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import { RotateCcw, Save, CheckCircle2, Hash, Plus, Tag, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Import modular components
import { CounterCard } from "@/components/ar/counter/CounterCard";
import { CategoryPicker } from "@/components/ar/counter/CategoryPicker";
import { NewCategoryDialog } from "@/components/ar/counter/NewCategoryDialog";

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
      return { ...s, counts: {}, selectedKeys: [], saved: false };
    case "hydrate":
      return { counts: { ...a.counts }, selectedKeys: a.keys, saved: true };
    default:
      return s;
  }
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
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [{ counts, selectedKeys, saved }, cDispatch] = useReducer(counterReducer, undefined, () => ({
    counts: load<Record<string, number>>(COUNTS_KEY, {}),
    selectedKeys: load<string[]>(SELECTED_KEY, []),
    saved: false,
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Cross-device persistence. Saving is manual (Save button) into today's
  // daily_logs row; on first load the counter hydrates from the server so a
  // device that wasn't the last writer continues where the others left off.
  const hydratedRef = useRef(false);
  const skipUnsavedMarkRef = useRef(false);

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
          toast("Kudos received! 🎉", {
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
  }, [user]);

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
      skipUnsavedMarkRef.current = true;
      const next = new Set(selectedKeys);
      for (const k of Object.keys(serverCounts)) {
        if ((serverCounts[k] ?? 0) > 0 && categories.some((c) => c.key === k)) next.add(k);
      }
      cDispatch({ type: "hydrate", counts: { ...serverCounts }, keys: [...next] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLog, categories]);

  // Mark progress as unsaved whenever counts change after initial hydration.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipUnsavedMarkRef.current) {
      skipUnsavedMarkRef.current = false;
      return;
    }
    cDispatch({ type: "set_saved", v: false });
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

  const handleReset = () => {
    cDispatch({ type: "reset" });
    setResetOpen(false);
  };

  const handleSave = async () => {
    const keys = activeCategories.map((c) => c.key);
    try {
      await flush(counts, keys);
      cDispatch({ type: "set_saved", v: true });
    } catch {
      toast.error("Couldn't save counts", {
        description: "Check your connection and try again.",
      });
    }
  };

  return (
    <>
      <PageHeader
        now={now}
        subtitle="Counter"
        actions={
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              aria-label="Reset counter"
              className="h-10 md:h-8 px-3 mr-2 border-border/60 hover:bg-muted/80 transition-colors duration-200"
              onClick={() => setResetOpen(true)}
              disabled={total === 0 && activeCategories.length === 0}
            >
              <RotateCcw className="size-4" />
              <span className="hidden xs:inline ml-1 font-semibold">Reset</span>
            </Button>
            <Button
              size="sm"
              aria-label="Save counts"
              className={`h-10 md:h-8 px-3 shadow-sm transition-colors duration-200 ${
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
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="hidden xs:inline ml-1 font-semibold">Saving…</span>
                </>
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

      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-4">
          {/* Hero — session total instrument */}
          <section className="relative bg-card border border-border p-5 sm:p-6 overflow-hidden">
            <span className="pointer-events-none absolute top-0 left-0 size-2 border-t border-l border-primary/40" />
            <span className="pointer-events-none absolute bottom-0 right-0 size-2 border-b border-r border-primary/40" />

            <p className="font-mono text-2xs uppercase tracking-[0.2em] text-foreground">Session Total</p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <p className="text-7xl sm:text-8xl font-black tabular-nums text-primary leading-none">
                {animatedTotal}
              </p>
              <span
                className={`text-2xs font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border ${
                  saved
                    ? "bg-success/15 text-success border-success/30"
                    : total > 0
                    ? "bg-warning/15 text-warning border-warning/30"
                    : "bg-muted text-foreground border-border/40"
                }`}
              >
                {saved ? "Synced" : total > 0 ? "Unsaved" : "Empty"}
              </span>
            </div>
            <p className="text-xs text-foreground mt-3 font-medium">
              {saved
                ? "All counts synchronized to database"
                : todayLog
                ? `Last saved value: ${todayTotal} documents`
                : "No documents saved yet today"}
            </p>
          </section>

          {/* Counter cards grid */}
          {activeCategories.length > 0 && (
            <>
              <FigHeader title="Active Counters" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
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
            </>
          )}

          {/* Manage categories */}
          <FigHeader title="Manage Categories" />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={catsLoading || availableToAdd.length === 0}
              className="flex-1 flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-left hover:bg-muted/40 hover:border-foreground/20 active:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 transition-[background-color,border-color,opacity] duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border touch-manipulation cursor-pointer"
            >
              <span className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="size-5 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {catsLoading
                    ? "Loading categories…"
                    : availableToAdd.length === 0 && activeCategories.length === 0
                    ? "No categories yet"
                    : availableToAdd.length === 0
                    ? "All active categories added"
                    : "Add category to counter"}
                </span>
                <span className="block text-xs text-foreground mt-0.5 truncate">
                  {availableToAdd.length > 0
                    ? `Pick from ${availableToAdd.length} available categor${availableToAdd.length === 1 ? "y" : "ies"}`
                    : "Create a new category to keep counting"}
                </span>
              </span>
              {availableToAdd.length > 0 && !catsLoading && (
                <ChevronRight className="size-4 text-foreground shrink-0" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setNewCatOpen(true)}
              disabled={catsLoading}
              className="sm:w-64 flex items-center gap-3 rounded-md border border-primary/30 bg-card px-4 py-3 text-left hover:bg-primary/5 hover:border-primary/60 active:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 transition-[background-color,border-color,opacity] duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-primary/30 touch-manipulation cursor-pointer"
            >
              <span className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Tag className="size-5 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-primary">New category</span>
                <span className="block text-xs text-foreground mt-0.5 truncate">Create your own from scratch</span>
              </span>
            </button>
          </div>

          {/* Empty state */}
          {activeCategories.length === 0 && !catsLoading && categories.length > 0 && (
            <EmptyState
              icon={Hash}
              title="No Active Counters"
              hint="Add a category from the tray below to start tracking documents for today."
            />
          )}
        </div>
      </main>

      <CategoryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        categories={availableToAdd}
        onPick={addCategory}
      />

      <NewCategoryDialog
        open={newCatOpen}
        onOpenChange={setNewCatOpen}
        onCreated={addCategory}
      />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the counter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear {total} unsaved count{total === 1 ? "" : "s"} and remove all{" "}
              {activeCategories.length} categor{activeCategories.length === 1 ? "y" : "ies"} from the counter.
              {todayLog ? " Counts already saved to today's log are not affected." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleReset}
            >
              Reset counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
