import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Bell, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWhatsNewReads, useMarkWhatsNewRead } from "@/hooks/useWhatsNewReads";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export interface WhatsNewEntry {
  id: string;
  date: string; // ISO yyyy-MM-dd
  title: string;
  description: string;
  body: ReactNode[];
}

// ── Entries (newest first) ────────────────────────────────────────────────
const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    id: "version-1-3-1-themes",
    date: "2026-09-10",
    title: "Modern & Legacy Theme",
    description:
      "Seamlessly switch between our sleek Modern Theme and the familiar Legacy Theme, with full Light Mode support across all views.",
    body: [
      (
        <>
          <strong className="text-foreground font-semibold">Theme Switching:</strong> Click the palette icon in the top navigation bar to switch between our sleek <strong className="text-foreground font-semibold">Modern Theme</strong> and the familiar <strong className="text-foreground font-semibold">Legacy Theme</strong>.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Full Light Mode Support:</strong> High-clarity light mode across both themes featuring crisp white canvases, clean table headers, and distraction-free contrast.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Unified Navigation:</strong> Standardized logo sizing, streamlined layout, and responsive controls across the entire workspace.
        </>
      ),
    ],
  },
  {
    id: "whats-new-panel",
    date: "2026-09-03",
    title: "See what's new, right in the app",
    description:
      "A new bell icon in the top bar shows you what's changed — both updates to your practice's setup and improvements across Basata.",
    body: [
      <>Until now, when something changed, you may not have heard about it.</>,
      (
        <>
          Click the bell in the top bar to open the <em>What&apos;s New</em> panel. It has two tabs:
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">For your team</strong> — changes specific to your practice, like a new view or a change to one of your workflows.
        </>
      ),
      (
        <>
          <strong className="text-foreground font-semibold">Across Basata</strong> — improvements that go out to everyone using Basata.
        </>
      ),
      (
        <>
          Unread items show a dot next to them. Opening one marks it read for you only, so on a shared workstation you won&apos;t clear your colleagues&apos; list — and your read state follows you to any computer you sign in from.
        </>
      ),
      (
        <>
          The first time there&apos;s something new for you, the panel opens on its own, once. After that it stays out of the way until there&apos;s something newer. Your work stays visible behind it, and closing it puts you right back where you were.
        </>
      ),
    ],
  },
  {
    id: "facilities-verified-addresses",
    date: "2026-09-01",
    title: "Facilities: verified and addressed",
    description: "You can now mark facilities as verified and keep their addresses on file.",
    body: [
      <>Verified facilities show a badge, so the team knows the details were checked.</>,
      <>Addresses appear neatly formatted on the facility card.</>,
    ],
  },
  {
    id: "fresh-look",
    date: "2026-08-28",
    title: "A fresh look",
    description: "New app logo and icons across Basata Tracker.",
    body: [],
  },
  {
    id: "entries-auto-save",
    date: "2026-08-20",
    title: "Entries save themselves",
    description: "Your entries save automatically as you work, so nothing gets lost.",
    body: [
      <>Keep typing or tapping as usual. Changes are stored on their own, no save button needed.</>,
    ],
  },
  {
    id: "faxed-back-faster",
    date: "2026-08-10",
    title: "Faxed Back, faster",
    description: "The Faxed Back page now loads faster, even with lots of documents.",
    body: [],
  },
];

export function unreadIds(entries: WhatsNewEntry[], read: string[]): string[] {
  return entries.filter((e) => !read.includes(e.id)).map((e) => e.id);
}

export function groupEntriesByDate(entries: WhatsNewEntry[]): [string, WhatsNewEntry[]][] {
  const groups = new Map<string, WhatsNewEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.date);
    if (list) list.push(entry);
    else groups.set(entry.date, [entry]);
  }
  return [...groups.entries()];
}

// Auto-open guard is per device: the panel opens on its own once per release
// batch, even if the user closed it without reading. Read state itself is
// server-side, so the badge stays accurate everywhere.
const AUTO_OPEN_KEY = "whats_new_auto_opened";

