import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ar/PageHeader";
import { AppLogo } from "@/components/ar/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, Pencil, Trash2, GripVertical, Tag, Loader2, KeyRound, User, Info, ShieldCheck, Download, UserX, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
  useSeedDefaultCategories,
  type Category,
} from "@/hooks/useCategories";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

interface CategoryFormState {
  label: string;
  short: string;
}

const emptyForm: CategoryFormState = { label: "", short: "" };

const CAT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(160 70% 60%)",
  "hsl(280 70% 65%)",
  "hsl(20 85% 60%)",
];

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCategories();
  const { data: logs = [] } = useDailyLogs();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const seedDefaults = useSeedDefaultCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  function openAdd() {
    setEditingKey(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingKey(cat.key);
    setForm({ label: cat.label, short: cat.short });
    setFormError("");
    setDialogOpen(true);
  }

  function handleSave() {
    const label = form.label.trim();
    const short = form.short.trim();
    if (!label) { setFormError("Label is required."); return; }
    if (!short) { setFormError("Short name is required."); return; }
    if (short.length > 10) { setFormError("Short name must be 10 characters or fewer."); return; }

    if (editingKey) {
      updateCategory.mutate({ key: editingKey, updates: { label, short } }, {
        onSuccess: () => { toast.success("Category updated."); setDialogOpen(false); },
      });
    } else {
      const key = toKey(label);
      if (!key) { setFormError("Could not derive a key from this label."); return; }
      if (categories.some((c) => c.key === key)) {
        setFormError("A category with this name already exists.");
        return;
      }
      addCategory.mutate(
        { key, label, short, position: categories.length },
        { onSuccess: () => { toast.success("Category added."); setDialogOpen(false); } },
      );
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.key, {
      onSuccess: () => { toast.success(`"${deleteTarget.label}" removed.`); setDeleteTarget(null); },
    });
  }

  function handleDragStart(key: string) { setDragging(key); }
  function handleDragOver(e: React.DragEvent, key: string) { e.preventDefault(); setDragOver(key); }
  function handleDrop(targetKey: string) {
    if (!dragging || dragging === targetKey) { setDragging(null); setDragOver(null); return; }
    const from = categories.findIndex((c) => c.key === dragging);
    const to = categories.findIndex((c) => c.key === targetKey);
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next);
    setDragging(null); setDragOver(null);
  }

  const handleChangePassword = async () => {
    if (!pw.next) { setPwError("New password is required."); return; }
    if (pw.next.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (pw.next !== pw.confirm) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    setPwError("");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    toast.success("Password updated.");
    setPwOpen(false);
    setPw({ next: "", confirm: "" });
  };

  const handleExportData = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      user_email: user?.email,
      logs,
      categories,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `basata-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported.");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteAccountLoading(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");
      await supabase.from("daily_logs").delete().eq("user_id", userId);
      await supabase.from("categories").delete().eq("user_id", userId);
      await supabase.auth.signOut();
      navigate("/login");
      toast.success("Account and all data deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const isBusy = addCategory.isPending || updateCategory.isPending;

  return (
    <>
      <PageHeader />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Page title */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your categories, account, and preferences.</p>
          </div>

          {/* Bento grid — top row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Account card */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold">Account</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Member since</p>
                  <p className="text-sm font-medium">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Last sign in</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password card */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <KeyRound className="h-4 w-4 text-warning" />
                </div>
                <h2 className="text-sm font-semibold">Password</h2>
              </div>
              {!pwOpen ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">Change your login password. You'll stay signed in after updating.</p>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setPwOpen(true); setPwError(""); }}>
                    Change password
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">New password</Label>
                    <Input type="password" placeholder="••••••••" minLength={6} value={pw.next}
                      onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Confirm password</Label>
                    <Input type="password" placeholder="••••••••" value={pw.confirm}
                      onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} />
                  </div>
                  {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setPwOpen(false); setPwError(""); }}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={handleChangePassword} disabled={pwLoading}>
                      {pwLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      Update
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* About card */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 text-info" />
                </div>
                <h2 className="text-sm font-semibold">About</h2>
              </div>
              <div className="space-y-3">
                <AppLogo className="h-8 object-contain" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Version</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Categories</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{categories.length} active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Days logged</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{logs.length} days</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                  <span>Data encrypted & isolated per user</span>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={handleExportData} disabled={logs.length === 0 && categories.length === 0}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export all data
                </Button>
              </div>
            </div>
          </div>

          {/* Danger zone — full width */}
          <div className="bg-card border border-destructive/30 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-destructive/20">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <UserX className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Irreversible actions — proceed with caution</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently deletes your account and all data — logs, categories, everything. This cannot be undone.</p>
              </div>
              <Button size="sm" variant="destructive" className="shrink-0" onClick={() => { setDeleteAccountOpen(true); setDeleteConfirmText(""); }}>
                Delete account
              </Button>
            </div>
          </div>

          {/* Categories — full width */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Categories header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Categories</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Drag to reorder · {categories.length} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {categories.length === 0 && !isLoading && (
                  <Button size="sm" variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
                    {seedDefaults.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Load defaults
                  </Button>
                )}
                <Button size="sm" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add category
                </Button>
              </div>
            </div>

            {/* Categories list */}
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-14 rounded" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Tag className="h-10 w-10 opacity-20" />
                <p className="text-sm">No categories yet. Add one or load defaults.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((cat, i) => (
                  <div
                    key={cat.key}
                    draggable
                    onDragStart={() => handleDragStart(cat.key)}
                    onDragOver={(e) => handleDragOver(e, cat.key)}
                    onDrop={() => handleDrop(cat.key)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={[
                      "group flex items-center gap-3 px-5 py-3.5 transition-colors select-none",
                      dragOver === cat.key && dragging !== cat.key ? "bg-primary/5" : "hover:bg-muted/30",
                      dragging === cat.key ? "opacity-30" : "",
                    ].join(" ")}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab transition-colors shrink-0" />

                    {/* Color dot */}
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />

                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="text-sm font-medium truncate">{cat.label}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md shrink-0"
                        style={{ backgroundColor: `${CAT_COLORS[i % CAT_COLORS.length]}18`, color: CAT_COLORS[i % CAT_COLORS.length] }}>
                        {cat.short}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(cat)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingKey ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="cat-label">Label</Label>
              <Input id="cat-label" placeholder="e.g. Worked on NG" value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSave()} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-short">Short name</Label>
              <Input id="cat-short" placeholder="e.g. NG" maxLength={10} value={form.short}
                onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSave()} />
              <p className="text-xs text-muted-foreground">Shown in compact views · max 10 chars</p>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isBusy}>
              {isBusy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editingKey ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove category?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.label}"</strong> will be removed. Existing log data is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete account confirm */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={(o) => { if (!o) { setDeleteAccountOpen(false); setDeleteConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">This will permanently delete your account and <strong>all your data</strong> — every log entry, every category. This action <strong>cannot be undone</strong>.</span>
              <span className="block pt-1">Type <strong>DELETE</strong> to confirm:</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            className="mt-1"
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoFocus
          />
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleteAccountLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteAccountLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
