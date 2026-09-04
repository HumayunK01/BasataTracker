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

export interface WhatsNewEntry {
  id: string;
  date: string; // ISO yyyy-MM-dd
  title: string;
  description: string;
  body: ReactNode[];
}

// ── Entries (newest first) ────────────────────────────────────────────────
// ponytail: entries are hand-written in code; a release adds one on top.
// Read receipts live in the whats_new_reads table so they follow the user
// across devices; only the auto-open "once" guard stays on this device.
const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    id: "whats-new-panel",
    date: "2026-09-03",
    title: "See what's new, right in the app",
    description:
      "A new bell icon in the top bar shows you what's changed: updates to your practice's setup and improvements across Basata Tracker.",
    body: [
      <>Until now, when something changed, you may not have heard about it.</>,
      <>Click the bell in the top bar to open the What's New panel and catch up on what changed.</>,
      <>
        Unread items show a dot next to them. Opening one marks it read for you only, so on a
        shared workstation you won't clear your colleagues' list, and your read state follows you
        to any computer you sign in from.
      </>,
      <>
        The first time there's something new for you, the panel opens on its own, once. After that
        it stays out of the way until there's something newer. Your work stays visible behind it,
        and closing it puts you right back where you were.
      </>,
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
}: {
  entry: WhatsNewEntry;
  unread: boolean;
  isNew: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border/60 bg-card rounded-md p-4 space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
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
      {expanded && entry.body.length > 0 && (
        <div className="space-y-3 pt-1 text-sm text-foreground/80 leading-relaxed">
          {entry.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{shortDate(entry.date)}</p>
    </div>
  );
}

export function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: reads = [], isSuccess: readsLoaded } = useWhatsNewReads();
  const markRead = useMarkWhatsNewRead();

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
        className="relative size-9 md:size-8 text-foreground hover:text-foreground/80 rounded-md [&_svg]:!size-[18px] md:[&_svg]:!size-5"
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
        <SheetContent side="right" className="p-0 gap-0 flex flex-col">
          <SheetHeader className="p-5 pb-4 border-b border-border/60 space-y-2">
            <SheetTitle className="text-base">What's new</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Here's what changed recently.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-5 space-y-6">
            {groupEntriesByDate(WHATS_NEW_ENTRIES).map(([date, entries]) => (
              <section key={date} className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                  {longDate(date)}
                </h3>
                {entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    unread={!reads.includes(entry.id)}
                    isNew={entry.id === WHATS_NEW_ENTRIES[0].id && !reads.includes(entry.id)}
                    expanded={expandedId === entry.id}
                    onToggle={() => toggleEntry(entry.id)}
                  />
                ))}
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}