function readAutoOpened(): string {
  try {
    return localStorage.getItem(AUTO_OPEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeAutoOpened(id: string) {
  try {
    localStorage.setItem(AUTO_OPEN_KEY, id);
  } catch {
    // storage blocked: the panel may reopen next visit, harmless
  }
}

function longDate(iso: string): string {
  return format(new Date(`${iso}T12:00:00Z`), "d MMMM yyyy").toUpperCase();
}

function shortDate(iso: string): string {
  return format(new Date(`${iso}T12:00:00Z`), "MMM d");
}

function EntryCard({
  entry,
  unread,
  isNew,
  expanded,
  onToggle,
  isClassic,
}: {
  entry: WhatsNewEntry;
  unread: boolean;
  isNew: boolean;
  expanded: boolean;
  onToggle: () => void;
  isClassic: boolean;
}) {
  if (isClassic) {
    return (
      <div className="border border-border/60 bg-card rounded-md p-4 space-y-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center gap-2 text-left cursor-pointer"
        >
          <Sparkles className="size-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-sm font-semibold text-foreground">{entry.title}</span>
          {isNew ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-blue-500 text-white px-1.5 py-0.5 rounded">
              New
            </span>
          ) : (
            unread && <span className="shrink-0 size-2 rounded-full bg-blue-500" aria-label="Unread" />
          )}
          {expanded ? (
            <ChevronDown className="ml-auto size-4 text-muted-foreground shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="ml-auto size-4 text-muted-foreground shrink-0" aria-hidden />
          )}
        </button>
        <p className="text-sm text-foreground/70 leading-relaxed">{entry.description}</p>
        <p className="text-xs text-muted-foreground">{shortDate(entry.date)}</p>
        {expanded && entry.body.length > 0 && (
          <div className="space-y-3 pt-1 text-sm text-foreground/80 leading-relaxed">
            {entry.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Modern Theme (Ditto to screenshot)
  return (
    <div className="border border-border dark:border-white/10 bg-slate-50/70 dark:bg-[#1e2634]/60 rounded-lg p-3.5 sm:p-4 space-y-2.5 transition-colors hover:border-slate-300 dark:hover:border-white/15">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left group cursor-pointer"
      >
        <Sparkles className="size-3.5 text-slate-400 shrink-0" aria-hidden />
        <span className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white tracking-tight">{entry.title}</span>
        {isNew ? (
          <span className="shrink-0 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-white/10 dark:text-slate-300 px-1.5 py-0.5 rounded">
            New
          </span>
        ) : (
          unread && <span className="shrink-0 size-1.5 rounded-full bg-primary" aria-label="Unread" />
        )}
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 text-slate-400 shrink-0 transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90 opacity-70 group-hover:opacity-100"
          )}
          aria-hidden
        />
      </button>
      <p className="text-xs text-slate-600 dark:text-slate-300/85 leading-relaxed">{entry.description}</p>
      <p className="text-[11px] text-muted-foreground/70">{shortDate(entry.date)}</p>
      {expanded && entry.body.length > 0 && (
        <div className="space-y-2.5 pt-0.5 text-xs text-slate-600 dark:text-slate-300/85 leading-relaxed">
          {entry.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(WHATS_NEW_ENTRIES[0].id);
  const { data: reads = [], isSuccess: readsLoaded } = useWhatsNewReads();
  const markRead = useMarkWhatsNewRead();
  const { variant } = useTheme();
  const isClassic = variant === "classic";

  const unread = unreadIds(WHATS_NEW_ENTRIES, reads);
  const hasNew = unread.length > 0 && !open;

  // Auto-open once: only when there is something unread and this device has
  // not auto-opened for the newest entry yet.
  useEffect(() => {
    if (!readsLoaded || unread.length === 0) return;
    const newest = WHATS_NEW_ENTRIES[0].id;
    if (readAutoOpened() === newest) return;
    setOpen(true);
    writeAutoOpened(newest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once reads first arrive
  }, [readsLoaded, reads]);

  const toggleEntry = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
    if (!reads.includes(id)) markRead.mutate(id);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative size-8 text-foreground hover:text-foreground/80 hover:bg-slate-100 dark:hover:bg-[#384152]/60 rounded-md [&_svg]:!size-5"
        onClick={() => setOpen(true)}
        title="What's new"
        aria-label="What's new"
      >
        <Bell />
        {hasNew && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" aria-hidden />
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "p-0 gap-0 flex flex-col",
            isClassic
              ? "bg-card sm:max-w-sm"
              : "bg-white border-l border-border dark:bg-[#18212f] dark:border-white/10 sm:max-w-[400px]"
          )}
        >
          {isClassic ? (
            <SheetHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 space-y-1.5">
              <SheetTitle className="text-sm font-semibold">What's new</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Here's what changed recently.
              </SheetDescription>
            </SheetHeader>
          ) : (
            <SheetHeader className="px-5 py-4 border-b border-border dark:border-white/10 space-y-1">
              <SheetTitle className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white tracking-tight">
                What's New
              </SheetTitle>
            </SheetHeader>
          )}

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {groupEntriesByDate(WHATS_NEW_ENTRIES).map(([date, entries]) => (
              <section key={date} className="space-y-2.5">
                {isClassic ? (
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1.5">
                    {longDate(date)}
                  </h3>
                ) : (
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2">
                    {longDate(date)}
                  </h3>
                )}
                {entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    unread={!reads.includes(entry.id)}
                    isNew={entry.id === WHATS_NEW_ENTRIES[0].id && !reads.includes(entry.id)}
                    expanded={expandedId === entry.id}
                    onToggle={() => toggleEntry(entry.id)}
                    isClassic={isClassic}
                  />
                ))}
              </section>
            ))}
          </div>

          {!isClassic && (
            <div className="border-t border-border dark:border-white/10 px-5 py-2.5 text-[11px] text-muted-foreground/60 shrink-0">
              Showing the last 45 days
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

