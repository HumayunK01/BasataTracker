import { useState } from "react";
import { PageHeader } from "@/components/ar/PageHeader";
import { BookOpen, Tag, FileText, Users, Info, AlertCircle, Copy, Check, Phone, Printer, MapPin, ClipboardList, Contact } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text.replace(/\s*\(.*?\)/g, "").trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-auto shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
      title="Copy"
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface PatientRowProps {
  name: string;
  docType: string;
  dob: string;
  children: React.ReactNode;
}

function PatientRow({ name, docType, dob, children }: PatientRowProps) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 sm:p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-sm font-semibold leading-snug">{name}</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium whitespace-nowrap">{docType}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">DOB: {dob}</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

const inboxLabels = [
  "Admin (additional information needed)",
  "Advertisement",
  "Appeal (peer to peer)",
  "Approval",
  "Blank Faxback (No patient data/ Just fax facesheet no other information, or missing pages)",
  "Cardiac clearance",
  "CC",
  "Chron Con (Chronic Condition of Verification)",
  "CT/CTA (For CT or /CTA Reports, orders, needing more information)",
  "Denial",
  "Device Clinic (mentions MRI or Pacemaker)",
  "Doubt (Need Casey to help with a question on a doc)",
  "EKG (internal)",
  "External records (this also includes external records with PH letterhead)",
  "Imaging (for radiology doc types, diagnostic imaging report, external ekgs)",
  "Imaging order",
  "INR",
  "Insurance Card (patient insurance card)",
  "Labs",
  "Order",
  "Patient ID (patient ID card)",
  "Progress Note",
  "Rehab",
  "ROI (release of info)",
  "Rx",
  "Rx Auth (for prior authorization)",
  "Rx Correspondence (clarification request, alternative request, messages about prescriptions)",
  "Rx denial",
  "Stat cardiac clearance",
  "Sleep Report",
];

