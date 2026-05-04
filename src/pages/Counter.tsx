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
        actions={
          <>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={handleReset} disabled={total === 0}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleReset} disabled={total === 0}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button
              size="sm"
              className={`h-8 ${saved ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
              onClick={handleSave}
              disabled={upsert.isPending || total === 0}
            >
              {saved ? (
                <><CheckCircle2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Saved</span></>
              ) : upsert.isPending ? (
                <span className="hidden sm:inline">Saving…</span>
              ) : (
                <><Save className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Save to today</span></>
              )}
            </Button>
          </>
        }
      />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

            {/* Total */}
            <div className="flex items-center justify-center">
              <div className="bg-card border border-border rounded-2xl px-6 sm:px-12 py-5 sm:py-6 text-center w-full max-w-xs sm:w-auto">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total today</p>
                <p className="text-6xl sm:text-7xl font-black tabular-nums text-primary leading-none">{total}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {saved
                    ? "Saved to today's log"
                    : todayLog
                    ? `Last saved: ${todayTotal} docs`
                    : "Not saved yet"}
                </p>
              </div>
            </div>

            {/* Counter cards */}
            {activeCategories.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
                {activeCategories.map((cat) => {
                  const clr = colorForKey(cat.key);
                  const count = getCount(cat.key);
                  return (
                    <div
                      key={cat.key}
                      className="rounded-2xl border p-5 flex flex-col gap-4 relative transition-shadow duration-200 hover:shadow-lg"
                      style={{ borderColor: `${clr}4d`, backgroundColor: `${clr}1a` }}
                    >
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeCategory(cat.key)}
                        className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
                        title="Remove from counter"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      <div className="flex items-center gap-2 pr-6">
                        <p className="text-sm font-semibold" style={{ color: clr }}>{cat.label}</p>
                        <span className="text-xs font-mono px-2 py-0.5 rounded ml-auto" style={{ color: clr, backgroundColor: `${clr}33` }}>
                          {cat.short}
                        </span>
                      </div>

                      {/* Big tap target */}
                      <button
                        type="button"
                        onClick={() => increment(cat.key)}
                        className="flex-1 flex items-center justify-center py-4 rounded-xl active:scale-95 transition-all duration-150 cursor-pointer select-none hover:opacity-80"
                        style={{ backgroundColor: `${clr}0d` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${clr}22`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${clr}0d`; }}
                        title="Tap to count"
                      >
                        <span className="text-6xl font-black tabular-nums leading-none transition-transform duration-150" style={{ color: count > 0 ? clr : "hsl(var(--muted-foreground) / 0.3)" }}>
                          {count}
                        </span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => decrement(cat.key)}
                          disabled={count === 0}
                          className="group flex-1 flex items-center justify-center h-11 rounded-xl border transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-95"
                          style={{
                            borderColor: `${clr}4d`,
                            backgroundColor: `${clr}33`,
                          }}
                          onMouseEnter={e => { if (count > 0) (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${clr}55`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${clr}33`; }}
                        >
                          <Minus className="h-4 w-4 transition-transform duration-150 group-hover:scale-110" style={{ color: clr }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => increment(cat.key)}
                          className="group flex-1 flex items-center justify-center h-11 rounded-xl border transition-all duration-150 hover:scale-[1.03] active:scale-95"
                          style={{
                            borderColor: `${clr}4d`,
                            backgroundColor: `${clr}33`,
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${clr}66`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${clr}33`; }}
                        >
                          <Plus className="h-4 w-4 transition-transform duration-150 group-hover:scale-110" style={{ color: clr }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add category section */}
            <div className="max-w-4xl mx-auto w-full">
              {!pickerOpen ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={catsLoading || availableToAdd.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Select a category</p>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: clr }} />
                        <span className="text-sm flex-1">{cat.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{cat.short}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Empty state */}
            {activeCategories.length === 0 && !pickerOpen && !catsLoading && categories.length > 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
                <Hash className="h-10 w-10 opacity-20" />
                <p className="text-sm">Add a category above to start counting.</p>
              </div>
            )}

          </main>
    </>
  );
}
