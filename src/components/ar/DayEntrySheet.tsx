import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isoDate, isWeekend, type DailyLog, type DailyLogInsert } from "@/types/log";
import { useUpsertLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { canonEntry } from "@/lib/log-utils";
import { Minus, Plus, CalendarCheck, BedDouble, CalendarIcon, TriangleAlert, PenLine } from "lucide-react";
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
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="size-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background" style={{ backgroundColor: color, "--tw-ring-color": color } as React.CSSProperties} />
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider font-heading"
          style={{ color, backgroundColor: withAlpha(color, 0.13) }}
        >
          {shortLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={dec}
          disabled={value === 0}
          aria-label={`Decrease ${label}`}
          className="size-9 sm:size-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation"
        >
          <Minus className="size-3.5" />
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
          className="w-14 h-9 sm:h-8 text-center text-sm font-bold tabular-nums bg-background border border-border rounded-lg outline-none transition-[border-color,box-shadow] focus:border-primary/50 focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color: value > 0 ? color : "hsl(var(--muted-foreground))" }}
        />
        <button
          type="button"
          onClick={inc}
          aria-label={`Increase ${label}`}
          className="size-9 sm:size-8 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors active:scale-90 touch-manipulation"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-foreground/60 uppercase tracking-[0.08em] font-heading flex items-center gap-2">
      {children}
    </p>
  );
}

export function DayEntrySheet({ open, onOpenChange, editing, existingDates }: Props) {
  const [draft, setDraft] = useState<DailyLogInsert>(() => emptyDraft());
  const [baseline, setBaseline] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const upsert = useUpsertLog();
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (!open) return;
    const next = editing
      ? {
          log_date: editing.log_date,
          counts: { ...editing.counts },
          is_off_day: editing.is_off_day,
          notes: editing.notes,
        }
      : emptyDraft();
    setDraft(next);
    setBaseline(canonEntry(next));
  }, [open, editing]);

  const dirty = canonEntry(draft) !== baseline;

  /** UI-dismiss path — intercepted when there are unsaved changes. */
  const requestClose = (o: boolean) => {
    if (!o && dirty && !upsert.isPending) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(o);
  };

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
      setConfirmClose(false);
      onOpenChange(false);
    } catch {
      // The mutation hook surfaces the error toast; keep the sheet open to retry.
    }
  };

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0 bg-sidebar font-sans"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !upsert.isPending) {
            e.preventDefault();
            void save();
          }
        }}
      >

        {/* ── Header ── */}
        <SheetHeader className="shrink-0 p-0 border-b border-border/60">
          <div className="flex items-center justify-between px-5 py-2 border-b border-border/40">
            <span className="font-mono text-[11px] font-medium tracking-wide text-foreground uppercase">Log Entry</span>
            <span
              className={`text-2xs font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border ${
                conflict
                  ? "bg-warning/15 text-warning border-warning/30"
                  : editing
                  ? "bg-muted text-muted-foreground border-border/40"
                  : "bg-info/15 text-info border-info/30"
              }`}
            >
              {conflict ? "Conflict" : editing ? "Editing" : "New entry"}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-4">
            <div className="space-y-1">
              <SheetTitle className="text-base font-bold">
                {editing ? "Edit log" : "Log a day"}
              </SheetTitle>
              <p className="text-xs text-foreground/60">
                {editing ? "Update counts for this day" : "Record your document counts"}
              </p>
            </div>
            {!draft.is_off_day && total > 0 && (
              <div className="shrink-0 text-right -mt-0.5">
                <div className="text-2xl font-bold tabular-nums text-foreground leading-none">{total}</div>
                <div className="text-[10px] text-foreground/40 uppercase tracking-[0.08em] mt-0.5 font-heading">total</div>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-5 space-y-5 animate-fade-in">

          {/* Date */}
          <div className="px-5 space-y-2.5">
            <SectionLabel>
              <CalendarIcon className="size-3" />
              Date
            </SectionLabel>
            <div className="flex gap-2">
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!!editing}
                    className="flex-1 h-10 justify-start text-left font-normal tabular-nums"
                  >
                    {format(parseISO(draft.log_date), "EEE, MMM d, yyyy")}
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

            {conflict && (
              <div className="flex items-start gap-2.5 text-xs rounded-lg px-3.5 py-2.5 bg-warning/[0.08] border border-warning/20">
                <TriangleAlert className="size-3.5 shrink-0 mt-0.5 text-warning" />
                <span className="text-foreground/80">A log already exists for this date. Saving overwrites it.</span>
              </div>
            )}
          </div>

          {/* Off-day toggle */}
          <div className="px-5">
            <div className={`flex items-center justify-between rounded-lg px-4 py-3 border transition-colors ${draft.is_off_day ? "bg-primary/[0.03] border-primary/15" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <BedDouble className={`size-4 shrink-0 transition-colors ${draft.is_off_day ? "text-primary/70" : "text-foreground/50"}`} />
                <div>
                  <p className={`text-sm font-semibold leading-none font-heading transition-colors ${draft.is_off_day ? "text-primary" : "text-foreground"}`}>
                    {weekend ? "Weekend" : "Off day"}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">{weekend ? "Saturday or Sunday" : "Leave, holiday, or sick day"}</p>
                </div>
              </div>
              <Switch
                checked={draft.is_off_day}
                onCheckedChange={(v) => update("is_off_day", v)}
                className={draft.is_off_day ? "data-[state=checked]:bg-primary" : undefined}
              />
            </div>
          </div>

          {/* Document counts */}
          {!draft.is_off_day && (
            <div className="space-y-2.5">
              <div className="px-5 flex items-center justify-between">
                <SectionLabel>
                  <span className="size-2 rounded-sm bg-primary/60" />
                  Document Counts
                </SectionLabel>
                {total > 0 && (
                  <span className="font-mono text-2xs uppercase tracking-[0.15em] text-muted-foreground tabular-nums">
                    {total} total
                  </span>
                )}
              </div>
              <div className="bg-card border-y border-border/60">
                {categories.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-center text-foreground/50">No categories set up yet. Add them in Settings.</p>
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
              <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-lg bg-muted/20 border border-border/60">
                <span className="size-10 rounded-xl bg-primary/[0.06] grid place-items-center">
                  <BedDouble className="size-5 text-foreground/25" />
                </span>
                <p className="text-sm text-foreground/50">No counts needed for an off day</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="px-5 space-y-2.5">
            <SectionLabel>
              <PenLine className="size-3" />
              Notes <span className="font-normal normal-case text-foreground/40">(optional)</span>
            </SectionLabel>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything worth noting about today…"
              maxLength={500}
              rows={3}
              className="resize-none text-sm bg-background"
            />
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-4 border-t border-border/60 flex gap-3">
          <Button variant="outline" onClick={() => requestClose(false)} className="flex-1 h-10">
            Cancel
          </Button>
          <Button onClick={save} disabled={upsert.isPending} className="flex-1 h-10 gap-2">
            <CalendarCheck className="size-4" />
            {upsert.isPending
              ? "Saving…"
              : draft.is_off_day
              ? weekend ? "Save weekend" : "Save off day"
              : total > 0
              ? `Save · ${total} docs`
              : "Save day"}
            <kbd className="ml-1 text-2xs border border-primary-foreground/30 rounded px-1 hidden sm:inline">Ctrl ↵</kbd>
          </Button>
        </div>

      </SheetContent>

      {/* Unsaved-changes guard */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The counts and notes you entered for this day haven't been saved yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