const roiRows = [
  {
    label: "Athena ROI",
    desc: "Chart needs to be created",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  {
    label: "Multi pt ROI",
    desc: "Multiple patients listed on ROI document",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
];

const indexingRows = [
  {
    label: "NR then verify pt",
    desc: "If no encounter & no new provider assigned — fax document back with note about provider not being at Phoenix Heart and no recent encounter",
    format: "NR → verify pt → fax back (no encounter / no new provider)",
  },
];

const assignedTasks = [
  {
    name: "Awes",
    tasks: "INR, External Record, Autoclassified, STAT, ROI, Index box Sweeping at least 1 time per day, Labs, Imaging",
  },
  {
    name: "Ayush",
    tasks: "Cardiac Clearance, Labs, Admin, Autoclassified, STAT",
  },
  {
    name: "Casey",
    tasks: "INR, Rx, Denials, Appeal, STAT, Imaging/Order, Cardiac Clearance, CC, CT/CTAs, Approvals, Admin, Labs, Imaging, All document types, Helping with questions noted in the notes on documents",
  },
  {
    name: "Hamza",
    tasks: "Progress note, Approvals, STAT, Denials, Inbox Sweeping at least 1 time per day, Labs, Imaging, Inbox to Indexing when available",
  },
  {
    name: "Humayun",
    tasks: "Inbox to indexing, Cath lab, EKGs, Rx renewals and prior auths, Cardiac Clearance, CC",
  },
  {
    name: "Danish",
    tasks: "Inbox to indexing",
  },
  {
    name: "Rais",
    tasks: "Inbox to indexing",
  },
];

const employeeList = [
  { name: "Yessica Ochoa", role: "MA", email: "yochoa@phoenixheart.com" },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader subtitle="Inbox Cheat Sheet" />

      <main className="flex-1 overflow-y-auto font-[system-ui]">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Inbox Cheat Sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">Reference for labeling and indexing incoming documents correctly.</p>
          </div>

          {/* Phoenix Heart Info */}
          <SectionCard icon={<Contact className="size-4 text-primary" />} title="Phoenix Heart Info">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">(623) 915-6058</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <Printer className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Fax</p>
                  <p className="text-sm font-medium">(623) 930-6060</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium text-muted-foreground/60 italic">Not provided</p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Assigned Tasks */}
          <SectionCard icon={<ClipboardList className="size-4 text-primary" />} title="Assigned Tasks">
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
              <Users className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">
                <span className="font-semibold">Everybody:</span>{" "}
                <span className="text-muted-foreground">ROI, Cath Lab, EKGs{"—"}Help with other trained document types as needed</span>
              </p>
            </div>
            <div className="space-y-2">
              {assignedTasks.map((person) => (
                <div key={person.name} className="rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3 space-y-1">
                  <span className="text-sm font-semibold">{person.name}</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{person.tasks}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Test Patients */}
          <SectionCard icon={<Users className="size-4 text-primary" />} title="Test Patients & Document Types">
            <div className="space-y-3">
              <PatientRow name="Test Pt 1: Test, Back Office" docType="Back Office" dob="01/01/2001">
                <strong>Message to providers</strong>{"—"}documents with no patient information that only address the provider.
                If there is no provider, <strong>Khan</strong> will be the default provider.
                Once the document is in indexing, follow the admin workflow on the <strong>PH cheat sheet</strong>.
              </PatientRow>

              <PatientRow name="Test Pt 2: Test, Medical Record" docType="Medical Record" dob="02/02/2002">
                <strong>ROI Multi pts</strong>{"—"}use this patient for release-of-information documents that span multiple patients.
              </PatientRow>

              <PatientRow name="Test Pt 3: Test, Credit Card" docType="Credit Card" dob="03/03/2003">
                <strong>Assign to Kellie Chavez.</strong> Use for:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Zelis</li>
                  <li>United Healthcare</li>
                  <li>Optum Financial</li>
                  <li>Other documents with patient payment{"—"}will either have a credit card image or use verbiage such as <em>payment transmittal</em></li>
                </ul>
              </PatientRow>
            </div>
          </SectionCard>

          {/* Inbox Labeling */}
          <SectionCard icon={<Tag className="size-4 text-primary" />} title="Inbox Labeling">
            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
              <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Use the following words exactly. No deviations.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {inboxLabels.map((label) => {
                const main = label.replace(/\s*\(.*?\)/g, "").trim();
                const note = label.match(/\(([^)]+)\)/)?.[1] ?? null;
                return (
                  <div key={label} className="flex items-center gap-2 text-sm rounded-lg border border-dashed border-border bg-transparent px-3 py-2 min-w-0">
                    <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{main}</span>
                      {note && (
                        <span className="block sm:inline text-xs text-muted-foreground/60 sm:ml-1.5 italic truncate sm:whitespace-normal">
                          {note}
                        </span>
                      )}
                    </span>
                    <CopyButton text={label} />
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ROI Category */}
          <SectionCard icon={<FileText className="size-4 text-primary" />} title="Inbox Labeling — ROI Category">
            <div className="space-y-2">
              {roiRows.map((row) => (
                <div key={row.label} className="flex flex-col xs:flex-row xs:items-center gap-2 rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit shrink-0 ${row.color}`}>{row.label}</span>
                  <span className="text-sm text-muted-foreground">{row.desc}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Indexing Labeling */}
          <SectionCard icon={<BookOpen className="size-4 text-primary" />} title="Indexing Labeling">
            <div className="space-y-3">
              {indexingRows.map((row) => (
                <div key={row.label} className="rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3 space-y-1">
                  <span className="text-sm font-semibold">{row.label}</span>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                  <code className="block text-xs bg-muted rounded px-2 py-1.5 font-mono text-foreground/80 mt-1 break-all sm:break-normal">
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
                <div key={emp.email} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3">
                  <span className="text-sm font-semibold">{emp.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{emp.role}</span>
                  <a href={`mailto:${emp.email}`} className="text-sm text-primary underline underline-offset-2 hover:opacity-80 ml-auto break-all">
                    {emp.email}
                  </a>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Info footer */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 sm:px-4 py-3">
            <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
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
