import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isoDate, isWeekend, type DailyLog, type DailyLogInsert } from "@/types/log";
import { useUpsertLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { Minus, Plus, CalendarCheck, Coffee, Cloud, CloudOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DailyLog | null;
  existingDates: string[];
}

const CAT_COLORS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#34d399",
  "#a78bfa",
  "#f97316",
];

const emptyDraft = (date = isoDate()): DailyLogInsert => ({
  log_date: date,
  worked_on_ng: 0,
  moved_to_indexing: 0,
  ekg: 0,
  cath_lab: 0,
  roi: 0,
  fax_back: 0,
  is_off_day: isWeekend(date),
  notes: null,
});

function Stepper({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(value + 1);

  return (
    <div className="flex flex-col gap-2 bg-card border border-border rounded-xl p-3 select-none">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={value === 0}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          ref={inputRef}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); inc(); }
            if (e.key === "ArrowDown") { e.preventDefault(); dec(); }
          }}
          className="flex-1 min-w-0 text-center text-xl font-bold tabular-nums bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color: value > 0 ? color : "hsl(var(--muted-foreground))" }}
        />
        <button
          type="button"
          onClick={inc}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type AutosaveStatus = "idle" | "pending" | "saved" | "error";

export function DayEntrySheet({ open, onOpenChange, editing, existingDates }: Props) {
  const [draft, setDraft] = useState<DailyLogInsert>(emptyDraft());
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const upsert = useUpsertLog();
  const { data: categories = [] } = useCategories();

  // Track whether draft has been changed since last save
  const dirtyRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!open) {
      // Clear timer and reset status when sheet closes
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      dirtyRef.current = false;
      setAutosaveStatus("idle");
      return;
    }
    if (editing) {
      setDraft({
        log_date: editing.log_date,
        worked_on_ng: editing.worked_on_ng,
        moved_to_indexing: editing.moved_to_indexing,
        ekg: editing.ekg,
        cath_lab: editing.cath_lab,
        roi: editing.roi,
        fax_back: editing.fax_back,
        is_off_day: editing.is_off_day,
        notes: editing.notes,
      });
    } else {
      setDraft(emptyDraft());
    }
    dirtyRef.current = false;
    setAutosaveStatus("idle");
  }, [open, editing]);

  // Autosave: debounce 3s after any draft change
  useEffect(() => {
    if (!open) return;
    if (!dirtyRef.current) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setAutosaveStatus("pending");

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await upsert.mutateAsync({
          ...draftRef.current,
          notes: draftRef.current.notes?.trim() ? draftRef.current.notes.trim() : null,
        });
        setAutosaveStatus("saved");
      } catch {
        setAutosaveStatus("error");
      }
    }, 3000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = <K extends keyof DailyLogInsert>(k: K, v: DailyLogInsert[K]) => {
    dirtyRef.current = true;
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const onDateChange = (date: string) => {
    dirtyRef.current = true;
    const weekend = isWeekend(date);
    setDraft((d) => ({ ...d, log_date: date, is_off_day: editing ? d.is_off_day : weekend }));
  };

  const getCatValue = (key: string): number => {
    if (key in draft) return (draft as Record<string, number>)[key] || 0;
    return (draft.extra as Record<string, number>)?.[key] || 0;
  };

  const setCatValue = (key: string, v: number) => {
    if (key in draft && key !== "extra") {
      update(key as keyof DailyLogInsert, v as never);
    } else {
      dirtyRef.current = true;
      setDraft((d) => ({ ...d, extra: { ...(d.extra as Record<string, number>), [key]: v } }));
    }
  };

  const total = categories.reduce((s, c) => s + getCatValue(c.key), 0);
  const conflict = !editing && existingDates.includes(draft.log_date);
  const isToday = draft.log_date === isoDate();

  const save = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    await upsert.mutateAsync({
      ...draft,
      notes: draft.notes?.trim() ? draft.notes.trim() : null,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">

        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-base">
                {editing ? "Edit log" : "Log a day"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {editing ? "Update your document counts" : "Record your document counts for the day"}
                </p>
                {/* Autosave indicator */}
                {autosaveStatus === "pending" && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground animate-pulse">
                    <Cloud className="h-3 w-3" /> saving…
                  </span>
                )}
                {autosaveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-[10px] text-success">
                    <Cloud className="h-3 w-3" /> autosaved
                  </span>
                )}
                {autosaveStatus === "error" && (
                  <span className="flex items-center gap-1 text-[10px] text-destructive">
                    <CloudOff className="h-3 w-3" /> save failed
                  </span>
                )}
              </div>
            </div>
            {!draft.is_off_day && total > 0 && (
              <div className="text-right shrink-0 ml-4">
                <div className="text-2xl font-bold tabular-nums text-primary leading-none">{total}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">total docs</div>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">

          {/* Date */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={draft.log_date}
                onChange={(e) => onDateChange(e.target.value)}
                disabled={!!editing}
                className="tabular-nums"
              />
            </div>
            {!editing && (
              <Button
                type="button"
                variant={isToday ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-10"
                onClick={() => onDateChange(isoDate())}
              >
                Today
              </Button>
            )}
          </div>

          {conflict && (
            <div className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
              ⚠ A log already exists for this date — saving will overwrite it.
            </div>
          )}

          {/* Off day toggle */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors ${draft.is_off_day ? "bg-muted/50 border-border" : "bg-card border-border"}`}>
            <div className="flex items-center gap-2.5">
              <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium leading-none">Off day</p>
                <p className="text-xs text-muted-foreground mt-0.5">Weekend, leave, or holiday</p>
              </div>
            </div>
            <Switch
              checked={draft.is_off_day}
              onCheckedChange={(v) => update("is_off_day", v)}
            />
          </div>

          {/* Category steppers or off-day placeholder */}
          {draft.is_off_day ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 text-muted-foreground">
              <Coffee className="h-10 w-10 opacity-20" />
              <p className="text-sm">No counts needed for an off day</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {categories.map((c, i) => (
                <Stepper
                  key={c.key}
                  label={c.label}
                  value={getCatValue(c.key)}
                  color={CAT_COLORS[i % CAT_COLORS.length]}
                  onChange={(v) => setCatValue(c.key, v)}
                />
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Notes <span className="font-normal">(optional)</span>
            </Label>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything worth noting about today…"
              maxLength={500}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-border flex gap-2 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {autosaveStatus === "saved" ? "Close" : "Cancel"}
          </Button>
          <Button onClick={save} disabled={upsert.isPending} className="flex-1 gap-1.5">
            <CalendarCheck className="h-4 w-4" />
            {upsert.isPending
              ? "Saving…"
              : draft.is_off_day
              ? "Save off day"
              : total > 0
              ? `Save · ${total} docs`
              : "Save day"}
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}
