import { useReducer } from "react";
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

// ── Category dialog state ──────────────────────────────────────────────────
interface CatState {
  dialogOpen: boolean;
  editingKey: string | null;
  form: CategoryFormState;
  formError: string;
  deleteTarget: Category | null;
  dragging: string | null;
  dragOver: string | null;
}
type CatAction =
  | { type: "open_add" }
  | { type: "open_edit"; cat: Category }
  | { type: "set_form"; patch: Partial<CategoryFormState> }
  | { type: "set_error"; msg: string }
  | { type: "close_dialog" }
  | { type: "set_delete_target"; cat: Category | null }
  | { type: "drag_start"; key: string }
  | { type: "drag_over"; key: string }
  | { type: "drag_end" };

const catInit: CatState = { dialogOpen: false, editingKey: null, form: emptyForm, formError: "", deleteTarget: null, dragging: null, dragOver: null };

function catReducer(s: CatState, a: CatAction): CatState {
  switch (a.type) {
    case "open_add": return { ...s, dialogOpen: true, editingKey: null, form: emptyForm, formError: "" };
    case "open_edit": return { ...s, dialogOpen: true, editingKey: a.cat.key, form: { label: a.cat.label, short: a.cat.short }, formError: "" };
    case "set_form": return { ...s, form: { ...s.form, ...a.patch } };
    case "set_error": return { ...s, formError: a.msg };
    case "close_dialog": return { ...s, dialogOpen: false };
    case "set_delete_target": return { ...s, deleteTarget: a.cat };
    case "drag_start": return { ...s, dragging: a.key };
    case "drag_over": return { ...s, dragOver: a.key };
    case "drag_end": return { ...s, dragging: null, dragOver: null };
    default: return s;
  }
}

// ── Password state ─────────────────────────────────────────────────────────
interface PwState { open: boolean; next: string; confirm: string; loading: boolean; error: string; }
type PwAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<PwState, "next" | "confirm">> }
  | { type: "submitting" }
  | { type: "done"; error?: string };

const pwInit: PwState = { open: false, next: "", confirm: "", loading: false, error: "" };

function pwReducer(s: PwState, a: PwAction): PwState {
  switch (a.type) {
    case "open": return { ...s, open: true };
    case "close": return { ...pwInit };
    case "set": return { ...s, ...a.patch, error: "" };
    case "submitting": return { ...s, loading: true, error: "" };
    case "done": return { ...s, loading: false, error: a.error ?? "", ...(a.error ? {} : { open: false, next: "", confirm: "" }) };
    default: return s;
  }
}

// ── Delete account state ───────────────────────────────────────────────────
interface DelState { open: boolean; confirmText: string; password: string; loading: boolean; }
type DelAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set_text"; text: string }
  | { type: "set_pw"; pw: string }
  | { type: "submitting" }
  | { type: "done" };

const delInit: DelState = { open: false, confirmText: "", password: "", loading: false };

function delReducer(s: DelState, a: DelAction): DelState {
  switch (a.type) {
    case "open": return { ...delInit, open: true };
    case "close": return { ...delInit };
    case "set_text": return { ...s, confirmText: a.text };
    case "set_pw": return { ...s, password: a.pw };
    case "submitting": return { ...s, loading: true };
    case "done": return { ...delInit };
    default: return s;
  }
}

// ── Profile state ──────────────────────────────────────────────────────────
interface ProfileState { open: boolean; first_name: string; last_name: string; loading: boolean; }
type ProfileAction =
  | { type: "open"; first_name: string; last_name: string }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<ProfileState, "first_name" | "last_name">> }
  | { type: "submitting" }
  | { type: "done" };

const profileInit: ProfileState = { open: false, first_name: "", last_name: "", loading: false };

