import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ar/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDailyActivity, type DailyActivityRow } from "@/hooks/useDailyActivity";
import { useCategories } from "@/hooks/useCategories";
import { colorForKey } from "@/lib/cat-colors";
import { formatTableDate } from "@/types/log";
import { Activity, Search, AlertCircle, RefreshCw } from "lucide-react";

function relativeTime(ms: number): string {
  if (!ms) return "never";
  const secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function displayName(r: DailyActivityRow) {
  const full = `${r.first_name} ${r.last_name}`.trim();
  return full || r.email || "Unknown user";
}

function StatusBadge({ r }: { r: DailyActivityRow }) {
  if (r.is_off_day) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium whitespace-nowrap">
        Off day
      </span>
    );
  }
  if (r.logged) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium whitespace-nowrap">
        Logged
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium whitespace-nowrap">
      Not logged
    </span>
  );
}

function Breakdown({
  r,
  labelFor,
}: {
  r: DailyActivityRow;
  labelFor: (key: string) => string;
}) {
  const entries = Object.entries(r.counts).filter(([, v]) => (v || 0) > 0);
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground/40">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, v]) => {
        const clr = colorForKey(key);
        return (
          <span
            key={key}
            className="text-xs font-mono px-1.5 py-0.5 rounded tabular-nums whitespace-nowrap"
            style={{ color: clr, backgroundColor: `${clr}22` }}
          >
            {labelFor(key)} {v}
          </span>
        );
      })}
    </div>
  );
}

export default function DailyActivityPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetching, error, dataUpdatedAt, refetch } = useDailyActivity();
  const { data: categories = [] } = useCategories();

  // Re-render every 10s so the "updated Xs ago" label stays accurate between
  // refetches (the query data itself doesn't change, only elapsed time does).
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const labelFor = useMemo(() => {
    const map = new Map(categories.map((c) => [c.key, c.short || c.label]));
    return (key: string) => map.get(key) ?? key;
  }, [categories]);

  const rows = useMemo(() => {
    const list = data?.activity ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter((r) =>
          [r.first_name, r.last_name, r.email].join(" ").toLowerCase().includes(q),
        )
      : list;
    // Logged + highest total first; not-logged users sink to the bottom.
    return filtered.toSorted((a, b) => {
      if (a.logged !== b.logged) return a.logged ? -1 : 1;
      return b.total - a.total;
    });
  }, [data, search]);

  const summary = useMemo(() => {
    const list = data?.activity ?? [];
    const logged = list.filter((r) => r.logged && !r.is_off_day);
    const totalDocs = logged.reduce((s, r) => s + r.total, 0);
    return {
      loggedCount: logged.length,
      userCount: list.length,
      totalDocs,
    };
  }, [data]);

  return (
    <>
      <PageHeader
        subtitle={
          data?.date ? (
            <span className="text-muted-foreground">{formatTableDate(data.date)}</span>
          ) : (
            "Daily Activity"
          )
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 sm:px-3"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline ml-1">Refresh</span>
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto font-[system-ui]">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">Daily Activity</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Today's logged documents for all users. Today only — no history.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  {isFetching && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                  )}
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
                <span className="font-medium text-foreground">Live</span>
              </span>
              <span aria-live="polite">
                · {isFetching ? "updating…" : `updated ${relativeTime(dataUpdatedAt)}`}
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh now"
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Total docs today", value: summary.totalDocs },
              { label: "Users logged", value: `${summary.loggedCount}/${summary.userCount}` },
              {
                label: "Not logged",
                value: Math.max(0, summary.userCount - summary.loggedCount),
              },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-md p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">
                  {s.label}
                </p>
                <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="pl-9"
            />
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                Couldn't load daily activity: {(error as Error).message}
              </p>
            </div>
          ) : isLoading ? (
            <>
              {/* Mobile skeletons */}
              <div className="space-y-2 sm:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-md p-3 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
              {/* Desktop table skeletons */}
              <div className="hidden sm:block bg-card border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border first:border-t-0">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="size-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : rows.length === 0 ? (
            <div className="bg-card border border-border rounded-md py-12 text-center text-muted-foreground">
              <Activity className="size-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm">
                {search ? "No users match your search." : "No users found."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards (no horizontal scroll) */}
              <div className="space-y-2 sm:hidden">
                {rows.map((r) => (
                  <div key={r.user_id} className="bg-card border border-border rounded-md p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight truncate">{displayName(r)}</p>
                        {r.first_name || r.last_name ? (
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-lg font-bold tabular-nums ${
                            r.total > 0 ? "text-foreground" : "text-muted-foreground/40"
                          }`}
                        >
                          {r.logged ? r.total : "—"}
                        </span>
                        <StatusBadge r={r} />
                      </div>
                    </div>
                    <Breakdown r={r} labelFor={labelFor} />
                  </div>
                ))}
              </div>

              {/* Desktop / tablet: table */}
              <div className="hidden sm:block bg-card border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <th className="px-4 py-2.5 font-semibold">User</th>
                      <th className="px-4 py-2.5 font-semibold text-right w-20">Total</th>
                      <th className="px-4 py-2.5 font-semibold">Breakdown</th>
                      <th className="px-4 py-2.5 font-semibold w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.user_id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium leading-tight">{displayName(r)}</p>
                          {r.first_name || r.last_name ? (
                            <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`tabular-nums font-semibold ${
                              r.total > 0 ? "text-foreground" : "text-muted-foreground/40"
                            }`}
                          >
                            {r.logged ? r.total : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Breakdown r={r} labelFor={labelFor} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge r={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      </main>
    </>
  );
}
