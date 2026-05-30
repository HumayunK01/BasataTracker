export const inboxLabels = [
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

export const roiRows = [
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

export const indexingRows = [
  {
    label: "NR then verify pt",
    desc: "If no encounter & no new provider assigned — fax document back with note about provider not being at Phoenix Heart and no recent encounter",
    format: "NR → verify pt → fax back (no encounter / no new provider)",
  },
];

export const assignedTasks = [
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

export const employeeList = [
  { name: "Yessica Ochoa", role: "MA", email: "yochoa@phoenixheart.com" },
];
