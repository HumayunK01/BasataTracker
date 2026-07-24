import { cn } from "@/lib/utils";
import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";
import { StepPicker } from "./StepPicker";
import { stepClasses, stepIsActive, stepIsSkipped, type TrackerMode } from "./tracker-helpers";

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

  if (!active) return <td className="px-3 py-2 text-center text-muted-foreground">—</td>;

  if (stepIsSkipped(row, field, mode)) {
    return <td className="px-3 py-2 text-center text-xs font-medium text-foreground italic">No need</td>;
  }

  if (!editable) {
    return (
      <td className={cn("px-3 py-2 text-center text-sm font-semibold", status ? stepClasses(status) : "text-muted-foreground")}>
        {status ?? "—"}
      </td>
    );
  }

  return (
    <td className="px-3 py-2 text-center">
      <StepPicker status={status} onPick={onPick} label={labels[Number(field.slice(-1)) - 1]} />
    </td>
  );
}
