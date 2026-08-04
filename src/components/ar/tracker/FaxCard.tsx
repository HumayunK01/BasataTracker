import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepPicker } from "./StepPicker";
import { displayStatus, labelFor, stepClasses, stepIsActive, stepIsSkipped, type TrackerMode } from "./tracker-helpers";
import { StatusIcon } from "./StepPicker";
import { copyName } from "./tracker-helpers";

export function FaxCard({
  row,
  mine,
  isNew,
  onEdit,
  onDelete,
  onPickStep,
  labels,
  mode,
}: {
  row: FaxRow;
  mine: boolean;
  isNew: boolean;
  onEdit: (row: FaxRow) => void;
  onDelete: (row: FaxRow) => void;
  onPickStep: (field: StepField, value: FaxStepStatus) => void;
  labels: [string, string, string];
  mode: TrackerMode;
}) {
  const fields: StepField[] = ["step1", "step2", "step3"];
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3.5 transition-colors",
        isNew && "animate-row-in",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 min-w-0">
          <img src="/pdf.png" alt="" className="size-4 shrink-0 object-contain" />
          <button
            type="button"
            onClick={() => copyName(row.patient_name)}
            title="Tap to copy name"
            className="press-scale font-normal text-base text-foreground rounded px-1 -mx-1 text-left active:bg-foreground/10 transition-colors"
          >
            {row.patient_name}
          </button>
        </span>
        {mine ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 -mr-1.5 -mt-1 shrink-0">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 font-sans">
              <button
                className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded-sm"
                onClick={() => onEdit(row)}
              >
                <Pencil className="size-4" /> Edit
              </button>
              <button
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
                onClick={() => onDelete(row)}
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="mt-1 text-sm font-normal text-foreground">
        {displayStatus(row.overall_status)}
      </div>

      <dl className="mt-3 space-y-1">
        {fields.map((field, i) => {
          const status = row[field];
          const active = stepIsActive(row, field, mode);
          const skipped = stepIsSkipped(row, field, mode);
          return (
            <div key={field} className="flex items-center justify-between gap-3 text-sm min-h-8">
              <dt className="text-foreground">{labels[i]}</dt>
              <dd className="text-right">
                {!active ? (
                   <span className="font-normal text-muted-foreground">—</span>
                ) : skipped ? (
                  <span className="text-xs font-normal text-foreground italic">No need</span>
                ) : mine ? (
                  <StepPicker status={status} onPick={(v) => onPickStep(field, v)} label={labels[i]} />
                ) : (
                   <span className={cn("inline-flex items-center gap-1 font-normal rounded px-1", status === "Successfully Sent" ? "text-white bg-emerald-700" : status === "Failed" ? "text-white bg-rose-700" : (status ? stepClasses(status) : "text-muted-foreground"))}>
                     <StatusIcon status={status} tickColor={status === "Successfully Sent" ? "text-emerald-500" : undefined} />
                     {status ? labelFor(status) : "—"}
                   </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {row.notes && (
        <p className="mt-3 pt-3 border-t border-border/60 text-sm text-foreground leading-snug">
          {row.notes}
        </p>
      )}
    </div>
  );
}
