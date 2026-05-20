import { useState } from "react";
import { colorForKey } from "@/lib/cat-colors";
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
import { Plus, Pencil, Trash2, GripVertical, Tag, Loader2, KeyRound, User, Info, ShieldCheck, Download, UserX, Clock, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/hooks/useAuditLog";
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
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

interface CategoryFormState {
  label: string;
  short: string;
}

const emptyForm: CategoryFormState = { label: "", short: "" };

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
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
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "" });
  const [profileLoading, setProfileLoading] = useState(false);

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
    await logAuditEvent("password_changed");
    toast.success("Password updated.");
    setPwOpen(false);
    setPw({ next: "", confirm: "" });
  };

  const handleExportData = () => {
    // Prefix any string starting with formula characters to prevent spreadsheet injection
    const safeStr = (s: string | null | undefined) =>
      s && /^[=+@\-|%]/.test(s) ? `'${s}` : s;

    const payload = {
      exported_at: new Date().toISOString(),
      user_email: safeStr(user?.email),
      logs: logs.map((l) => ({ ...l, notes: safeStr(l.notes) })),
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
    if (!deletePassword) { toast.error("Password is required to delete your account."); return; }
    setDeleteAccountLoading(true);
    try {
      const email = user?.email;
      if (!email) throw new Error("Not authenticated");
      // Re-authenticate before destructive action
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: deletePassword });
      if (authError) throw new Error("Incorrect password.");
      // Delete the auth user — cascades to all user data via ON DELETE CASCADE
      const { error: deleteError } = await supabase.rpc("delete_own_account");
      if (deleteError) throw deleteError;
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Account and all data deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.first_name.trim()) { toast.error("First name is required."); return; }
    if (!profileForm.last_name.trim()) { toast.error("Last name is required."); return; }
    setProfileLoading(true);
    try {
      await updateProfile.mutateAsync({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
      });
      toast.success("Profile updated.");
      setProfileOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const isBusy = addCategory.isPending || updateCategory.isPending;

  return (
    <>
      <PageHeader subtitle="Settings" />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Page title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your categories, account, and preferences.</p>
          </div>

          {/* Bento grid — 2 cols on mobile, 3 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

            {/* Account card */}
            <div className="col-span-2 sm:col-span-1 bg-card border border-border rounded-md p-4 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="size-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="size-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold">Account</h2>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <Separator />
                <div className="space-y-0.5">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Member since</p>
                  <p className="text-sm font-medium" suppressHydrationWarning>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <Separator />
                <div className="space-y-0.5">
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Last sign in</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-muted-foreground shrink-0" />
                    <p className="text-xs sm:text-sm font-medium" suppressHydrationWarning>
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile & Password card */}
            <div className="col-span-2 sm:col-span-1 bg-card border border-border rounded-md p-4 sm:p-5 space-y-4">

              {/* Profile section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="size-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <h2 className="text-sm font-semibold">Profile</h2>
                </div>
                {!profileOpen ? (
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                      <p className="text-sm font-medium">
                        {profile?.first_name || profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`.trim()
                          : <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => {
                      setProfileForm({ first_name: profile?.first_name ?? "", last_name: profile?.last_name ?? "" });
                      setProfileOpen(true);
                    }}>
                      Edit name
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">First name</Label>
                      <Input placeholder="First name" value={profileForm.first_name}
                        onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Last name</Label>
                      <Input placeholder="Last name" value={profileForm.last_name}
                        onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateProfile()} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setProfileOpen(false)}>Cancel</Button>
                      <Button size="sm" className="flex-1" onClick={handleUpdateProfile} disabled={profileLoading}>
                        {profileLoading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Password section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 sm:h-8 sm:w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <KeyRound className="size-3.5 sm:h-4 sm:w-4 text-warning" />
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
                        onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
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
                        {pwLoading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                        Update
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* About card */}
            <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="size-7 sm:h-8 sm:w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <Info className="size-3.5 sm:h-4 sm:w-4 text-info" />
                </div>
                <h2 className="text-sm font-semibold">About</h2>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <AppLogo className="h-7 sm:h-8 object-contain" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Version</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">1.1.1</span>
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2">
                  <ShieldCheck className="size-3.5 shrink-0 text-success" />
                  <span>Encrypted &amp; isolated per user</span>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={handleExportData} disabled={logs.length === 0 && categories.length === 0}>
                  <Download className="size-3.5 mr-1.5" /> Export data
                </Button>
              </div>
            </div>
          </div>

          {/* Categories — full width */}
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="size-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="size-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Categories</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden xs:block">Drag to reorder · {categories.length} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {categories.length === 0 && !isLoading && (
                  <Button size="sm" variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
                    {seedDefaults.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                    <span className="hidden xs:inline">Load </span>defaults
                  </Button>
                )}
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add category</span>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-14 rounded" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
                <Tag className="size-10 opacity-20" />
                <p className="text-sm">No categories yet. Add one or load defaults.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((cat) => (
                  <div
                    key={cat.key}
                    draggable
                    onDragStart={() => handleDragStart(cat.key)}
                    onDragOver={(e) => handleDragOver(e, cat.key)}
                    onDrop={() => handleDrop(cat.key)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={[
                      "group flex items-center gap-3 px-4 sm:px-5 py-3.5 transition-colors select-none touch-manipulation",
                      dragOver === cat.key && dragging !== cat.key ? "bg-primary/5" : "hover:bg-muted/30",
                      dragging === cat.key ? "opacity-30" : "",
                    ].join(" ")}
                  >
                    <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab transition-colors shrink-0" />
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForKey(cat.key) }} />
                    <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                      <span className="text-sm font-medium truncate">{cat.label}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md shrink-0"
                        style={{ backgroundColor: `${colorForKey(cat.key)}18`, color: colorForKey(cat.key) }}>
                        {cat.short}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" onClick={() => openEdit(cat)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(cat)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zone — full width */}
          <div className="bg-card border border-destructive/30 rounded-md overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-destructive/20">
              <div className="size-7 sm:h-8 sm:w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <UserX className="size-3.5 sm:h-4 sm:w-4 text-destructive" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Irreversible actions{"—"}proceed with caution</p>
              </div>
            </div>
            <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently deletes your account and all data{"—"}logs, categories, everything. This cannot be undone.</p>
              </div>
              <Button size="sm" variant="destructive" className="w-full sm:w-auto shrink-0" onClick={() => { setDeleteAccountOpen(true); setDeleteConfirmText(""); }}>
                Delete account
              </Button>
            </div>
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
                onKeyDown={(e) => e.key === "Enter" && handleSave()} />
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
              {isBusy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
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
      <AlertDialog open={deleteAccountOpen} onOpenChange={(o) => { if (o) return; setDeleteAccountOpen(false); setDeleteConfirmText(""); setDeletePassword(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">This will permanently delete your account and <strong>all your data</strong>{"—"}every log entry, every category. This action <strong>cannot be undone</strong>.</span>
              <span className="block pt-1">Type <strong>DELETE</strong> to confirm:</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 mt-1">
            <Input
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel onClick={() => { setDeleteConfirmText(""); setDeletePassword(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || !deletePassword || deleteAccountLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteAccountLoading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
