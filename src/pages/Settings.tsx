import { useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ar/PageHeader";
import { FigHeader } from "@/components/ar/industrial";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/hooks/useAuditLog";
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from "@/hooks/useCategories";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// Import modular components & types
import { AccountCard } from "@/components/ar/settings/AccountCard";
import {
  ProfilePasswordCard,
  type ProfileState,
  type ProfileAction,
  type PwState,
  type PwAction,
} from "@/components/ar/settings/ProfilePasswordCard";
import { AboutCard } from "@/components/ar/settings/AboutCard";
import {
  CategorySection,
  type CatState,
  type CatAction,
  type CategoryFormState,
} from "@/components/ar/settings/CategorySection";
import { DangerZone, type DelState, type DelAction } from "@/components/ar/settings/DangerZone";

function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

const emptyForm: CategoryFormState = { label: "", short: "" };

// ── Reducers ────────────────────────────────────────────────────────────────
const catInit: CatState = {
  dialogOpen: false,
  editingKey: null,
  form: emptyForm,
  formError: "",
  deleteTarget: null,
  dragging: null,
  dragOver: null,
};

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

// ── Settings Page ───────────────────────────────────────────────────────────
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

  const [cat, catDispatch] = useReducer(catReducer, catInit);
  const [pwState, pwDispatch] = useReducer(pwReducer, pwInit);
  const [delState, delDispatch] = useReducer(delReducer, delInit);
  const [profileState, profileDispatch] = useReducer(profileReducer, profileInit);

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

  function handleDrop(targetKey: string) {
    if (!cat.dragging || cat.dragging === targetKey) { catDispatch({ type: "drag_end" }); return; }
    const from = categories.findIndex((c) => c.key === cat.dragging);
    const to = categories.findIndex((c) => c.key === targetKey);
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next, {
      onSuccess: () => { toast.success("Category order updated."); }
    });
    catDispatch({ type: "drag_end" });
  }

  function handleMove(key: string, dir: -1 | 1) {
    const from = categories.findIndex((c) => c.key === key);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next, {
      onSuccess: () => { toast.success("Category order updated."); }
    });
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
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          <FigHeader code="FIG.01" title="Account" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <AccountCard email={user?.email} createdAt={user?.created_at} />
            <ProfilePasswordCard
              profile={profile}
              profileState={profileState}
              pwState={pwState}
              profileDispatch={profileDispatch}
              pwDispatch={pwDispatch}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
            />
            <AboutCard categoriesCount={categories.length} logsCount={logs.length} />
          </div>

          <FigHeader code="FIG.02" title="Categories" />
          <CategorySection
            categories={categories}
            isLoading={isLoading}
            cat={cat}
            catDispatch={catDispatch}
            isBusy={isBusy}
            onAdd={() => catDispatch({ type: "open_add" })}
            onEdit={(c) => catDispatch({ type: "open_edit", cat: c })}
            onSave={handleSave}
            onDelete={handleDelete}
            onDragStart={(key) => catDispatch({ type: "drag_start", key })}
            onDragOver={(e, key) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (cat.dragOver !== key) catDispatch({ type: "drag_over", key });
            }}
            onDrop={handleDrop}
            onMove={handleMove}
          />

          <FigHeader code="FIG.03" title="Danger Zone" />
          <DangerZone delState={delState} delDispatch={delDispatch} onDeleteAccount={handleDeleteAccount} />
        </div>
      </main>
    </>
  );
}
