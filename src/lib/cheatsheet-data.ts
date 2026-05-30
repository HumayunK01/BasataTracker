import React from "react";

export interface DocType {
  name: string;
  indicators?: string;
  description?: string;
  workflows: string[];
  types?: string;
  notes?: React.ReactNode;
}

export const indexingTerms = [
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

export const cheatSheetNotes = [
  "Workflows appear in bold",
  "DOS: shown as Incoming (for incoming faxes) or Visit/Collected (for patient encounter date)",
  "PAQ Provider: shown as PAQ",
  "Task Assignee: Provider Staff EHR Group will be Staff EHR",
  "Task Priority: shown as Priority (if normal) and HIGH (for urgent docs)",
  "File and Task: shown as F&T",
  "Not all workflows are needed for each document. This cheat sheet will specify when needed",
];

export const docTypes: DocType[] = [
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
    notes: React.createElement("ul", { className: "list-disc list-inside space-y-0.5" },
      React.createElement("li", null, "If facility sent fax by error → fax back to facility"),
      React.createElement("li", null, "If PH sent fax by error or to wrong fax# then follow the workflow below")
    ),
    workflows: ["Admin → Incoming → Facility → Staff EHR → Priority → Add note to Task Description → F&T"],
  },
  {
    name: "Rx Notes",
    description: "Enter the pharmacy name",
    notes: React.createElement("p", null,
      "If not the first request, set priority to ",
      React.createElement("strong", null, "HIGH"),
      " and add a note in the Task Description (e.g., ",
      React.createElement("em", null, "Second request"),
      "). Common pharmacies: Walgreens, CoverMyMeds, CVS, Costco, Optum"
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

export const activeProviders = [
  { name: "Al Rabadi, Oday", np: "N/A" },
  { name: "Dizon, Kenneth", np: "N/A" },
  { name: "Gomes, Reshmaal", np: "Hock, Dana" },
  { name: "Khan, Shakeelosman", np: "Muchow (Hickman), Shawna" },
  { name: "Lazkani, Mohamed", np: "N/A" },
  { name: "Parasher, Punit", np: "Witbeck NP" },
  { name: "Patel, Rajul", np: "Barker, Kristen" },
  { name: "Sellberg, Kristine", np: "Walter, Olivia" },
];

export const testsPerformed = [
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

export const formerProviders = {
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
