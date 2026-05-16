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

/** Returns `value` delayed by `delay` ms — collapses bursts of changes into one update. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SectionCard({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-4 scroll-mt-20">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Renders an arrow-separated workflow chain as pill segments. */
function Workflow({ chain }: { chain: string }) {
  const parts = chain.split("→").map((p) => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="text-xs font-medium bg-muted text-foreground/80 rounded px-2 py-1">
            {part}
          </span>
          {i < parts.length - 1 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          )}
        </span>
      ))}
    </div>
  );
}

interface DocType {
  name: string;
  indicators?: string;
  description?: string;
  workflows: string[];
  types?: string;
  notes?: React.ReactNode;
}

function DocTypeCard({ doc }: { doc: DocType }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-2">
      <span className="text-sm font-bold uppercase tracking-wide">{doc.name}</span>
      {doc.indicators && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/70">Indicators:</span> {doc.indicators}
        </p>
      )}
      {doc.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/70">Description:</span> {doc.description}
        </p>
      )}
      {doc.workflows.map((wf, i) => (
        <Workflow key={i} chain={wf} />
      ))}
      {doc.notes && (
        <div className="text-xs text-muted-foreground leading-relaxed mt-1">{doc.notes}</div>
      )}
      {doc.types && (
        <p className="text-xs text-muted-foreground/70 italic">
          <span className="font-semibold not-italic">Types:</span> {doc.types}
        </p>
      )}
    </div>
  );
}

const indexingTerms: { term: string; desc: string }[] = [
  { term: "EMR Document Type", desc: "The document types" },
  {
    term: "DOS",
    desc: "Date of Service — either the date the fax was received or the date pertaining to the patient's encounter",
  },
  { term: "PAQ Provider", desc: "Documents that require a doctor's signature — PAQ Provider" },
  { term: "Description", desc: "Include the facility name and any relevant details" },
  {
    term: "Task Assignee",
    desc: "Indicates where the document should be routed. Most common assignee is Provider Staff EHR (group). Any other assignee will be specified on the workflow for that document type",
  },
  {
    term: "Task Priority",
    desc: "Set based on urgency noted on the document. If document type is always high priority, mark as HIGH; otherwise, follow what is specified",
  },
  { term: "Task Description", desc: "Include any special notes related to the document" },
  {
    term: "File Document",
    desc: "Only for documents sent directly to provider for review and/or signature",
  },
  {
    term: "File and Task",
    desc: "Documents sent to back office provider staff. Any documents mentioning APP names (NPs or PAs) are routed to their assigned provider staff (Provider Staff EHR Group)",
  },
];

const cheatSheetNotes: string[] = [
  "Workflows appear in bold",
  "DOS: shown as Incoming (for incoming faxes) or Visit/Collected (for patient encounter date)",
  "PAQ Provider: shown as PAQ",
  "Task Assignee: Provider Staff EHR Group will be Staff EHR",
  "Task Priority: shown as Priority (if normal) and HIGH (for urgent docs)",
  "File and Task: shown as F&T",
  "Not all workflows are needed for each document. This cheat sheet will specify when needed",
];

