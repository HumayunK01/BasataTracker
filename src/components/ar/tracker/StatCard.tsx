import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

export function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky" | "slate" | "neutral";
  loading: boolean;
}) {
  const toneClasses = {
    emerald: "text-success",
    rose: "text-destructive",
    sky: "text-info",
    slate: "text-muted-foreground",
    neutral: "text-foreground",
  }[tone];
  const display = useAnimatedNumber(value);
  return (
    <div className="bg-card border border-border rounded-md p-3 sm:p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-heading">{label}</p>
      {loading ? (
        <Skeleton width={48} height={32} borderRadius={0} />
      ) : (
        <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", toneClasses)}>{display}</p>
      )}
    </div>
  );
}
