import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isoDate, isWeekend, type DailyLog, type DailyLogInsert } from "@/types/log";
import { useUpsertLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { Minus, Plus, CalendarCheck, BedDouble, CalendarIcon, TriangleAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { colorForKey, withAlpha } from "@/lib/cat-colors";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DailyLog | null;
  existingDates: string[];
}

const emptyDraft = (date = isoDate()): DailyLogInsert => ({
  log_date: date,
  counts: {},
  is_off_day: isWeekend(date),
  notes: null,
});

function Stepper({
  label,
  shortLabel,
  value,
  color,
  onChange,
}: {
  label: string;
  shortLabel: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(value + 1);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
      {/* Color dot + label */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide font-heading"
          style={{ color, backgroundColor: withAlpha(color, 0.13) }}
        >
          {shortLabel}
        </span>
      </div>

      {/* −  value  + */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={dec}
          disabled={value === 0}
          aria-label={`Decrease ${label}`}
          className="size-10 sm:size-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed touch-manipulation"
        >
          <Minus className="size-4 sm:size-3.5" />
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); inc(); }
            if (e.key === "ArrowDown") { e.preventDefault(); dec(); }
          }}
          className="w-12 h-10 sm:h-8 text-center text-sm font-bold tabular-nums bg-muted/50 border border-border rounded-md outline-none transition-colors focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color: value > 0 ? color : "hsl(var(--muted-foreground))" }}
        />
        <button
          type="button"
          onClick={inc}
          aria-label={`Increase ${label}`}
          className="size-10 sm:size-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation"
        >
          <Plus className="size-4 sm:size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DayEntrySheet({ open, onOpenChange, editing, existingDates }: Props) {
  const [draft, setDraft] = useState<DailyLogInsert>(() => emptyDraft());
  const [calOpen, setCalOpen] = useState(false);
  const upsert = useUpsertLog();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDraft({
        log_date: editing.log_date,
        counts: { ...editing.counts },
        is_off_day: editing.is_off_day,
        notes: editing.notes,
      });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, editing]);

  const update = <K extends keyof DailyLogInsert>(k: K, v: DailyLogInsert[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const onDateChange = (date: string) =>
    setDraft((d) => ({ ...d, log_date: date, is_off_day: editing ? d.is_off_day : isWeekend(date) }));

  const getCatValue = (key: string): number =>
    (draft.counts as Record<string, number>)[key] ?? 0;

  const setCatValue = (key: string, v: number) =>
    setDraft((d) => ({ ...d, counts: { ...d.counts, [key]: v } }));

  const total = categories.reduce((s, c) => s + getCatValue(c.key), 0);
  const conflict = !editing && existingDates.includes(draft.log_date);
  const isToday = draft.log_date === isoDate();
  const weekend = isWeekend(draft.log_date);

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...draft, notes: draft.notes?.trim() || null });
      onOpenChange(false);
    } catch {
      // The mutation hook surfaces the error toast; keep the sheet open to retry.
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0 bg-sidebar font-sans">

        {/* ── Header ── */}
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SheetTitle className="text-lg font-bold">
                {editing ? "Edit log" : "Log a day"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editing ? "Update counts for this day" : "Record your document counts"}
              </p>
            </div>
            {!draft.is_off_day && total > 0 && (
              <div className="shrink-0 text-right bg-primary/10 border border-primary/20 rounded-md px-4 py-2">
                <div className="text-3xl font-black tabular-nums text-primary leading-none">{total}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5 font-heading">total docs</div>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-5 space-y-5">

          {/* Date */}
          <div className="px-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">Date</p>
            <div className="flex gap-2">
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!!editing}
                    className="flex-1 h-10 justify-start text-left font-normal tabular-nums"
                  >
                    <CalendarIcon className="size-4 mr-2 text-muted-foreground shrink-0" />
                    {format(parseISO(draft.log_date), "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseISO(draft.log_date)}
                    onSelect={(day) => { if (day) { onDateChange(format(day, "yyyy-MM-dd")); setCalOpen(false); } }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {!editing && (
                <Button
                  type="button"
                  variant={isToday ? "default" : "outline"}
                  className="h-10 px-4 shrink-0"
                  onClick={() => onDateChange(isoDate())}
                >
                  Today
                </Button>
              )}
            </div>

            {/* Conflict */}
            {conflict && (
              <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/25 rounded-md px-3 py-2.5">
                <TriangleAlert className="size-3.5 shrink-0 mt-0.5" />
                <span>A log already exists for this date. Saving overwrites it.</span>
              </div>
            )}
          </div>

          {/* Off-day toggle */}
          <div className="px-5">
            <div className={`flex items-center justify-between rounded-md px-4 py-3 border ${draft.is_off_day ? "bg-muted/30 border-border" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <BedDouble className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-none font-heading">{weekend ? "Weekend" : "Off day"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{weekend ? "Saturday or Sunday" : "Leave, holiday, or sick day"}</p>
                </div>
              </div>
              <Switch checked={draft.is_off_day} onCheckedChange={(v) => update("is_off_day", v)} />
            </div>
          </div>

          {/* Document counts */}
          {!draft.is_off_day && (
            <div className="space-y-2">
              <p className="px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">Document Counts</p>
              <div className="bg-card border-y border-border">
                {categories.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-center text-muted-foreground">No categories set up yet. Add them in Settings.</p>
                ) : (
                  categories.map((c) => (
                    <Stepper
                      key={c.key}
                      label={c.label}
                      shortLabel={c.short}
                      value={getCatValue(c.key)}
                      color={colorForKey(c.key)}
                      onChange={(v) => setCatValue(c.key, v)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {draft.is_off_day && (
            <div className="px-5">
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground rounded-md border border-dashed border-border">
                <BedDouble className="size-8 opacity-20" />
                <p className="text-sm">No counts needed for an off day</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="px-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">
              Notes <span className="font-normal normal-case">(optional)</span>
            </p>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything worth noting about today…"
              maxLength={500}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-4 border-t border-border flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={save} disabled={upsert.isPending} className="flex-1 gap-1.5">
            <CalendarCheck className="size-4" />
            {upsert.isPending
              ? "Saving…"
              : draft.is_off_day
              ? weekend ? "Save weekend" : "Save off day"
              : total > 0
              ? `Save · ${total} docs`
              : "Save day"}
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}
