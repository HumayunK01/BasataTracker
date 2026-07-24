import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FigHeader({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 mb-3", className)}>
      <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
      <span className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export function Panel({ tag, className, children, ticks = true }: { tag: string; className?: string; children: ReactNode; ticks?: boolean }) {
  return (
    <section className={cn("relative bg-card border border-border/80 rounded-lg", className)}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="font-mono text-[11px] font-medium tracking-wide text-foreground uppercase">{tag}</span>
        {ticks && <span className="size-1.5 rounded-full bg-primary/70" title="active" />}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

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
    <div className={cn("flex flex-col items-center justify-center text-center gap-4 py-12 sm:py-14", className)}>
      <div className="size-12 rounded-xl border border-border/60 grid place-items-center text-primary/50 bg-primary/[0.03]">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1.5">
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        {hint && <p className="text-sm text-foreground max-w-xs">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums text-xs text-foreground">
      {now.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" })} (America/Chicago)
    </span>
  );
}

export function CategoryStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="group relative bg-card border border-border/80 rounded-lg p-4 transition-all duration-150 hover:border-primary/40 hover:shadow-sm hover:shadow-primary/5">
      <p className="font-mono text-xs text-foreground truncate">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>{value}</p>
    </div>
  );
}
