import { Check, ChevronDown } from "lucide-react";
import { STEP_STATUSES, type FaxStepStatus } from "@/hooks/useFaxTracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { stepClasses, stepMenuClasses } from "./tracker-helpers";

export function StepPicker({
  status,
  onPick,
  label,
  triggerClassName,
}: {
  status: FaxStepStatus | null;
  onPick: (value: FaxStepStatus) => void;
  label: string;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Click to change status"
          className={cn(
            "press-scale inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold transition-colors hover:bg-foreground/10",
            status ? stepClasses(status) : "text-foreground",
            triggerClassName,
          )}
        >
          {status ?? "Set status"}
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44 font-sans">
        <DropdownMenuLabel className="text-xs text-foreground font-normal">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STEP_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => { if (s !== status) onPick(s); }}
            className={cn("flex items-center justify-between gap-2", stepMenuClasses(s))}
          >
            <span className="font-medium">{s}</span>
            {s === status && <Check className="size-3.5 opacity-80" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
