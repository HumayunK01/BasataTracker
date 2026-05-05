import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useUpsertLog, useDailyLogs } from "@/hooks/useDailyLogs";
import { isoDate, totalForLog } from "@/types/log";
import { PageHeader } from "@/components/ar/PageHeader";
import { Minus, Plus, RotateCcw, Save, CheckCircle2, X, Hash } from "lucide-react";
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

export default function CounterPage() {
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: logs = [] } = useDailyLogs();
  const upsert = useUpsertLog();

  const [counts, setCounts] = useState<Record<string, number>>(() => load(COUNTS_KEY, {}));
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => load(SELECTED_KEY, []));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
    setSaved(false);
  }, [counts]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const activeCategories = categories.filter((c) => selectedKeys.includes(c.key));
  const availableToAdd = categories.filter((c) => !selectedKeys.includes(c.key));

  const getCount = (key: string) => counts[key] ?? 0;
  const setCount = (key: string, val: number) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  const increment = (key: string) => setCount(key, getCount(key) + 1);
  const decrement = (key: string) => setCount(key, getCount(key) - 1);

  const total = activeCategories.reduce((s, c) => s + getCount(c.key), 0);

  const addCategory = (cat: Category) => {
    setSelectedKeys((prev) => [...prev, cat.key]);
    setPickerOpen(false);
  };

  const removeCategory = (key: string) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  };

  const handleReset = () => {
    setCounts({});
    setSaved(false);
  };

  const handleSave = async () => {
    const today = isoDate();
    const existingLog = logs.find((l) => l.log_date === today);
    const mergedCounts: Record<string, number> = { ...(existingLog?.counts ?? {}) };
    for (const cat of activeCategories) {
      mergedCounts[cat.key] = getCount(cat.key);
    }
    try {
      await upsert.mutateAsync({
        log_date: today,
        is_off_day: false,
        notes: existingLog?.notes ?? null,
        counts: mergedCounts,
      });
      setSaved(true);
    } catch {
      // error handled by hook
    }
  };

  const todayIso = isoDate();
  const todayLog = logs.find((l) => l.log_date === todayIso);
  const todayTotal = todayLog ? totalForLog(todayLog) : 0;

  return (
    <>
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
              <RotateCcw className="h-4 w-4" />
              <span className="hidden xs:inline ml-1">Reset</span>
            </Button>
            <Button
              size="sm"
              className={`h-8 px-2.5 sm:px-3 ${saved ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
              onClick={handleSave}
              disabled={upsert.isPending || total === 0}
            >
              {saved ? (
                <><CheckCircle2 className="h-4 w-4" /><span className="hidden xs:inline ml-1">Saved</span></>
              ) : upsert.isPending ? (
                <span>Saving…</span>
              ) : (
                <><Save className="h-4 w-4" /><span className="hidden xs:inline ml-1">Save</span></>
              )}
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">

          {/* Total strip */}
          <div className="bg-card border border-border rounded-md px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-[system-ui]">Total today</p>
              <p className="text-5xl sm:text-6xl font-black tabular-nums text-primary leading-none mt-1 font-[system-ui]">{total}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-[system-ui]">
                {saved
                  ? "Saved to today's log"
                  : todayLog
                  ? `Last saved: ${todayTotal} docs`
                  : "Not saved yet"}
              </p>
              {activeCategories.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1.5 mt-2">
                  {activeCategories.map((cat) => {
                    const clr = colorForKey(cat.key);
                    const count = getCount(cat.key);
                    return (
                      <span
                        key={cat.key}
                        className="text-xs font-mono px-2 py-0.5 rounded-full tabular-nums"
                        style={{ color: clr, backgroundColor: `${clr}22` }}
                      >
                        {cat.short} {count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Counter cards — 2 cols on mobile, 3 on desktop */}
          {activeCategories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {activeCategories.map((cat) => {
                const clr = colorForKey(cat.key);
                const count = getCount(cat.key);
                return (
                  <div
                    key={cat.key}
                    className="rounded-md border flex flex-col relative"
                    style={{ borderColor: `${clr}4d`, backgroundColor: `${clr}1a` }}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1 pr-8">
                      <p className="text-xs font-semibold truncate font-[system-ui]" style={{ color: clr }}>{cat.label}</p>
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ml-auto"
                        style={{ color: clr, backgroundColor: `${clr}33` }}
                      >
                        {cat.short}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat.key)}
                      className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors touch-manipulation"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Big tap area */}
                    <button
                      type="button"
                      onClick={() => increment(cat.key)}
                      className="flex items-center justify-center py-5 sm:py-6 mx-2 rounded-md active:scale-95 transition-transform duration-100 touch-manipulation select-none"
                      style={{ backgroundColor: `${clr}0d` }}
                      title="Tap to count"
                    >
                      <span
                        className="text-5xl sm:text-6xl font-black tabular-nums leading-none font-[system-ui]"
                        style={{ color: count > 0 ? clr : "hsl(var(--muted-foreground) / 0.25)" }}
                      >
                        {count}
                      </span>
                    </button>

                    {/* +/- row */}
                    <div className="flex gap-2 p-2 pt-1">
                      <button
                        type="button"
                        onClick={() => decrement(cat.key)}
                        disabled={count === 0}
                        className="flex-1 flex items-center justify-center h-11 rounded-md border transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation"
                        style={{ borderColor: `${clr}4d`, backgroundColor: `${clr}33` }}
                      >
                        <Minus className="h-4 w-4" style={{ color: clr }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => increment(cat.key)}
                        className="flex-1 flex items-center justify-center h-11 rounded-md border transition-all active:scale-95 touch-manipulation"
                        style={{ borderColor: `${clr}4d`, backgroundColor: `${clr}33` }}
                      >
                        <Plus className="h-4 w-4" style={{ color: clr }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add category */}
          <div>
            {!pickerOpen ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={catsLoading || availableToAdd.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation font-[system-ui]"
              >
                <Plus className="h-4 w-4" />
                {catsLoading
                  ? "Loading categories…"
                  : availableToAdd.length === 0 && activeCategories.length === 0
                  ? "No categories in Settings yet"
                  : availableToAdd.length === 0
                  ? "All categories added"
                  : "Add category"}
              </button>
            ) : (
              <div className="rounded-md border border-border bg-card p-4 space-y-1 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium font-[system-ui]">Select a category</p>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {availableToAdd.map((cat) => {
                  const clr = colorForKey(cat.key);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => addCategory(cat)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-muted/50 active:bg-muted transition-colors text-left touch-manipulation"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: clr }} />
                      <span className="text-sm flex-1 font-[system-ui]">{cat.label}</span>
                      <span className="text-xs font-mono text-muted-foreground">{cat.short}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Empty state */}
          {activeCategories.length === 0 && !pickerOpen && !catsLoading && categories.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Hash className="h-10 w-10 opacity-20" />
              <p className="text-sm font-[system-ui]">Add a category above to start counting.</p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
