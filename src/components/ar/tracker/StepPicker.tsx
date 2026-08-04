import { Check, ChevronDown, CheckCheck, Loader2, X } from "lucide-react";
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
import { labelFor } from "./tracker-helpers";

export function StatusIcon({ status, tickColor }: { status: FaxStepStatus | null; tickColor?: string }) {
  switch (status) {
    case "Successfully Sent": return <CheckCheck className={`size-4 ${tickColor ?? "text-emerald-500"}`} />;
    case "Failed":            return <X className={`size-4 ${tickColor ?? "text-rose-500"}`} />;
    case "Waiting":           return <Loader2 className="size-3.5 text-amber-600 animate-spin" />;
    case "Pending":           return <Loader2 className="size-3.5 text-blue-500 animate-spin" />;
    default:                  return null;
  }
}


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
            "press-scale inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-normal transition-colors hover:bg-foreground/10 text-foreground",
            triggerClassName,
          )}
        >
          {status ? (
            <span className="inline-flex items-center gap-1">
              <StatusIcon status={status} tickColor={status === "Successfully Sent" ? "text-emerald-500" : undefined} />
              {labelFor(status)}
            </span>
          ) : "Set status"}
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
            className="flex items-center justify-between gap-2 text-foreground"
          >
            <span className="font-normal inline-flex items-center gap-1.5">
              <StatusIcon status={s} />
              {labelFor(s)}
            </span>
            {s === status && <Check className="size-3.5 opacity-80" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
