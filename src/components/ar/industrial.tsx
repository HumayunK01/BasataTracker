import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Industrial / utilitarian building blocks — shared across all pages so the
   "control-room instrument" language stays consistent. */

/* Section callout: FIG.NN · TITLE with a hairline rule. */
export function FigHeader({ code, title, className }: { code: string; title: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 mb-3", className)}>
      <span className="font-mono text-2xs tracking-[0.2em] text-primary">{code}</span>
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.15em] text-foreground">{title}</h2>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

/* Bordered instrument panel with a mono caption tag + corner registration ticks. */
export function Panel({ tag, className, children, ticks = true }: { tag: string; className?: string; children: ReactNode; ticks?: boolean }) {
  return (
    <section className={cn("relative bg-card border border-border", className)}>
      <header className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="font-mono text-2xs tracking-[0.18em] text-muted-foreground uppercase">{tag}</span>
        <span className="size-1.5 bg-primary" title="active" />
      </header>
      <div className="p-3 sm:p-4">{children}</div>
      {ticks && (
        <>
          <span className="pointer-events-none absolute top-0 left-0 size-2 border-t border-l border-primary/40" />
          <span className="pointer-events-none absolute bottom-0 right-0 size-2 border-b border-r border-primary/40" />
        </>
      )}
    </section>
  );
}

/* Consistent in-panel empty state for instrument sections. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center gap-3 py-10 sm:py-12", className)}>
      <div className="size-12 rounded-none border border-border grid place-items-center text-primary/70">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.15em] text-foreground">{title}</p>
        {hint && <p className="text-xs text-muted-foreground max-w-xs">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* Live mono clock (Chicago). */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums text-xs text-muted-foreground">
      {now.toLocaleString("en-US", { hour12: false, timeZone: "America/Chicago" })} CT
    </span>
  );
}

/* Mono category readout: corner ticks, top signal rule. */
export function CategoryStatCard({ label, code, value, color }: { label: string; code: string; value: number; color: string }) {
  return (
    <div className="group relative bg-card border border-border p-3 transition-colors duration-150 hover:border-primary/60 hover:bg-primary/[0.04]">
      <span className="absolute top-0 left-0 h-0.5 w-full" style={{ backgroundColor: color }} />
      <span className="absolute top-1 right-1 size-1 border-t border-r border-border" />
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground truncate">{code}</p>
      <p className="font-mono text-2xs text-muted-foreground/70 truncate">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
