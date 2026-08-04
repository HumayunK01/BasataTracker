import { cn } from "@/lib/utils";
import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";
import { StepPicker, StatusIcon } from "./StepPicker";
import { labelFor, stepClasses, stepIsActive, stepIsSkipped, type TrackerMode } from "./tracker-helpers";

export function StepCell({
  row,
  field,
  editable,
  onPick,
  labels,
  mode,
}: {
  row: FaxRow;
  field: StepField;
  editable: boolean;
  onPick: (value: FaxStepStatus) => void;
  labels: [string, string, string];
  mode: TrackerMode;
}) {
  const status = row[field];
  const active = stepIsActive(row, field, mode);

  if (!active) return <td className="px-3 py-2 text-center w-28 text-muted-foreground">—</td>;

  if (stepIsSkipped(row, field, mode)) {
    return <td className="px-3 py-2 text-center w-28 text-xs font-normal text-foreground italic">No need</td>;
  }

  if (!editable) {
    return (
      <td className={cn(
        "px-3 py-1 w-28 text-center text-xs font-normal truncate rounded",
        status === "Successfully Sent" ? "text-white bg-emerald-700"
        : status === "Failed" ? "text-white bg-rose-700"
        : (status ? stepClasses(status) : "text-muted-foreground"),
      )}>
        {status ? (
          <span className="inline-flex items-center gap-1">
            <StatusIcon status={status} tickColor={status === "Successfully Sent" ? "text-emerald-500" : undefined} />
            {labelFor(status)}
          </span>
        ) : "—"}
      </td>
    );
  }

  return (
    <td className="px-3 py-2 text-center w-28">
      <StepPicker status={status} onPick={onPick} label={labels[Number(field.slice(-1)) - 1]} />
    </td>
  );
}
