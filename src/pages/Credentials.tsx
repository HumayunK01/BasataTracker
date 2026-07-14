import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCredentialFolders,
  useCredentials,
  useAllCredentials,
  useDeleteCredential,
  useDeleteFolder,
  useMoveCredential,
  type Credential,
  type CredentialFolder,
} from "@/hooks/useCredentials";
import { PageHeader } from "@/components/ar/PageHeader";
import { EmptyState } from "@/components/ar/industrial";
import { CredentialDialog } from "@/components/ar/credentials/CredentialDialog";
import { NewFolderDialog } from "@/components/ar/credentials/NewFolderDialog";
import { RenameFolderDialog } from "@/components/ar/credentials/RenameFolderDialog";
import { ServiceLogo } from "@/components/ar/credentials/ServiceLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ChevronRight, Copy, Eye, EyeOff, FileText, Folder, FolderInput, FolderPlus, KeyRound, Layers, MoreVertical, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FOLDER_KEY = "credential-folder";

// Mirrors the Daily Log CSV export: downloads a real .csv file so the whole
// folder can be opened as a table in Excel/Sheets. The per-credential copy
// (copyCredential) instead writes an HTML table to the clipboard — see below.
function credentialCSV(rows: Credential[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Service", "ID", "Password", "Notes"].map(escape).join(",");
  const body = rows
    .map((r) => [r.service, r.login_id, r.password, r.notes ?? ""].map(escape).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCredentialCSV(rows: Credential[], name: string) {
  const blob = new Blob([credentialCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "credentials"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CredentialsPage = () => {
  const { data: folders = [], isLoading: foldersLoading } = useCredentialFolders();

  const [folderId, setFolderId] = useState<string | null>(() => localStorage.getItem(FOLDER_KEY));
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<CredentialFolder | null>(null);
  const [folderToRename, setFolderToRename] = useState<CredentialFolder | null>(null);

  useEffect(() => {
    if (foldersLoading || folders.length === 0) return;
    if (!folderId || !folders.some((f) => f.id === folderId)) {
      setFolderId(folders[0].id);
    }
  }, [folders, foldersLoading, folderId]);

  useEffect(() => {
    if (folderId) localStorage.setItem(FOLDER_KEY, folderId);
  }, [folderId]);

  const activeFolder = folders.find((f) => f.id === folderId) ?? null;
  const otherFolders = folders.filter((f) => f.id !== folderId);
  const [showAll, setShowAll] = useState(true);

  const folderQuery = useCredentials(showAll ? undefined : folderId ?? undefined);
  const allQuery = useAllCredentials(showAll);
  const { data: credentials = [], isLoading } = showAll ? allQuery : folderQuery;
  const deleteCredential = useDeleteCredential();
  const deleteFolder = useDeleteFolder();
  const moveCredential = useMoveCredential();

  const [now] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const revealTimers = useRef<Record<string, number>>({});

  useEffect(() => () => {
    Object.values(revealTimers.current).forEach((t) => clearTimeout(t));
  }, []);

  const copyField = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
      flashCopied(key);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const flashCopied = (key: string) => {
    setCopied((prev) => new Set(prev).add(key));
    window.setTimeout(() => {
      setCopied((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 1200);
  };

  // Mirrors the Daily Log per-day copy: writes an HTML <table> to the clipboard
  // (plus a plain TSV fallback) so it pastes as a real table, not raw text.
  const copyCredential = (c: Credential) => {
    const rows: [string, string][] = [
      ["Service", c.service],
      ["ID", c.login_id],
      ["Password", c.password],
    ];
    if (c.notes) rows.push(["Notes", c.notes]);

    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const tdStyle = "border:1px solid #444;padding:4px 12px;text-align:left;";
    const thStyle = `${tdStyle}font-weight:600;background:#1e2130;color:#e2e8f0;`;
    const html = `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">${rows
      .map(([k, v]) => `<tr><td style="${thStyle}">${esc(k)}</td><td style="${tdStyle}">${esc(v)}</td></tr>`)
      .join("")}</table>`;
    const plain = rows.map(([k, v]) => `${k}\t${v}`).join("\n");

    const done = () => flashCopied(`${c.id}:copy`);
    const fail = () => toast.error("Couldn't copy to clipboard");

    if (navigator.clipboard && "ClipboardItem" in window) {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ])
        .then(done)
        .catch(fail);
    } else {
      navigator.clipboard.writeText(plain).then(done).catch(fail);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return credentials;
    return credentials.filter(
      (c) =>
        c.service.toLowerCase().includes(q) ||
        c.login_id.toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q),
    );
  }, [credentials, search]);

  // Reveal a password; auto-hide it again after 5s. Toggling off clears the timer.
  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (revealTimers.current[id]) {
          clearTimeout(revealTimers.current[id]);
          delete revealTimers.current[id];
        }
      } else {
        next.add(id);
        revealTimers.current[id] = window.setTimeout(() => {
          setRevealed((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
          delete revealTimers.current[id];
        }, 5000);
      }
      return next;
    });

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: Credential) => { setEditing(row); setDialogOpen(true); };

  return (
    <>
      <PageHeader
        now={now}
        subtitle="Vault"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              onClick={() => downloadCredentialCSV(credentials, showAll ? "all-credentials" : activeFolder?.name ?? "vault")}
              disabled={credentials.length === 0}
              title={credentials.length === 0 ? "Nothing to export" : "Export as CSV"}
            >
              <FileText className="size-4 mr-1" /> Export CSV
            </Button>
            <Button
              size="sm"
              className="h-8 shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground"
              onClick={openAdd}
              disabled={!folderId || showAll}
              title={showAll ? "Pick a folder first" : !folderId ? "Create a folder first" : undefined}
            >
              <Plus className="size-4 mr-1" /> Add Credential
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="w-full space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={cn(
                "flex items-center gap-2 h-10 px-3 border rounded-none text-sm font-medium transition-colors shrink-0",
                showAll
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted/40",
              )}
            >
              <Layers className={cn("size-4 shrink-0", showAll ? "text-primary" : "text-muted-foreground")} />
              <span>All</span>
            </button>
            {folders.map((f) => {
              const active = !showAll && f.id === folderId;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFolderId(f.id); setShowAll(false); }}
                  className={cn(
                    "flex items-center gap-2 h-10 px-3 border rounded-none text-sm font-medium transition-colors max-w-[14rem]",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted/40",
                  )}
                >
                  <Folder className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate">{f.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setFolderDialogOpen(true)}
              className="flex items-center gap-1.5 h-10 px-3 border border-dashed border-border rounded-none text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
            >
              <FolderPlus className="size-4" /> New folder
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search service, login, or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 shrink-0 max-w-[12rem]" disabled={foldersLoading}>
                  <Users className="size-4 mr-1.5 shrink-0" />
                  <span className="truncate">{activeFolder?.name ?? (foldersLoading ? "Loading…" : "No folder")}</span>
                  <ChevronDown className="size-3 ml-1 opacity-60 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 font-sans">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Switch folder</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => { setFolderId(f.id); setShowAll(false); }}
                    className="flex items-center justify-between gap-2 pr-1"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {f.id === folderId
                        ? <Check className="size-3.5 opacity-80 shrink-0" />
                        : <span className="size-3.5 shrink-0" />}
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="flex items-center shrink-0">
                      <button
                        type="button"
                        title={`Rename ${f.name}`}
                        onClick={(e) => { e.stopPropagation(); setFolderToRename(f); }}
                        className="press-scale p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Delete ${f.name}`}
                        onClick={(e) => { e.stopPropagation(); setFolderToDelete(f); }}
                        className="press-scale p-1 rounded text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFolderDialogOpen(true)} className="text-primary">
                  <FolderPlus className="size-3.5 mr-1.5" /> New folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden md:block bg-card border border-border rounded-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">Service</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Login ID</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Password</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                    <th className="px-3 py-2.5 text-center font-semibold w-12" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td colSpan={5} className="px-3 py-2.5"><div className="h-6 bg-muted/40 animate-pulse rounded" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 animate-fade-in">
                        <EmptyState
                          className="py-12"
                          icon={KeyRound}
                          title={credentials.length === 0 ? "No Credentials" : "No matches"}
                          hint={credentials.length === 0 ? "Add your first credential to this folder." : "Nothing matches your current search."}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const show = revealed.has(c.id);
                      return (
                        <tr key={c.id} className="border-t border-border transition-colors hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium max-w-[16rem]">
                            <div className="flex items-center gap-2 min-w-0">
                              <ServiceLogo service={c.service} website={c.website} className="size-5" />
                              <span className="truncate" title={c.service}>{c.service}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 max-w-[16rem]">
                            <button
                              type="button"
                              onClick={() => copyField(`${c.id}:login`, c.login_id, "Login ID")}
                              title={`${c.login_id} — click to copy`}
                              className="press-scale text-left hover:underline underline-offset-2 truncate block max-w-full"
                            >
                              {c.login_id}
                            </button>
                          </td>
                          <td className="px-3 py-2 max-w-[16rem]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono truncate" title={show ? c.password : undefined}>
                                {show ? c.password : "•".repeat(12)}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleReveal(c.id)}
                                title={show ? "Hide" : "Show"}
                                className="text-muted-foreground hover:text-foreground shrink-0"
                              >
                                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyCredential(c)}
                                title="Copy"
                                className={cn(
                                  "shrink-0 ml-auto press-scale transition-colors",
                                  copied.has(`${c.id}:copy`) ? "text-emerald-500" : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {copied.has(`${c.id}:copy`)
                                  ? <Check className="size-3.5 animate-fade-in" />
                                  : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[16rem] truncate" title={c.notes ?? ""}>
                            {c.notes || <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36 font-sans">
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                                  onClick={() => copyCredential(c)}
                                >
                                  <Copy className="size-3.5" /> Copy
                                </button>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default outline-none focus:bg-accent data-[state=open]:bg-accent">
                                    <FolderInput className="size-3.5" /> Move to
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="w-40 font-sans p-1">
                                      {otherFolders.length === 0 ? (
                                        <span className="block px-2 py-1.5 text-xs text-muted-foreground">No other folders</span>
                                      ) : (
                                        otherFolders.map((f) => (
                                          <DropdownMenuItem
                                            key={f.id}
                                            className="text-sm"
                                            onClick={() => moveCredential.mutate({ id: c.id, folderId: f.id })}
                                          >
                                            {f.name}
                                          </DropdownMenuItem>
                                        ))
                                      )}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                                  onClick={() => openEdit(c)}
                                >
                                  <Pencil className="size-3.5" /> Edit
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
                                  onClick={() => setDeleteTarget(c)}
                                >
                                  <Trash2 className="size-3.5" /> Delete
                                </button>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-none border border-border p-3.5">
                  <div className="h-5 bg-muted/40 animate-pulse rounded w-1/2" />
                  <div className="h-4 bg-muted/40 animate-pulse rounded w-2/3 mt-2" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title={credentials.length === 0 ? "No Credentials" : "No matches"}
                hint={credentials.length === 0 ? "Add your first credential to this folder." : "Nothing matches your current search."}
              />
            ) : (
              filtered.map((c) => {
                const show = revealed.has(c.id);
                return (
                  <div key={c.id} className="rounded-none border border-border p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ServiceLogo service={c.service} website={c.website} className="size-5" />
                        <p className="font-medium truncate">{c.service}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 -mr-2 -mt-1 shrink-0">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 font-sans">
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={() => copyCredential(c)}>
                            <Copy className="size-3.5" /> Copy
                          </button>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default outline-none focus:bg-accent data-[state=open]:bg-accent">
                              <FolderInput className="size-3.5" /> Move to
                              <ChevronRight className="size-3.5 ml-auto" />
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="w-40 font-sans p-1">
                                {otherFolders.length === 0 ? (
                                  <span className="block px-2 py-1.5 text-xs text-muted-foreground">No other folders</span>
                                ) : (
                                  otherFolders.map((f) => (
                                    <DropdownMenuItem
                                      key={f.id}
                                      className="text-sm"
                                      onClick={() => moveCredential.mutate({ id: c.id, folderId: f.id })}
                                    >
                                      {f.name}
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={() => openEdit(c)}>
                            <Pencil className="size-3.5" /> Edit
                          </button>
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="size-3.5" /> Delete
                          </button>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <button type="button" onClick={() => copyField(`${c.id}:login`, c.login_id, "Login ID")} className="block text-sm text-muted-foreground hover:underline underline-offset-2 truncate w-full text-left">
                      {c.login_id}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm truncate">{show ? c.password : "•".repeat(12)}</span>
                      <button type="button" onClick={() => toggleReveal(c.id)} title={show ? "Hide" : "Show"} className="text-muted-foreground hover:text-foreground shrink-0">
                        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                      <button type="button" onClick={() => copyCredential(c)} title="Copy" className={cn("shrink-0 ml-auto press-scale transition-colors", copied.has(`${c.id}:copy`) ? "text-emerald-500" : "text-muted-foreground hover:text-foreground")}>
                        {copied.has(`${c.id}:copy`)
                          ? <Check className="size-3.5 animate-fade-in" />
                          : <Copy className="size-3.5" />}
                      </button>
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground truncate">{c.notes}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <CredentialDialog open={dialogOpen} onOpenChange={setDialogOpen} row={editing} folderId={folderId ?? undefined} />

      <NewFolderDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen} onCreated={(f) => setFolderId(f.id)} />

      <RenameFolderDialog open={!!folderToRename} onOpenChange={(o) => !o && setFolderToRename(null)} folder={folderToRename} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete this credential?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
              This permanently removes <span className="font-medium text-foreground">{deleteTarget?.service}</span> from the vault. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) deleteCredential.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!folderToDelete} onOpenChange={(o) => !o && setFolderToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete folder?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
              This deletes the folder <span className="font-medium text-foreground">{folderToDelete?.name}</span>
              {" "}and <span className="font-medium text-destructive">all of its credentials</span>. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                const target = folderToDelete;
                if (!target) return;
                deleteFolder.mutate(target.id, {
                  onSuccess: () => {
                    if (target.id === folderId) {
                      const next = folders.find((f) => f.id !== target.id);
                      setFolderId(next ? next.id : null);
                    }
                  },
                });
                setFolderToDelete(null);
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CredentialsPage;