function profileReducer(s: ProfileState, a: ProfileAction): ProfileState {
  switch (a.type) {
    case "open": return { open: true, first_name: a.first_name, last_name: a.last_name, loading: false };
    case "close": return { ...profileInit };
    case "set": return { ...s, ...a.patch };
    case "submitting": return { ...s, loading: true };
    case "done": return { ...profileInit };
    default: return s;
  }
}

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

  const [cat, catDispatch] = useReducer(catReducer, catInit);
  const [pwState, pwDispatch] = useReducer(pwReducer, pwInit);
  const [delState, delDispatch] = useReducer(delReducer, delInit);
  const [profileState, profileDispatch] = useReducer(profileReducer, profileInit);

  function openAdd() { catDispatch({ type: "open_add" }); }
  function openEdit(c: Category) { catDispatch({ type: "open_edit", cat: c }); }

  function handleSave() {
    const label = cat.form.label.trim();
    const short = cat.form.short.trim();
    if (!label) { catDispatch({ type: "set_error", msg: "Label is required." }); return; }
    if (!short) { catDispatch({ type: "set_error", msg: "Short name is required." }); return; }
    if (short.length > 10) { catDispatch({ type: "set_error", msg: "Short name must be 10 characters or fewer." }); return; }

    if (cat.editingKey) {
      updateCategory.mutate({ key: cat.editingKey, updates: { label, short } }, {
        onSuccess: () => { toast.success("Category updated."); catDispatch({ type: "close_dialog" }); },
      });
    } else {
      const key = toKey(label);
      if (!key) { catDispatch({ type: "set_error", msg: "Could not derive a key from this label." }); return; }
      if (categories.some((c) => c.key === key)) {
        catDispatch({ type: "set_error", msg: "A category with this name already exists." });
        return;
      }
      addCategory.mutate(
        { key, label, short, position: categories.length },
        { onSuccess: () => { toast.success("Category added."); catDispatch({ type: "close_dialog" }); } },
      );
    }
  }

  function handleDelete() {
    if (!cat.deleteTarget) return;
    deleteCategory.mutate(cat.deleteTarget.key, {
      onSuccess: () => { toast.success(`"${cat.deleteTarget!.label}" removed.`); catDispatch({ type: "set_delete_target", cat: null }); },
    });
  }

  function handleDragStart(key: string) { catDispatch({ type: "drag_start", key }); }
  function handleDragOver(e: React.DragEvent, key: string) { e.preventDefault(); catDispatch({ type: "drag_over", key }); }
  function handleDrop(targetKey: string) {
    if (!cat.dragging || cat.dragging === targetKey) { catDispatch({ type: "drag_end" }); return; }
    const from = categories.findIndex((c) => c.key === cat.dragging);
    const to = categories.findIndex((c) => c.key === targetKey);
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next);
    catDispatch({ type: "drag_end" });
  }

  const handleChangePassword = async () => {
    if (!pwState.next) { pwDispatch({ type: "done", error: "New password is required." }); return; }
    if (pwState.next.length < 6) { pwDispatch({ type: "done", error: "Password must be at least 6 characters." }); return; }
    if (pwState.next !== pwState.confirm) { pwDispatch({ type: "done", error: "Passwords do not match." }); return; }
    pwDispatch({ type: "submitting" });
    const { error } = await supabase.auth.updateUser({ password: pwState.next });
    if (error) { pwDispatch({ type: "done", error: error.message }); return; }
    await logAuditEvent("password_changed");
    toast.success("Password updated.");
    pwDispatch({ type: "done" });
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
    if (delState.confirmText !== "DELETE") return;
    if (!delState.password) { toast.error("Password is required to delete your account."); return; }
    delDispatch({ type: "submitting" });
    try {
      const email = user?.email;
      if (!email) throw new Error("Not authenticated");
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: delState.password });
      if (authError) throw new Error("Incorrect password.");
      const { error: deleteError } = await supabase.rpc("delete_own_account");
      if (deleteError) throw deleteError;
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Account and all data deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account.");
      delDispatch({ type: "done" });
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileState.first_name.trim()) { toast.error("First name is required."); return; }
    if (!profileState.last_name.trim()) { toast.error("Last name is required."); return; }
    profileDispatch({ type: "submitting" });
    try {
      await updateProfile.mutateAsync({
        first_name: profileState.first_name.trim(),
        last_name: profileState.last_name.trim(),
      });
      toast.success("Profile updated.");
      profileDispatch({ type: "done" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile.");
      profileDispatch({ type: "done" });
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
                {!profileState.open ? (
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                      <p className="text-sm font-medium">
                        {profile?.first_name || profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`.trim()
                          : <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() =>
                      profileDispatch({ type: "open", first_name: profile?.first_name ?? "", last_name: profile?.last_name ?? "" })
                    }>
                      Edit name
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">First name</Label>
                      <Input placeholder="First name" value={profileState.first_name}
                        onChange={(e) => profileDispatch({ type: "set", patch: { first_name: e.target.value } })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Last name</Label>
                      <Input placeholder="Last name" value={profileState.last_name}
                        onChange={(e) => profileDispatch({ type: "set", patch: { last_name: e.target.value } })}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateProfile()} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => profileDispatch({ type: "close" })}>Cancel</Button>
                      <Button size="sm" className="flex-1" onClick={handleUpdateProfile} disabled={profileState.loading}>
                        {profileState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
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
                {!pwState.open ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">Change your login password. You&#39;ll stay signed in after updating.</p>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => pwDispatch({ type: "open" })}>
                      Change password
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">New password</Label>
                      <Input type="password" placeholder="••••••••" minLength={6} value={pwState.next}
                        onChange={(e) => pwDispatch({ type: "set", patch: { next: e.target.value } })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Confirm password</Label>
                      <Input type="password" placeholder="••••••••" value={pwState.confirm}
                        onChange={(e) => pwDispatch({ type: "set", patch: { confirm: e.target.value } })}
                        onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} />
                    </div>
                    {pwState.error && <p className="text-xs text-destructive">{pwState.error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => pwDispatch({ type: "close" })}>Cancel</Button>
                      <Button size="sm" className="flex-1" onClick={handleChangePassword} disabled={pwState.loading}>
                        {pwState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
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
                {categories.map((c) => (
                  <div
                    key={c.key}
                    draggable
                    onDragStart={() => handleDragStart(c.key)}
                    onDragOver={(e) => handleDragOver(e, c.key)}
                    onDrop={() => handleDrop(c.key)}
                    onDragEnd={() => catDispatch({ type: "drag_end" })}
                    className={[
                      "group flex items-center gap-3 px-4 sm:px-5 py-3.5 transition-colors select-none touch-manipulation",
                      cat.dragOver === c.key && cat.dragging !== c.key ? "bg-primary/5" : "hover:bg-muted/30",
                      cat.dragging === c.key ? "opacity-30" : "",
                    ].join(" ")}
                  >
                    <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab transition-colors shrink-0" />
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForKey(c.key) }} />
                    <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                      <span className="text-sm font-medium truncate">{c.label}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md shrink-0"
                        style={{ backgroundColor: `${colorForKey(c.key)}18`, color: colorForKey(c.key) }}>
                        {c.short}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" onClick={() => catDispatch({ type: "set_delete_target", cat: c })}>
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
              <Button size="sm" variant="destructive" className="w-full sm:w-auto shrink-0" onClick={() => delDispatch({ type: "open" })}>
                Delete account
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Add / Edit dialog */}
      <Dialog open={cat.dialogOpen} onOpenChange={(o) => !o && catDispatch({ type: "close_dialog" })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{cat.editingKey ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="cat-label">Label</Label>
              <Input id="cat-label" placeholder="e.g. Worked on NG" value={cat.form.label}
                onChange={(e) => catDispatch({ type: "set_form", patch: { label: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && handleSave()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-short">Short name</Label>
              <Input id="cat-short" placeholder="e.g. NG" maxLength={10} value={cat.form.short}
                onChange={(e) => catDispatch({ type: "set_form", patch: { short: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && handleSave()} />
              <p className="text-xs text-muted-foreground">Shown in compact views · max 10 chars</p>
            </div>
            {cat.formError && <p className="text-xs text-destructive">{cat.formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => catDispatch({ type: "close_dialog" })}>Cancel</Button>
            <Button onClick={handleSave} disabled={isBusy}>
              {isBusy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {cat.editingKey ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <AlertDialog open={!!cat.deleteTarget} onOpenChange={(o) => !o && catDispatch({ type: "set_delete_target", cat: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove category?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>&#34;{cat.deleteTarget?.label}&#34;</strong> will be removed. Existing log data is unaffected.
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
      <AlertDialog open={delState.open} onOpenChange={(o) => !o && delDispatch({ type: "close" })}>
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
              value={delState.confirmText}
              onChange={(e) => delDispatch({ type: "set_text", text: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Enter your password to confirm"
              value={delState.password}
              onChange={(e) => delDispatch({ type: "set_pw", pw: e.target.value })}
            />
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel onClick={() => delDispatch({ type: "close" })}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={delState.confirmText !== "DELETE" || !delState.password || delState.loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {delState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