const docTypes: DocType[] = [
  {
    name: "Admin",
    indicators:
      "Fillable forms for provider, INR notifications (make priority HIGH), messages about prescriptions, Peer to Peer",
    workflows: ["Type → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "examples needed",
  },
  {
    name: "Approval — Insurance",
    indicators: "Insurance approvals that are not related to procedures",
    workflows: ["Insurance Approval → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Approval — Procedure",
    indicators: "Insurance approval related to procedure orders",
    workflows: ["Insurance Approval - Procedure → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Blood Pressure Log",
    indicators: "Patient's BP logs",
    workflows: ["Blood Pressure Log → Collected (most recent) → Facility → Staff EHR → Priority → File Document"],
  },
  {
    name: "Cardiac Clearance",
    indicators: "Preoperative test, surgical clearance, blood thinner/medication pause",
    workflows: ["Cardiac Clearance → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "Banner Health",
  },
  {
    name: "Cardiac Rehabilitation Forms",
    indicators: "Rehab forms and orders",
    workflows: ["Cardiac Rehabilitation → Incoming → Facility → Staff EHR → F&T"],
    types: "Banner Thunderbird Medical Center",
  },
  {
    name: "Cardiac Rehabilitation Reports",
    indicators: "Rehab reports and notifications",
    workflows: ["Cardiac Rehabilitation → Session Visit → Facility/Session# → PAQ Provider → Priority → File Document"],
    types: "Banner Thunderbird Medical Center",
  },
  {
    name: "Cardiac CT/CTA Order (Additional Information Needed)",
    indicators: "Order requesting records or additional information, or further action required",
    workflows: ["Cardiac CT/CTA Order → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "SimeonMed",
  },
  {
    name: "Cardiac CT/CTA Order",
    indicators: "Order with no further action needed (depending on PH testing)",
    workflows: ["Cardiac CT/CTA Order → Incoming → Facility → Scheduling EHR-PM → F&T"],
    types: "SimeonMed",
  },
  {
    name: "Cardiac CT/CTA Report",
    workflows: ["Cardiac CT/CTA Report → Visit → Facility → PAQ Provider → Priority → File Document"],
    types: "Banner Health, SimeonMed",
  },
  {
    name: "Cardiology Order",
    indicators:
      "MRI pacemaker clearance, verbiage regarding device manufacturer for pacemakers; cardiology form attached",
    workflows: ["External order → Incoming → Facility → Device Clinic → Priority → F&T"],
    types: "Banner Health, SimeonMed",
  },
  {
    name: "Denial — Insurance",
    indicators: "Insurance denials that are not related to labs, medication, or procedures",
    workflows: ["Insurance Denial → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Denial — Labs",
    indicators: "Insurance denial related to labs",
    workflows: ["Insurance Denial - Labs → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Denial — Medication",
    indicators: "Insurance denial related to medications",
    workflows: ["Insurance Denial - Medication → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Denial — Procedure",
    indicators: "Insurance denial related to procedure orders",
    workflows: ["Insurance Denial - Procedure → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "DME Order",
    indicators: "Medical supplies or equipment",
    workflows: ["External Order → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "ECG/EKG (External)",
    indicators: "EKG from outside facilities",
    workflows: ["EKG → Collected → Facility → PAQ Provider → Priority → File Document"],
  },
  {
    name: "ECG/EKG (Internal)",
    indicators: "EKGs from Phoenix Heart",
    workflows: ["Internal EKG → Collected → Facility → Priority → File Document"],
  },
  {
    name: "External Imaging Order Scheduling",
    indicators:
      "Imaging order with patient scheduled notation at end of order, SimonMed saying they scheduled the patient, Livwell infusions or infusion scheduling",
    workflows: ["External imaging order scheduling → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "Banner Health",
  },
  {
    name: "External Orders",
    indicators: "Lab orders, procedure orders",
    workflows: ["External Order → Incoming → Facility → Scheduling EHR-PM → Priority → F&T"],
  },
  {
    name: "External Records (Notifications)",
    indicators: "Patient unreachable notification",
    workflows: ["Admin → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "Banner Imaging",
  },
  {
    name: "External Records",
    indicators:
      "Multiple records combined in one document (e.g., H&P w/ labs, imaging, consult notes), hospital records, records including PH letterhead, Anatomic Pathology Report",
    workflows: ["External Records → Visit (most recent) → Facility/Type of Record → PAQ Provider → Priority → File Document"],
  },
  {
    name: "Home Health",
    indicators: "Documents from home health facilities",
    workflows: ["Admin → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Hospice (Death Notification)",
    indicators: "Documents from hospice notifying of patient's death",
    workflows: ["Hospice Death Notification → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "Hospice of the Valley",
  },
  {
    name: "Hospice Care Plan",
    indicators: "Admission and plan of care info",
    workflows: ["Hospice Care Plan → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "Hospice of the Valley, AZ Supportive Care",
  },
  {
    name: "Imaging",
    indicators: "Radiology reports",
    workflows: ["Imaging → Collected → Facility → PAQ Provider → Priority → File Document"],
    types: "CT scans",
  },
  {
    name: "Imaging Orders",
    indicators: "Orders performed by PH (need entire list)",
    workflows: ["Imaging Order → Incoming → Facility → Scheduling EHR-PM → Priority → F&T"],
    types: "Veterans Evaluation Services",
  },
  {
    name: "INR",
    indicators: "INR, coagulation",
    workflows: ["INR → Collected (most recent) → Facility/INR + Value (most recent collected) → Staff EHR → HIGH → F&T"],
    types: "Labcorp, Acelis, CCL, Sonora Quest",
  },
  {
    name: "INR Prescription",
    indicators: "INR orders or forms related to document type",
    workflows: ["INR → Incoming → Facility → Staff EHR → HIGH → Priority → F&T"],
    types: "Labcorp, Acelis, CCL, Sonora Quest",
  },
  {
    name: "Insurance Prior Authorization (Cancellation)",
    indicators: "Letter from insurance mentioning cancellation of authorization",
    workflows: ["Insurance Prior Authorization Cancellation → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Lab Correspondence",
    indicators: "Messages from the lab to provider or staff",
    workflows: ["Lab Correspondence → Incoming → Facility → Staff EHR → Priority → File Document"],
    types: "Labcorp",
  },
  {
    name: "Labs",
    indicators: "Standalone labs (no other document types attached)",
    workflows: ["Lab Results → Collected (most recent) → Facility → PAQ Provider → Priority → File Document"],
    types: "Labcorp",
  },
  {
    name: "Notifications (FYI to Provider)",
    indicators: "Messages sent to provider, advertisement (Dr Khan is default provider)",
    workflows: ["Admin → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Progress Note",
    workflows: ["Progress Note → Visit → Facility → PAQ Provider → Priority → File Document"],
    types: "Ironwood Cancer & Research Centers",
  },
  {
    name: "Provider Forms (Fillable Forms)",
    indicators: "Fillable form for providers (except insurance, underwriting, disability docs)",
    workflows: ["Admin → Incoming → Facility → Staff EHR → Priority → F&T"],
    types: "Chronic Condition Verification",
  },
  {
    name: "Returned Correspondence",
    indicators: "Note stating wrong office or faxed by error",
    notes: (
      <ul className="list-disc list-inside space-y-0.5">
        <li>If facility sent fax by error → fax back to facility</li>
        <li>If PH sent fax by error or to wrong fax# then follow the workflow below</li>
      </ul>
    ),
    workflows: ["Admin → Incoming → Facility → Staff EHR → Priority → Add note to Task Description → F&T"],
  },
  {
    name: "Rx Notes",
    description: "Enter the pharmacy name",
    notes: (
      <p>
        If not the first request, set priority to <strong>HIGH</strong> and add a note in the Task
        Description (e.g., <em>Second request</em>). Common pharmacies: Walgreens, CoverMyMeds, CVS,
        Costco, Optum
      </p>
    ),
    workflows: [],
  },
  {
    name: "Rx Authorization",
    indicators: "Authorization will be listed on document",
    workflows: ["Prescription Prior Authorization → Incoming → Pharmacy → Staff EHR → Priority → F&T"],
  },
  {
    name: "Rx Change",
    indicators: "Rx needs changed",
    workflows: ["Prescription Change → Incoming → Pharmacy → Staff EHR → Priority → F&T"],
  },
  {
    name: "Rx Denial",
    indicators: "Insurance letter regarding denial of drug coverage",
    workflows: ["Insurance Denial - Medication → Incoming → Facility → Staff EHR → Priority → F&T"],
  },
  {
    name: "Rx Correspondence",
    indicators: "Clarification request, alternative request",
    workflows: ["Prescriptions → Incoming → Pharmacy → Staff EHR → Priority → F&T"],
  },
  {
    name: "Rx Refill",
    indicators: "Refill request, new prescription (if not prior auth)",
    workflows: ["Prescription Renewal → Incoming → Pharmacy → Staff EHR → Priority → F&T"],
  },
  {
    name: "Sleep Study",
    indicators: "Sleep study reports, orders",
    workflows: ["Sleep Study → Visit → Facility → PAQ Provider → Priority → F&T"],
    types: "Valley Sleep Center",
  },
  {
    name: "Virtual Credit Card",
    indicators: "Credit card image, electronic payment, ePayment transmittal",
    workflows: ["VCC → Facility → Kellie Chavez → F&T"],
    types: "Zelis, Optum Financial",
  },
];

const activeProviders: { name: string; np: string }[] = [
  { name: "Al Rabadi, Oday", np: "N/A" },
  { name: "Dizon, Kenneth", np: "N/A" },
  { name: "Gomes, Reshmaal", np: "Hock, Dana" },
  { name: "Khan, Shakeelosman", np: "Muchow (Hickman), Shawna" },
  { name: "Lazkani, Mohamed", np: "N/A" },
  { name: "Parasher, Punit", np: "Witbeck NP" },
  { name: "Patel, Rajul", np: "Barker, Kristen" },
  { name: "Sellberg, Kristine", np: "Walter, Olivia" },
];

const testsPerformed: string[] = [
  "Ankle Brachial Index",
  "ECG Stress Testing",
  "Lower Extremity Arterial Duplex",
  "Upper Extremity Venous Duplex",
  "AV Optimization",
  "Echocardiogram",
  "Lower Extremity Venous Duplex",
  "Wireless Telemetry",
  "Bubble Study",
  "Event Monitor",
  "Nuclear Perfusion Stress Test",
  "Cardiac Stress Test / PET",
  "Carotid Duplex",
  "Nuclear Exercise Stress Test One/Two Day",
  "Stress Echo Testing / Stress Testing Instructions",
  "Chemical Nuclear Stress Test",
  "Holter Monitor",
  "Upper Extremity Arterial Duplex",
];

const formerProviders = {
  md: [
    "Alfred Rossum, MD",
    "Amarnauth Singh, MD",
    "Andrew Kaplan, MD",
    "Fred Cucher, MD",
    "Moustafa Banna, MD",
    "Ramy Doss, MD",
    "Vinny Ram, MD",
    "Viet Tran, MD",
    "Wasiq Zaidi, MD",
  ],
  np: [
    "Alexis Jensen, NP",
    "Carissa Buckey, NP",
    "Deanna Kraemer, NP",
    "Lorna Hill, NP",
    "Mary Kaplan, NP",
    "Melinda Newman, NP",
    "Michelle Sanchez, NP",
    "Wendallynn Briske, NP",
  ],
  pa: ["Nancy Cooper, PA"],
  dnp: ["Donna Marie Burris, DNP"],
};

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
          <SectionCard id="toc" icon={<BookOpen className="h-4 w-4 text-primary" />} title="User Guide Contents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 text-sm rounded-md border border-dashed border-border px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </SectionCard>

          {/* Introduction */}
          <SectionCard id="intro" icon={<Info className="h-4 w-4 text-primary" />} title="Introduction">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Basata</strong> is an AI-powered healthcare operations
              platform that streamlines administrative workflows through automation and intelligent task
              management. This cheat sheet complements the platform by standardizing workflows to ensure
              accuracy, consistency, and alignment across teams.
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80">
                <strong>Attn Phoenix Heart:</strong> The indicators and types are not limited to the
                examples provided under each document type below. Please feel free to add as needed.
              </p>
            </div>
          </SectionCard>

          {/* Indexing Terms */}
          <SectionCard
            id="indexing-terms"
            icon={<ListChecks className="h-4 w-4 text-primary" />}
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
            icon={<StickyNote className="h-4 w-4 text-primary" />}
            title="Notes for Cheat Sheet"
          >
            <ul className="space-y-1.5">
              {cheatSheetNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-2" />
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
            icon={<FileText className="h-4 w-4 text-primary" />}
            title="Document Types (Workflows)"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                  <X className="h-3.5 w-3.5" />
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
                <Search className="h-5 w-5 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No document types match <span className="font-medium text-foreground">"{debouncedQuery}"</span>
                </p>
              </div>
            )}
          </SectionCard>

          {/* Additional Information */}
          <SectionCard
            id="additional-info"
            icon={<Building2 className="h-4 w-4 text-primary" />}
            title="Phoenix Heart — Additional Information"
          >
            <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-1.5">
              <span className="text-sm font-bold uppercase tracking-wide">Banner Health & Abrazo Facilities</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only keep documents that are imaging/radiology (from Banner Imaging) or have a PH
                letterhead included. These follow the workflow for <strong>Imaging</strong>. All other
                document types from these facilities (e.g., labs, H&Ps) are archived.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3 sm:p-4 space-y-1.5">
              <span className="text-sm font-bold uppercase tracking-wide">ROI Workflow Updates</span>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 leading-relaxed">
                <li>Review — provider's name but no patient found, then fax back "patient not found"</li>
                <li>
                  Athena: clinical docs labeled "record of care - referrals" not found in Athena are
                  treated as a new patient. Ask Ayub or Chandni — patient might not be transferable to
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
              <span className="text-sm font-bold uppercase tracking-wide">Test No Longer Performed by PH</span>
              <p className="text-xs text-muted-foreground">Renal artery US</p>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                This portion is still under construction.
              </p>
            </div>
          </SectionCard>

          {/* Provider List */}
          <SectionCard
            id="providers"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Provider List"
          >
            <div>
              <p className="text-xs font-semibold text-foreground/70 mb-2">Active Providers</p>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <th className="px-3 py-2 font-semibold">Provider</th>
                      <th className="px-3 py-2 font-semibold">Assigned NP</th>
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
                    <span className="text-xs font-bold uppercase tracking-wide text-foreground/70">{role}</span>
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
            icon={<FlaskConical className="h-4 w-4 text-primary" />}
            title="Tests Performed at Phoenix Heart"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {testsPerformed.map((test) => (
                <div
                  key={test}
                  className="flex items-center gap-2 text-sm rounded-md border border-dashed border-border px-3 py-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>{test}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 italic">Note: this portion is still under construction.</p>
          </SectionCard>

          {/* Footer */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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
