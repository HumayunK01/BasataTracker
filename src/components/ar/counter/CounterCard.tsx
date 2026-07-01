import { useCallback, useEffect, useRef, useState } from "react";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Minus, Plus, X } from "lucide-react";

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

interface CounterCardProps {
  cat: Category;
  count: number;
  maxCount: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  hotkeyIndex?: number; // Optional keyboard shortcut (1-9)
}

export function CounterCard({
  cat,
  count,
  maxCount,
  onIncrement,
  onDecrement,
  onRemove,
  hotkeyIndex,
}: CounterCardProps) {
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
      className="group rounded-md border flex flex-col relative overflow-hidden focus-within:ring-2 focus-within:ring-primary/40"
      style={{ borderColor: withAlpha(clr, 0.25), backgroundColor: withAlpha(clr, 0.07) }}
    >
      {/* Progress fill (share of the busiest category) */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out pointer-events-none"
        style={{ height: `${fill}%`, backgroundColor: withAlpha(clr, 0.12) }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-center gap-2 px-3.5 pt-3.5 pb-1 pr-9 min-w-0">
        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: clr }} aria-hidden />
        <p className="text-xs font-semibold truncate text-foreground/90 flex-1 min-w-0" title={cat.label}>
          {cat.label}
        </p>

        {/* Key shortcut indicator badge */}
        {hotkeyIndex !== undefined && (
          <kbd
            className="hidden md:inline text-2xs font-bold font-mono px-1.5 py-0.5 rounded border border-border/40 bg-background/60 shadow-sm shrink-0 select-none cursor-help hover:border-foreground/20 transition-[border-color] duration-150 text-muted-foreground"
            title={`Press ${hotkeyIndex} key to count`}
          >
            {hotkeyIndex}
          </kbd>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 size-9 md:size-6 md:top-2.5 md:right-2.5 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation z-10 opacity-60 group-hover:opacity-100"
        title={`Remove ${cat.label}`}
        aria-label={`Remove ${cat.label}`}
      >
        <X className="size-4 md:size-3" />
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
        className="relative flex-1 flex items-center justify-center py-6 sm:py-7 mx-2 rounded-md active:scale-[0.97] transition-transform duration-100 touch-manipulation select-none outline-none cursor-pointer"
        title="Tap to count (or press ↑ / +)"
        aria-label={`${cat.label}: ${count}. Tap to add one.`}
      >
        <span
          key={bump}
          className="text-5xl sm:text-6xl font-black tabular-nums leading-none [animation:counter-pop_180ms_ease-out] select-none"
          style={{ color: count > 0 ? clr : "hsl(var(--muted-foreground) / 0.3)" }}
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
          className="flex-1 flex items-center justify-center h-11 rounded-md border transition-transform duration-100 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation border-border/40"
          style={{ backgroundColor: withAlpha(clr, 0.15) }}
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
          className="flex-1 flex items-center justify-center h-11 rounded-md border transition-transform duration-100 active:scale-95 touch-manipulation border-border/40"
          style={{ backgroundColor: withAlpha(clr, 0.15) }}
          aria-label={`Increase ${cat.label}`}
        >
          <Plus className="size-4" style={{ color: clr }} />
        </button>
      </div>
    </div>
  );
}
