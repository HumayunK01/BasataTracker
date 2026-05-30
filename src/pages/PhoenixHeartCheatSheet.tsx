import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ar/PageHeader";
import {
  BookOpen,
  ListChecks,
  StickyNote,
  FileText,
  Building2,
  Users,
  FlaskConical,
  Info,
  ChevronRight,
  AlertCircle,
  Search,
  X,
} from "lucide-react";

import {
  indexingTerms,
  cheatSheetNotes,
  docTypes,
  activeProviders,
  testsPerformed,
  formerProviders,
} from "@/lib/cheatsheet-data";

import {
  Workflow,
  SectionCard,
  DocTypeCard,
} from "@/components/ar/cheatsheet/DocComponents";

/** Returns `value` delayed by `delay` ms — collapses bursts of changes into one update. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const tocItems: { id: string; label: string }[] = [
  { id: "intro", label: "Introduction" },
  { id: "indexing-terms", label: "Indexing Terms" },
  { id: "notes", label: "Notes for Cheat Sheet" },
  { id: "doc-types", label: "Document Types (Workflows)" },
  { id: "additional-info", label: "PH Additional Information" },
  { id: "providers", label: "Provider List" },
  { id: "tests", label: "Tests Performed by PH" },
];

export default function PhoenixHeartCheatSheetPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const filteredDocTypes = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return docTypes;
    return docTypes.filter((doc) =>
      [doc.name, doc.indicators, doc.description, doc.types, ...doc.workflows]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [debouncedQuery]);

  return (
    <>
      <PageHeader subtitle="Phoenix Heart Cheat Sheet" />

      <main className="flex-1 overflow-y-auto font-[system-ui]">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Phoenix Heart Cheat Sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Standardized workflows for indexing and routing Phoenix Heart (PH) documents.
            </p>
          </div>

          {/* Table of Contents */}
          <SectionCard id="toc" icon={<BookOpen className="size-4 text-primary" />} title="User Guide Contents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm rounded-md border border-dashed border-border px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </SectionCard>

          {/* Introduction */}
          <SectionCard id="intro" icon={<Info className="size-4 text-primary" />} title="Introduction">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Basata</strong> is an AI-powered healthcare operations
              platform that streamlines administrative workflows through automation and intelligent task
              management. This cheat sheet complements the platform by standardizing workflows to ensure
              accuracy, consistency, and alignment across teams.
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
              <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80">
                <strong>Attn Phoenix Heart:</strong> The indicators and types are not limited to the
                examples provided under each document type below. Please feel free to add as needed.
              </p>
            </div>
          </SectionCard>

          {/* Indexing Terms */}
          <SectionCard
            id="indexing-terms"
            icon={<ListChecks className="size-4 text-primary" />}
            title="Indexing Terms or Breakdown"
          >
            <div className="space-y-2">
              {indexingTerms.map((t) => (
                <div key={t.term} className="rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3">
                  <span className="text-sm font-semibold">{t.term}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Notes for Cheat Sheet */}
          <SectionCard
            id="notes"
            icon={<StickyNote className="size-4 text-primary" />}
            title="Notes for Cheat Sheet"
          >
            <ul className="space-y-1.5">
              {cheatSheetNotes.map((note) => (
                <li key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-2" />
                  <span className="leading-relaxed">{note}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground/70">Workflow format example</p>
              <Workflow chain="EMR Document Type → Incoming, Visit, or Collected → Facility/ or Pharmacy/ → Task Assignee → Priority or HIGH → F&T" />
            </div>
          </SectionCard>

          {/* Document Types */}
          <SectionCard
            id="doc-types"
            icon={<FileText className="size-4 text-primary" />}
            title="Document Types (Workflows)"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search document types, indicators, workflows…"
                className="w-full rounded-md border border-border bg-background pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  title="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {filteredDocTypes.length} of {docTypes.length} document {docTypes.length === 1 ? "type" : "types"}
            </p>

            {filteredDocTypes.length > 0 ? (
              <div className="space-y-2.5">
                {filteredDocTypes.map((doc) => (
                  <DocTypeCard key={doc.name} doc={doc} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-10 text-center">
                <Search className="size-5 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No document types match <span className="font-medium text-foreground">"{debouncedQuery}"</span>
                </p>
              </div>
            )}
          </SectionCard>

          {/* Additional Information */}
          <SectionCard
            id="additional-info"
            icon={<Building2 className="size-4 text-primary" />}
            title="Phoenix Heart — Additional Information"
          >
            <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide">Banner Health & Abrazo Facilities</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only keep documents that are imaging/radiology (from Banner Imaging) or have a PH
                letterhead included. These follow the workflow for <strong>Imaging</strong>. All other
                document types from these facilities (e.g., labs, H&Ps) are archived.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide">ROI Workflow Updates</span>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 leading-relaxed">
                <li>Review{"—"}provider&#39;s name but no patient found, then fax back &quot;patient not found&quot;</li>
                <li>
                  Athena: clinical docs labeled &quot;record of care - referrals&quot; not found in Athena are
                  treated as a new patient. Ask Ayub or Chandni{"—"}patient might not be transferable to
                  NextGen from Athena since it is in view-only mode
                </li>
                <li>
                  Rule of thumb for patient inactivity: not scheduled within 3 years → inactive until
                  they reschedule
                </li>
                <li>
                  Patient found in Athena and NextGen but no current provider → ask Valerie; Both EMR,
                  close them to the chart
                </li>
              </ul>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide">Test No Longer Performed by PH</span>
              <p className="text-xs text-muted-foreground">Renal artery US</p>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
              <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                This portion is still under construction.
              </p>
            </div>
          </SectionCard>

          {/* Provider List */}
          <SectionCard
            id="providers"
            icon={<Users className="size-4 text-primary" />}
            title="Provider List"
          >
            <div>
              <p className="text-xs font-semibold text-foreground/70 mb-2">Active Providers</p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <th className="px-3 py-2 font-medium">Provider</th>
                      <th className="px-3 py-2 font-medium">Assigned NP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProviders.map((p) => (
                      <tr key={p.name} className="border-t border-border">
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.np}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground/70 mb-2">Providers No Longer with PH</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["MD", formerProviders.md],
                    ["NP", formerProviders.np],
                    ["PA", formerProviders.pa],
                    ["DNP", formerProviders.dnp],
                  ] as [string, string[]][]
                ).map(([role, list]) => (
                  <div key={role} className="rounded-md border border-border bg-muted/20 p-3 space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{role}</span>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {list.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Tests Performed */}
          <SectionCard
            id="tests"
            icon={<FlaskConical className="size-4 text-primary" />}
            title="Tests Performed at Phoenix Heart"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {testsPerformed.map((test) => (
                <div
                  key={test}
                  className="flex items-center gap-2 text-sm rounded-md border border-dashed border-border px-3 py-2"
                >
                  <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>{test}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 italic">Note: this portion is still under construction.</p>
          </SectionCard>

          {/* Footer */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3">
            <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Indicators and types are examples, not an exhaustive list. When in doubt, route to Staff
              EHR and flag for review.
            </p>
          </div>

        </div>
      </main>
    </>
  );
}
