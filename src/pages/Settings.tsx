import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { Plus, Pencil, Trash2, GripVertical, Tag, Loader2, KeyRound } from "lucide-react";
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: categories = [], isLoading } = useCategories();
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

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    setDragOver(key);
  }

  function handleDrop(targetKey: string) {
    if (!dragging || dragging === targetKey) {
      setDragging(null); setDragOver(null); return;
    }
    const from = categories.findIndex((c) => c.key === dragging);
    const to = categories.findIndex((c) => c.key === targetKey);
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next);
    setDragging(null); setDragOver(null);
  }

  const isBusy = addCategory.isPending || updateCategory.isPending;

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

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
    setPw({ current: "", next: "", confirm: "" });
  };

  return (
    <>

          <header className="border-b border-border shrink-0">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="shrink-0" />
              <div className="flex items-center gap-3 min-w-0">
                <img src="/logo.png" alt="Basata Tracker" className="h-7 sm:h-9 object-contain shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Manage categories and preferences</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">

              {/* Categories */}
              <section>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">Categories</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Drag rows to reorder · {categories.length} total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {categories.length === 0 && !isLoading && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seedDefaults.mutate()}
                        disabled={seedDefaults.isPending}
                      >
                        {seedDefaults.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Load defaults
                      </Button>
                    )}
                    <Button size="sm" onClick={openAdd} className="shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add category
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {isLoading ? (
                    <div className="p-3 space-y-px">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-1 py-2.5">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-5 w-12 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No categories yet. Add one or load defaults.
                    </div>
                  ) : (
                    categories.map((cat, i) => (
                      <div key={cat.key}>
                        {i > 0 && <Separator />}
                        <div
                          draggable
                          onDragStart={() => handleDragStart(cat.key)}
                          onDragOver={(e) => handleDragOver(e, cat.key)}
                          onDrop={() => handleDrop(cat.key)}
                          onDragEnd={() => { setDragging(null); setDragOver(null); }}
                          className={[
                            "group flex items-center gap-3 px-4 py-3.5 transition-colors select-none",
                            dragOver === cat.key && dragging !== cat.key
                              ? "bg-primary/5"
                              : "hover:bg-muted/30",
                            dragging === cat.key ? "opacity-30" : "",
                          ].join(" ")}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab transition-colors shrink-0" />
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <span className="text-sm font-medium truncate">{cat.label}</span>
                            <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                              {cat.short}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(cat)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Account */}
              <section>
                <h2 className="text-[11px] font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Account</h2>
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{user?.email}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Password</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setPwOpen((v) => !v); setPwError(""); setPw({ current: "", next: "", confirm: "" }); }}
                      >
                        {pwOpen ? "Cancel" : "Change"}
                      </Button>
                    </div>
                    {pwOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">New password</Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            minLength={6}
                            value={pw.next}
                            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Confirm new password</Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={pw.confirm}
                            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                          />
                        </div>
                        {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                        <Button size="sm" onClick={handleChangePassword} disabled={pwLoading} className="w-full">
                          {pwLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Update password
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* About */}
              <section>
                <h2 className="text-[11px] font-semibold mb-4 text-muted-foreground uppercase tracking-wider">About</h2>
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Application</span>
                    <img src="/logo.png" alt="Basata Tracker" className="h-6 object-contain" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="text-sm font-medium font-mono">1.0.0</span>
                  </div>
                </div>
              </section>

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
              <Input
                id="cat-label"
                placeholder="e.g. Worked on NG"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-short">Short name</Label>
              <Input
                id="cat-short"
                placeholder="e.g. NG"
                maxLength={10}
                value={form.short}
                onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
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

      {/* Delete confirm */}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
