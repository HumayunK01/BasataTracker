import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useFaxedBackDocs, useUpsertFaxedBackDoc, useDeleteFaxedBackDoc, FAXED_BACK_STATUSES, type FaxedBackDoc, type FaxedBackInput, type FaxedBackStatus } from "@/hooks/useFaxedBackDocs";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, X, Pencil, Trash2, FileText, Info, Loader2, CalendarDays, Copy, Check } from "lucide-react";
import { SortHeader, type SortKey } from "@/components/ar/tracker/SortHeader";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  Pending: "text-amber-500",
  Sent: "text-emerald-500",
  Failed: "text-rose-500",
  Rejected: "text-rose-500",
};

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

// Accept MM/DD/YYYY (as it appears on the document) or YYYY-MM-DD; returns ISO for storage.
const parseDob = (v: string): string | null => {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mo, d, y] = m;
    if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

// ponytail: naive title case — splits on spaces and hyphens only, so "O'Brien" → "O'brien" (fine for pasted names)
const titleCase = (v: string) =>
  v.trim().toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

const FaxedBackPage = () => {
  const { data: rows = [], isLoading } = useFaxedBackDocs();
  const upsert = useUpsertFaxedBackDoc();
  const deleteDoc = useDeleteFaxedBackDoc();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaxedBackDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaxedBackDoc | null>(null);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byDate = new Map<string, FaxedBackDoc[]>();
    for (const r of rows) {
      if (q && !r.file_name.toLowerCase().includes(q)
        && !r.patient_name.toLowerCase().includes(q)
        && !(r.notes ?? "").toLowerCase().includes(q)) continue;
      const list = byDate.get(r.worked_on) ?? [];
      list.push(r);
      byDate.set(r.worked_on, list);
    }
    const docKey = sort && ["file_name", "patient_name", "patient_dob"].includes(sort.key) ? sort.key : null;
    const dir = sort && docKey ? (sort.dir === "asc" ? 1 : -1) : 0;
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => [date, dir === 0 ? list : [...list].sort((a, b) => {
        const av = a[docKey as "file_name" | "patient_name" | "patient_dob"] ?? "";
        const bv = b[docKey as "file_name" | "patient_name" | "patient_dob"] ?? "";
        return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
      })] as const);
  }, [rows, search, sort]);

  const total = useMemo(() => groups.reduce((n, [, l]) => n + l.length, 0), [groups]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: FaxedBackDoc) => { setEditing(row); setDialogOpen(true); };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="w-full space-y-4 animate-fade-in">

          <FigHeader title="Faxed Back to Clinics" sub={`${total} document${total === 1 ? "" : "s"}`} />

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground" />
              <Input
                placeholder="Search file, patient or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              className="h-10 shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground"
              onClick={openAdd}
            >
              <Plus className="size-4 mr-1" /> Add Document
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td colSpan={6} className="px-3 py-2.5"><Skeleton height={28} borderRadius={4} /></td>
                      </tr>
                    ))
                  ) : groups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 animate-fade-in">
                        <EmptyState
                          className="py-12"
                          icon={FileText}
                          title="No Documents"
                          hint={rows.length === 0 ? "Add the first document you faxed back to a clinic." : "No documents match your search."}
                        />
                      </td>
                    </tr>
                  ) : (
                    groups.map(([date, list]) => (
                      <GroupRows
                        key={date}
                        date={date}
                        rows={list}
                        sort={sort}
                        onToggleSort={toggleSort}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <DocDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
        upsert={upsert}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete this document?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
              This permanently removes <span className="font-medium text-foreground">{deleteTarget?.file_name}</span> from the list. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) deleteDoc.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function GroupRows({
  date,
  rows,
  sort,
  onToggleSort,
  onEdit,
  onDelete,
}: {
  date: string;
  rows: FaxedBackDoc[];
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onToggleSort: (key: SortKey) => void;
  onEdit: (row: FaxedBackDoc) => void;
  onDelete: (row: FaxedBackDoc) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copySection = async () => {
    const fmt = (d: string | null) => (d ? format(parseISO(d), "MM/dd/yyyy") : "");
    const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const header = ["File Name", "Patient Name", "Patient DOB", "Status", "Notes"];
    const body = rows.map((r) => [r.file_name, r.patient_name, fmt(r.patient_dob), r.status, r.notes ?? ""]);
    const tdStyle = "border:1px solid #444;padding:4px 12px;text-align:left;";
    const thStyle = `${tdStyle}font-weight:600;background:#1e2130;color:#e2e8f0;`;
    const html =
      `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">` +
      `<tr><td colspan="${header.length}" style="${thStyle}">${escHtml(format(parseISO(date), "EEEE, MMM d, yyyy"))}</td></tr>` +
      `<tr>${header.map((h) => `<td style="${thStyle}">${escHtml(h)}</td>`).join("")}</tr>` +
      body.map((row) => `<tr>${row.map((v) => `<td style="${tdStyle}">${escHtml(v)}</td>`).join("")}</tr>`).join("") +
      `</table>`;
    const plain = [
      format(parseISO(date), "EEEE, MMM d, yyyy"),
      header.join("\t"),
      ...body.map((r) => r.join("\t")),
    ].join("\n");
    const onCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    onCopied();
  };

  return (
    <>
      <tr className="bg-muted/40">
        <td colSpan={6} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">{format(parseISO(date), "MMMM d, yyyy")}</span>
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">{format(parseISO(date), "EEEE")}</span>
            <span className="text-xs text-foreground">({rows.length})</span>
          </div>
        </td>
      </tr>
      <tr className="bg-muted/50 text-xs uppercase tracking-wide text-foreground">
        <th className="px-3 py-2.5 text-left font-bold"><SortHeader label="File Name" sortKey="file_name" sort={sort} onSort={onToggleSort} align="left" /></th>
        <th className="px-3 py-2.5 text-left font-bold"><SortHeader label="Patient Name" sortKey="patient_name" sort={sort} onSort={onToggleSort} align="left" /></th>
        <th className="px-3 py-2.5 text-left font-bold"><SortHeader label="Patient DOB" sortKey="patient_dob" sort={sort} onSort={onToggleSort} align="left" /></th>
        <th className="px-3 py-2.5 text-left font-bold">Status</th>
        <th className="px-3 py-2.5 text-left font-bold">Notes</th>
        <th className="px-3 py-2.5 text-right font-bold w-12">
          <button
            type="button"
            onClick={copySection}
            title="Copy this section as a table"
            className="ml-auto press-scale p-1.5 rounded text-foreground hover:bg-foreground/10 transition-colors"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className="border-t border-border transition-colors hover:bg-foreground/[0.03]">
          <td className="px-3 py-2 max-w-[16rem] truncate font-medium text-foreground" title={row.file_name}>{row.file_name}</td>
          <td className="px-3 py-2 max-w-[14rem] truncate text-foreground" title={row.patient_name}>{row.patient_name}</td>
          <td className="px-3 py-2 text-foreground tabular-nums">{row.patient_dob ? format(parseISO(row.patient_dob), "MM/dd/yyyy") : <span className="text-muted-foreground">—</span>}</td>
          <td className={cn("px-3 py-2 text-sm font-semibold", STATUS_CLASSES[row.status] ?? "text-foreground")}>{row.status}</td>
          <td className="px-3 py-2 text-foreground w-72 whitespace-normal break-words">{row.notes || <span className="text-muted-foreground">—</span>}</td>
          <td className="px-3 py-2 text-center">
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                title={`Edit ${row.file_name}`}
                onClick={() => onEdit(row)}
                className="press-scale p-1.5 rounded text-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                title={`Delete ${row.file_name}`}
                onClick={() => onDelete(row)}
                className="press-scale p-1.5 rounded text-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function DocDialog({
  open,
  onOpenChange,
  row,
  upsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: FaxedBackDoc | null;
  upsert: { isPending: boolean; mutate: (vars: { id?: string; input: FaxedBackInput }, options?: { onSuccess?: () => void }) => void };
}) {
  const [fileName, setFileName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [workedOn, setWorkedOn] = useState("");
  const [status, setStatus] = useState<FaxedBackStatus>("Pending");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFileName(row?.file_name ?? "");
    setPatientName(row?.patient_name ?? "");
    setPatientDob(row?.patient_dob ? format(parseISO(row.patient_dob), "MM/dd/yyyy") : "");
    setWorkedOn(row?.worked_on ?? today());
    setStatus((row?.status as FaxedBackStatus) ?? "Pending");
    setNotes(row?.notes ?? "");
    setError("");
  }, [open, row]);

  const save = () => {
    if (!fileName.trim()) { setError("File name is required."); return; }
    if (!patientName.trim()) { setError("Patient name is required."); return; }
    if (patientDob && !parseDob(patientDob)) { setError("Patient DOB must be a valid date (MM/DD/YYYY)."); return; }
    if (!workedOn || !/^\d{4}-\d{2}-\d{2}$/.test(workedOn)) { setError("Date worked is required."); return; }
    upsert.mutate(
      {
        id: row?.id,
        input: {
          file_name: fileName,
          patient_name: titleCase(patientName),
          patient_dob: parseDob(patientDob),
          worked_on: workedOn,
          status,
          notes: notes.trim() || null,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            {row ? "Edit Document" : "Add Document"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fb-file" className="text-xs font-semibold text-foreground">File Name</Label>
            <Input
              id="fb-file"
              placeholder="e.g. ROI - Smith, John.pdf"
              value={fileName}
              className="font-medium"
              onChange={(e) => { setFileName(e.target.value); setError(""); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-patient" className="text-xs font-semibold text-foreground">Patient Name</Label>
            <Input
              id="fb-patient"
              placeholder="e.g. John Doe"
              value={patientName}
              className="font-medium"
              onChange={(e) => { setPatientName(e.target.value); setError(""); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-dob" className="text-xs font-semibold text-foreground">Patient DOB</Label>
            <Input
              id="fb-dob"
              placeholder="MM/DD/YYYY"
              value={patientDob}
              onChange={(e) => { setPatientDob(e.target.value); setError(""); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-worked-on" className="text-xs font-semibold text-foreground">Date Worked</Label>
            <Input
              id="fb-worked-on"
              type="date"
              value={workedOn}
              onChange={(e) => { setWorkedOn(e.target.value); setError(""); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-status" className="text-xs font-semibold text-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as FaxedBackStatus)}>
              <SelectTrigger id="fb-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAXED_BACK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-notes" className="text-xs font-semibold text-foreground">Notes</Label>
            <Textarea
              id="fb-notes"
              placeholder="Optional notes"
              value={notes}
              maxLength={1000}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={upsert.isPending}
            className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20"
          >
            {upsert.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {row ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FaxedBackPage;
