import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortKey = "patient_name" | "overall_status" | "updated_at";

export function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (key: SortKey) => void;
  align: "left" | "center";
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "press-scale inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wide",
        align === "center" ? "mx-auto" : "",
        active && "text-foreground",
      )}
      title={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      <Icon key={active ? sort.dir : "idle"} className={cn("size-3 animate-fade-in", active ? "opacity-100" : "opacity-40")} />
    </button>
  );
}
