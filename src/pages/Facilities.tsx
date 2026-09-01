import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Check, LayoutGrid, List, Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { useAccessToken } from "@/hooks/useAccessToken";
import { EmptyState } from "@/components/ar/industrial";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy fax number"
      className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-1.5 -mx-1.5 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer group/fax"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "copied" : "label"}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="text-xs font-medium text-foreground"
        >
          {copied ? "Copied!" : "Fax:"}
        </motion.span>
      </AnimatePresence>
      <span className="text-xs tabular-nums tracking-tight text-foreground truncate underline-offset-2 group-hover/fax:underline">{formatFax(f.fax_number)}</span>
    </button>
  );
}

// Production is served with CSP img-src 'self' + COEP, which block remote
// images — so logos go through the same-origin /api/logo proxy there (same
// pattern as ServiceLogo). Local vite has no serverless fn, so use the URL
// directly (http localhost loads remote images fine). The proxy is
// auth-gated, so append the session token (img tags can't send headers).
function logoSrc(url: string, token: string | null): string {
  const t = token ? `&t=${encodeURIComponent(token)}` : "";
  return window.location.protocol === "https:" ? `/api/logo?url=${encodeURIComponent(url)}${t}` : url;
}

function LogoImage({ f }: { f: Facility }) {
  const [failed, setFailed] = useState(false);
  const token = useAccessToken();
  if (failed || !f.logo_url) return <FacilityAvatar f={f} />;
  return (
    <img
      src={logoSrc(f.logo_url, token)}
      alt={`${f.name} logo`}
      className="size-full object-cover object-center"
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
  const [address, setAddress] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(row?.name ?? "");
    setFaxNumber(row?.fax_number ?? "");
    setLogoUrl(row?.logo_url ?? "");
    setAddress(row?.address ?? "");
    setVerified(row?.verified ?? false);
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
            <Label htmlFor="fac-address" className="text-xs font-semibold text-foreground">Address (optional)</Label>
            <Input
              id="fac-address"
              placeholder="e.g. 1234 W McDowell Rd, Phoenix, AZ"
              value={address}
              className="font-medium"
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <Label htmlFor="fac-verified" className="text-xs font-semibold text-foreground cursor-pointer">Verified</Label>
            <Switch
              id="fac-verified"
              checked={verified}
              onCheckedChange={setVerified}
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
                { row, values: { name, fax_number: faxNumber, logo_url: logoUrl, address, verified } },
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

function VerifiedTick({ f }: { f: Facility }) {
  if (!f.verified) return null;
  return (
    <span
      title="Verified"
      aria-label="Verified"
      className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-white shadow-sm"
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

function FacilityCard({
  f,
  isAdmin,
  setEditing,
  setDialogOpen,
  setDeleteTarget,
  upsert,
  deleteFacility,
}: {
  f: Facility;
  isAdmin: boolean;
  setEditing: (f: Facility | null) => void;
  setDialogOpen: (open: boolean) => void;
  setDeleteTarget: (f: Facility | null) => void;
  upsert: ReturnType<typeof useUpsertFacility>;
  deleteFacility: ReturnType<typeof useDeleteFacility>;
}) {
  return (
    <div
      key={f.id}
      className="group bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
      <div className="relative h-28 sm:h-32 bg-muted/10 overflow-hidden">
        <LogoImage f={f} />
        <div className="absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-t from-card via-card/45 to-transparent" />
        <div className="absolute top-2 right-2">
          <VerifiedTick f={f} />
        </div>
      </div>

      <div className="relative px-4 pt-3 pb-4 space-y-1">
        <div className="flex items-start gap-2">
          <span className="size-1.5 bg-primary shrink-0 mt-[7px]" />
          <h3 className="min-w-0 flex-1 text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">{f.name}</h3>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-7 shrink-0 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
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
          )}
        </div>
        {f.address && (
          <p className="flex items-start gap-2 text-xs text-foreground">
            <span className="size-1.5 bg-primary/50 shrink-0 mt-[5px]" />
            <span className="min-w-0 flex-1">{f.address}</span>
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="size-1.5 bg-primary/50 shrink-0" />
          <FaxCopyControls f={f} />
        </div>
      </div>
    </div>
  );
}

function FacilityRow({
  f,
  isAdmin,
  setEditing,
  setDialogOpen,
  setDeleteTarget,
  upsert,
  deleteFacility,
}: {
  f: Facility;
  isAdmin: boolean;
  setEditing: (f: Facility | null) => void;
  setDialogOpen: (open: boolean) => void;
  setDeleteTarget: (f: Facility | null) => void;
  upsert: ReturnType<typeof useUpsertFacility>;
  deleteFacility: ReturnType<typeof useDeleteFacility>;
}) {
  return (
    <div
      key={f.id}
      className="group flex items-center gap-4 bg-card border border-border/50 rounded-lg p-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
      role="listitem"
    >
      <div className="relative h-10 w-10 shrink-0 rounded bg-muted/10 overflow-hidden flex-shrink-0">
        <LogoImage f={f} />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 flex-1 font-semibold tracking-tight text-foreground truncate">{f.name}</h3>
          <VerifiedTick f={f} />
        </div>
        {f.address && (
          <p className="text-xs text-foreground">{f.address}</p>
        )}
        <FaxCopyControls f={f} />
      </div>
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="size-8 shrink-0 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors cursor-pointer"
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
      )}
    </div>
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (f: Facility) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.fax_number.toLowerCase().includes(q) ||
      (f.address ?? "").toLowerCase().includes(q);
    // Verified facilities lead; keep DB (sort_order) order within each group.
    return facilities.filter(matches).sort((a, b) => Number(b.verified) - Number(a.verified));
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
                placeholder="Search by name, fax, or address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
                aria-label="List view"
              >
                <List className="size-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                onClick={() => { setEditing(null); setDialogOpen(true); }}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20"
              >
                <Plus className="size-4 mr-1.5" /> Add Facility
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={viewMode === "grid" ? "bg-card border border-border/50 rounded-lg p-4 space-y-3" : "bg-card border border-border/50 rounded-lg p-3"}>
                {viewMode === "grid" ? (
                  <>
                    <Skeleton className="h-28 sm:h-32 w-full rounded" />
                    <Skeleton width={120} height={16} />
                    <Skeleton height={44} />
                  </>
                ) : (
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton width="60%" height={16} />
                      <Skeleton width="40%" height={12} />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={facilities.length === 0 ? "No facilities yet" : "No matches"}
            hint={facilities.length === 0 ? "Admins can add the facilities you fax to." : "Try a different search."}
          />
        ) : viewMode === "grid" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="grid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((f) => (
                <FacilityCard
                  key={f.id}
                  f={f}
                  isAdmin={isAdmin}
                  setEditing={setEditing}
                  setDialogOpen={setDialogOpen}
                  setDeleteTarget={setDeleteTarget}
                  upsert={upsert}
                  deleteFacility={deleteFacility}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="list"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-2"
              role="list"
              aria-label="Facilities list"
            >
              {filtered.map((f) => (
                <FacilityRow
                  key={f.id}
                  f={f}
                  isAdmin={isAdmin}
                  setEditing={setEditing}
                  setDialogOpen={setDialogOpen}
                  setDeleteTarget={setDeleteTarget}
                  upsert={upsert}
                  deleteFacility={deleteFacility}
                />
              ))}
            </motion.div>
          </AnimatePresence>
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