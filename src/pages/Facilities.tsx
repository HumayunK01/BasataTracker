import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Check, Copy, Loader2, MoreVertical, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Skeleton from "react-loading-skeleton";
import {
  useFacilities,
  useUpsertFacility,
  useDeleteFacility,
  type Facility,
  type FacilityInput,
} from "@/hooks/useFacilities";
import { useIsAdmin } from "@/hooks/useProfile";
import { EmptyState } from "@/components/ar/industrial";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Beautifies a US fax number for display/copy: (623) 930-6060. Leaves
// anything that isn't a plain 10/11-digit number untouched.
function formatFax(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

// E.164 for dialing/copying: +16239306060. Falls back to the raw value when
// the number isn't a plain 10/11-digit US number.
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function copyFax(f: Facility) {
  navigator.clipboard
    .writeText(toE164(f.fax_number))
    .then(() => toast.success(`${f.name} Fax No copied`))
    .catch(() => toast.error("Couldn't copy — select the number manually"));
}

function FaxCopyControls({ f }: { f: Facility }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const onCopy = () => {
    copyFax(f);
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };

  const icon = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={copied ? "check" : "copy"}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="grid place-items-center"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <button
        type="button"
        onClick={onCopy}
        title="Copy fax number"
        className="min-w-0 inline-flex items-center gap-1.5 rounded-md px-1.5 -mx-1.5 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer text-left"
      >
        <Printer className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold tabular-nums tracking-tight text-foreground truncate">{formatFax(f.fax_number)}</span>
      </button>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${f.name} fax number`}
        title="Copy fax number"
        className={`size-7 shrink-0 rounded-md grid place-items-center transition-colors cursor-pointer ${
          copied
            ? "text-success"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        {icon}
      </button>
    </div>
  );
}

// Production is served with CSP img-src 'self' + COEP, which block remote
// images — so logos go through the same-origin /api/logo proxy there (same
// pattern as ServiceLogo). Local vite has no serverless fn, so use the URL
// directly (http localhost loads remote images fine).
function logoSrc(url: string): string {
  return window.location.protocol === "https:" ? `/api/logo?url=${encodeURIComponent(url)}` : url;
}

function LogoImage({ f }: { f: Facility }) {
  const [failed, setFailed] = useState(false);
  if (failed || !f.logo_url) return <FacilityAvatar f={f} />;
  return (
    <img
      src={logoSrc(f.logo_url)}
      alt={`${f.name} logo`}
      className="size-full object-contain object-center p-4"
      onError={() => setFailed(true)}
    />
  );
}

function FacilityAvatar({ f }: { f: Facility }) {
  return (
    <div className="size-full grid place-items-center bg-gradient-to-br from-primary/10 via-transparent to-primary/5">
      <span className="text-5xl font-bold text-primary/50 select-none">{f.name[0]?.toUpperCase() ?? "?"}</span>
    </div>
  );
}

function FacilityDialog({
  open,
  onOpenChange,
  row,
  upsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: Facility | null;
  upsert: { isPending: boolean; mutate: (vars: { row: Facility | null; values: FacilityInput }, options?: { onSuccess?: () => void }) => void };
}) {
  const [name, setName] = useState("");
  const [faxNumber, setFaxNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(row?.name ?? "");
    setFaxNumber(row?.fax_number ?? "");
    setLogoUrl(row?.logo_url ?? "");
  }, [open, row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            {row ? "Edit Facility" : "Add Facility"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fac-name" className="text-xs font-semibold text-foreground">Facility Name</Label>
            <Input
              id="fac-name"
              placeholder="e.g. Phoenix Heart Clinic"
              value={name}
              className="font-medium"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fac-fax" className="text-xs font-semibold text-foreground">Fax Number</Label>
            <Input
              id="fac-fax"
              placeholder="e.g. (602) 555-0134"
              value={faxNumber}
              className="font-medium tabular-nums"
              onChange={(e) => setFaxNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fac-logo" className="text-xs font-semibold text-foreground">Logo URL (optional)</Label>
            <Input
              id="fac-logo"
              placeholder="https://…/logo.png"
              value={logoUrl}
              className="font-medium"
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Shows a letter badge when left empty.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              upsert.mutate(
                { row, values: { name, fax_number: faxNumber, logo_url: logoUrl } },
                { onSuccess: () => onOpenChange(false) },
              )
            }
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

export default function FacilitiesPage() {
  const isAdmin = useIsAdmin();
  const { data: facilities = [], isLoading } = useFacilities();
  const upsert = useUpsertFacility();
  const deleteFacility = useDeleteFacility();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (f) => f.name.toLowerCase().includes(q) || f.fax_number.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 flex justify-center min-w-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-xs w-full bg-card border-border"
                placeholder="Search by name or fax…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => { setEditing(null); setDialogOpen(true); }}
              className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20"
            >
              <Plus className="size-4 mr-1.5" /> Add Facility
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-lg p-4 space-y-3">
                <Skeleton width={120} height={16} />
                <Skeleton width={80} height={12} />
                <Skeleton height={36} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={facilities.length === 0 ? "No facilities yet" : "No matches"}
            hint={facilities.length === 0 ? "Admins can add the facilities you fax to." : "Try a different search."}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((f) => (
              <div key={f.id} className="group bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
                <div className="relative h-28 sm:h-32 bg-muted/10 overflow-hidden">
                  <LogoImage f={f} />
                  {/* Fades the logo's bottom edge into the card so it looks
                      like the image dissolves into the surface. */}
                  <div className="absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-t from-card via-card/45 to-transparent" />
                  {isAdmin && (
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                            aria-label={`Actions for ${f.name}`}
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => { setEditing(f); setDialogOpen(true); }}
                            disabled={upsert.isPending}
                            className="cursor-pointer"
                          >
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(f)}
                            disabled={deleteFacility.isPending}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                <div className="relative px-4 pt-3 pb-4 flex items-center gap-2">
                  <span className="size-1.5 bg-primary shrink-0" />
                  <h3 className="min-w-0 flex-1 text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">{f.name}</h3>
                  <FaxCopyControls f={f} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FacilityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
        upsert={upsert}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The facility's logo and fax number will be removed from this reference page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/95 text-destructive-foreground disabled:opacity-50"
              disabled={deleteFacility.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteFacility.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              {deleteFacility.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}