import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ar/PageHeader";
import {
  BookOpen,
  Tag,
  FileText,
  Users,
  Info,
  AlertCircle,
  Phone,
  Printer,
  MapPin,
  ClipboardList,
  Contact,
  Search,
  X,
} from "lucide-react";

import {
  inboxLabels,
  roiRows,
  indexingRows,
  assignedTasks,
  employeeList,
} from "@/lib/help-data";

import {
  CopyButton,
  SectionCard,
  PatientRow,
} from "@/components/ar/help/HelpComponents";

export default function HelpPage() {
  const [search, setSearch] = useState("");

  const filteredLabels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inboxLabels;
    return inboxLabels.filter((label) => label.toLowerCase().includes(q));
  }, [search]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignedTasks;
    return assignedTasks.filter((person) =>
      person.name.toLowerCase().includes(q) ||
      person.tasks.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <>
      <PageHeader subtitle="Inbox Cheat Sheet" />

      <main className="flex-1 overflow-y-auto font-[system-ui]">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Title and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">Inbox Cheat Sheet</h1>
              <p className="text-sm text-muted-foreground mt-1">Reference for labeling and indexing incoming documents correctly.</p>
            </div>
            {/* Search Lookup */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search labels or tasks…"
                className="w-full rounded-lg border border-border/60 bg-background pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary/20 transition-all font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Phoenix Heart Info */}
          <SectionCard icon={<Contact className="size-4 text-primary" />} title="Phoenix Heart Info">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/[0.04] px-3.5 py-3">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-medium mt-0.5">(623) 915-6058</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/[0.04] px-3.5 py-3">
                <Printer className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fax</p>
                  <p className="text-sm font-medium mt-0.5">(623) 930-6060</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/[0.04] px-3.5 py-3">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Address</p>
                  <p className="text-sm text-muted-foreground/60 italic mt-0.5 font-normal">Not provided</p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Assigned Tasks */}
          <SectionCard icon={<ClipboardList className="size-4 text-primary" />} title="Assigned Tasks">
            <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3.5 py-3">
              <Users className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs font-medium">
                <span className="text-foreground font-semibold">Everybody:</span>{" "}
                <span className="text-muted-foreground">ROI, Cath Lab, EKGs — Help with other trained document types as needed</span>
              </p>
            </div>
            <div className="space-y-2">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((person) => (
                  <div key={person.name} className="rounded-xl border border-border/40 bg-muted/[0.04] px-3.5 py-3.5 space-y-1 hover:border-border/60 transition-colors">
                    <span className="text-sm font-semibold text-foreground/90">{person.name}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed font-normal">{person.tasks}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground/60 italic py-2">No assigned tasks match search term.</p>
              )}
            </div>
          </SectionCard>

          {/* Test Patients */}
          <SectionCard icon={<Users className="size-4 text-primary" />} title="Test Patients & Document Types">
            <div className="space-y-3">
              <PatientRow name="Test Pt 1: Test, Back Office" docType="Back Office" dob="01/01/2001">
                <span className="font-semibold text-foreground/80">Message to providers</span> — documents with no patient information that only address the provider.
                If there is no provider, <span className="font-semibold text-foreground/80">Khan</span> will be the default provider.
                Once the document is in indexing, follow the admin workflow on the <span className="font-semibold text-foreground/80">PH cheat sheet</span>.
              </PatientRow>

              <PatientRow name="Test Pt 2: Test, Medical Record" docType="Medical Record" dob="02/02/2002">
                <span className="font-semibold text-foreground/80">ROI Multi pts</span> — use this patient for release-of-information documents that span multiple patients.
              </PatientRow>

              <PatientRow name="Test Pt 3: Test, Credit Card" docType="Credit Card" dob="03/03/2003">
                <span className="font-semibold text-foreground/80">Assign to Kellie Chavez.</span> Use for:
                <ul className="list-disc list-inside mt-1.5 space-y-0.5">
                  <li>Zelis</li>
                  <li>United Healthcare</li>
                  <li>Optum Financial</li>
                  <li>Other documents with patient payment — will either have a credit card image or use verbiage such as <em>payment transmittal</em></li>
                </ul>
              </PatientRow>
            </div>
          </SectionCard>

          {/* Inbox Labeling */}
          <SectionCard icon={<Tag className="size-4 text-primary" />} title="Inbox Labeling">
            <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3.5 py-2.5">
              <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-semibold">Use the following words exactly. No deviations.</p>
            </div>
            
            {filteredLabels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredLabels.map((label) => {
                  const main = label.replace(/\s*\(.*?\)/g, "").trim();
                  const note = label.match(/\(([^)]+)\)/)?.[1] ?? null;
                  return (
                    <div key={label} className="flex items-center gap-2 text-sm rounded-xl border border-dashed border-border/60 hover:bg-muted/[0.04] px-3.5 py-2.5 min-w-0 transition-colors">
                      <span className="size-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-foreground/90">{main}</span>
                        {note && (
                          <span className="block sm:inline text-[10px] text-muted-foreground/60 sm:ml-1.5 italic font-normal truncate sm:whitespace-normal">
                            {note}
                          </span>
                        )}
                      </span>
                      <CopyButton text={label} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic py-2">No inbox labels match search term.</p>
            )}
          </SectionCard>

          {/* ROI Category */}
          <SectionCard icon={<FileText className="size-4 text-primary" />} title="Inbox Labeling — ROI Category">
            <div className="space-y-2">
              {roiRows.map((row) => (
                <div key={row.label} className="flex flex-col xs:flex-row xs:items-center gap-2 rounded-xl border border-border/40 bg-muted/[0.04] p-3.5 hover:border-border/60 transition-all">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit shrink-0 border ${row.color}`}>{row.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{row.desc}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Indexing Labeling */}
          <SectionCard icon={<BookOpen className="size-4 text-primary" />} title="Indexing Labeling">
            <div className="space-y-3">
              {indexingRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-border/40 bg-muted/[0.04] p-3.5 space-y-1.5 hover:border-border/60 transition-all">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{row.label}</span>
                  <p className="text-xs text-muted-foreground font-normal leading-relaxed">{row.desc}</p>
                  <code className="block text-xs bg-muted border border-border/40 rounded-lg px-2.5 py-1.5 font-mono text-foreground/80 mt-2 break-all sm:break-normal font-normal">
                    {row.format}
                  </code>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Employee List */}
          <SectionCard icon={<Contact className="size-4 text-primary" />} title="Employee List">
            <div className="space-y-2">
              {employeeList.map((emp) => (
                <div key={emp.email} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/[0.04] p-3.5 hover:border-border/60 transition-all">
                  <span className="text-sm font-semibold text-foreground/90">{emp.name}</span>
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{emp.role}</span>
                  <a href={`mailto:${emp.email}`} className="text-xs font-normal text-primary underline underline-offset-2 hover:opacity-80 ml-auto break-all">
                    {emp.email}
                  </a>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Info footer */}
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
            <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              For admin workflow details, refer to the{" "}
              <a
                href="https://docs.google.com/document/d/1C0aKOgsXKyU0XzDUB2oPnxaW0QUhUDSppSiL81JEvr8/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
              >
                PH cheat sheet
              </a>. When in doubt, assign to the default provider (Khan) and flag for review.
            </p>
          </div>

        </div>
      </main>
    </>
  );
}
