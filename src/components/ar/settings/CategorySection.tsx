import type { Dispatch, DragEvent } from "react";
import { colorForKey } from "@/lib/cat-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, GripVertical, Tag, Loader2, Info, HelpCircle } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import type { Category } from "@/hooks/useCategories";

export interface CategoryFormState {
  label: string;
  short: string;
}

export interface CatState {
  dialogOpen: boolean;
  editingKey: string | null;
  form: CategoryFormState;
  formError: string;
  deleteTarget: Category | null;
  dragging: string | null;
  dragOver: string | null;
}

export type CatAction =
  | { type: "open_add" }
  | { type: "open_edit"; cat: Category }
  | { type: "set_form"; patch: Partial<CategoryFormState> }
  | { type: "set_error"; msg: string }
  | { type: "close_dialog" }
  | { type: "set_delete_target"; cat: Category | null }
  | { type: "drag_start"; key: string }
  | { type: "drag_over"; key: string }
  | { type: "drag_end" };

interface CategorySectionProps {
  categories: Category[];
  isLoading: boolean;
  cat: CatState;
  catDispatch: Dispatch<CatAction>;
  isBusy: boolean;
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onSave: () => void;
  onDelete: () => void;
  onSeedDefaults: () => void;
  isSeedingPending: boolean;
  onDragStart: (key: string) => void;
  onDragOver: (e: DragEvent, key: string) => void;
  onDrop: (key: string) => void;
}

export function CategorySection({
  categories,
  isLoading,
  cat,
  catDispatch,
  isBusy,
  onAdd,
  onEdit,
  onSave,
  onDelete,
  onSeedDefaults,
  isSeedingPending,
  onDragStart,
  onDragOver,
  onDrop,
}: CategorySectionProps) {
  return (
    <>
      <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden hover:border-primary/10 hover:shadow-sm hover:shadow-primary/[0.02] transition-[border-color,box-shadow] duration-200 font-[system-ui]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/[0.04]">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/95">Categories</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block">
                Drag to rearrange keys · {categories.length} active categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {categories.length === 0 && !isLoading && (
              <Button size="sm" variant="outline" className="border-border/60 text-xs h-8" onClick={onSeedDefaults} disabled={isSeedingPending}>
                {isSeedingPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                <span className="hidden xs:inline">Load </span>defaults
              </Button>
            )}
            <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs h-8 shadow-sm" onClick={onAdd}>
              <Plus className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Add category</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted/[0.02] rounded-lg">
                <Skeleton width={16} height={16} borderRadius={4} />
                <Skeleton width="100%" height={16} borderRadius={4} />
                <Skeleton width={56} height={20} borderRadius={4} />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Tag className="size-10 opacity-20 animate-pulse" />
            <p className="text-sm">No categories yet. Click Add Category or Seed Defaults.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {categories.map((c) => (
              <div
                key={c.key}
                draggable
                onDragStart={() => onDragStart(c.key)}
                onDragOver={(e) => onDragOver(e, c.key)}
                onDrop={() => onDrop(c.key)}
                onDragEnd={() => catDispatch({ type: "drag_end" })}
                className={[
                  "group flex items-center gap-4 px-5 py-4 transition-all duration-200 select-none touch-manipulation",
                  cat.dragOver === c.key && cat.dragging !== c.key 
                    ? "bg-primary/10 border-t border-b border-primary/20 scale-[0.99] shadow-inner" 
                    : "hover:bg-muted/[0.07]",
                  cat.dragging === c.key ? "opacity-35 scale-[0.98] border-dashed border-border" : "",
                ].join(" ")}
              >
                <div className="cursor-grab active:cursor-grabbing p-1 -m-1 shrink-0">
                  <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                </div>
                <span className="size-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: colorForKey(c.key) }} />
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground/90 truncate">{c.label}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 shadow-sm"
                    style={{ backgroundColor: `${colorForKey(c.key)}18`, color: colorForKey(c.key) }}
                  >
                    {c.short}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    title={`Edit ${c.label}`}
                    onClick={() => onEdit(c)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title={`Delete ${c.label}`}
                    onClick={() => catDispatch({ type: "set_delete_target", cat: c })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={cat.dialogOpen} onOpenChange={(o) => !o && catDispatch({ type: "close_dialog" })}>
        <DialogContent className="sm:max-w-sm font-[system-ui] bg-background/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              {cat.editingKey ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Custom Info Banner */}
            {!cat.editingKey && (
              <div className="flex gap-2 bg-info/10 border border-info/20 rounded-xl p-2.5 text-xs leading-normal">
                <HelpCircle className="size-4 text-info shrink-0 mt-0.5" />
                <span className="text-info-foreground/90">
                  Labels drive dynamic key binding (e.g. <strong>&ldquo;Worked on NG&rdquo;</strong> will generate the database target key <strong>&ldquo;worked_on_ng&rdquo;</strong>).
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cat-label" className="text-xs font-semibold text-muted-foreground">Category Label</Label>
              <Input
                id="cat-label"
                placeholder="e.g. Worked on NG"
                value={cat.form.label}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-colors font-medium"
                onChange={(e) => catDispatch({ type: "set_form", patch: { label: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-short" className="text-xs font-semibold text-muted-foreground">Abbreviation / Short Name</Label>
              <Input
                id="cat-short"
                placeholder="e.g. NG"
                maxLength={10}
                value={cat.form.short}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-colors font-semibold"
                onChange={(e) => catDispatch({ type: "set_form", patch: { short: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
              <p className="text-[10px] text-muted-foreground">Displayed on counters and mobile screens (Max 10 chars)</p>
            </div>
            
            {cat.formError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 animate-fade-in font-medium">
                <Info className="size-3.5 shrink-0" />
                <span>{cat.formError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60" onClick={() => catDispatch({ type: "close_dialog" })}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isBusy} className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20">
              {isBusy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {cat.editingKey ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <AlertDialog
        open={!!cat.deleteTarget}
        onOpenChange={(o) => !o && catDispatch({ type: "set_delete_target", cat: null })}
      >
        <AlertDialogContent className="font-[system-ui] bg-background/95 backdrop-blur-lg border-destructive/25">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Info className="size-5 shrink-0 animate-pulse" />
              Remove Document Category?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-2 text-sm leading-relaxed text-muted-foreground">
              <span>
                Removing <strong>&ldquo;{cat.deleteTarget?.label}&rdquo;</strong> (`{cat.deleteTarget?.short}`) will delete it from counters and form selections.
              </span>
              
              <span className="flex gap-2.5 bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs leading-normal">
                <Info className="size-4 text-warning shrink-0 mt-0.5" />
                <span className="text-warning-foreground/90">
                  Existing logging history in your daily tables is not erased, but this category will no longer appear on the Counter active list.
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/95 shadow-sm shadow-destructive/20 font-semibold"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
