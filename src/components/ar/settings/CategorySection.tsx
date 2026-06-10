import type { Dispatch, DragEvent } from "react";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
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
  onDragStart,
  onDragOver,
  onDrop,
}: CategorySectionProps) {
  return (
    <>
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/[0.04]">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Categories</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 hidden xs:block">
                Drag to rearrange keys · {categories.length} active categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs h-8 shadow-sm" onClick={onAdd}>
              <Plus className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Add category</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 sm:p-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border/60 p-3">
                <Skeleton circle width={10} height={10} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="80%" height={14} borderRadius={4} />
                  <Skeleton width={48} height={10} borderRadius={4} />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Tag className="size-10 opacity-20" />
            <p className="text-sm">No categories yet. Click Add category to create your first one.</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {categories.map((c) => {
              const clr = colorForKey(c.key);
              return (
                <div
                  key={c.key}
                  draggable
                  onDragStart={(e) => {
                    // Firefox refuses to start a drag without data; Chrome
                    // cancels it if the node re-renders during dragstart, so
                    // defer the state update until the drag image is captured.
                    e.dataTransfer.setData("text/plain", c.key);
                    e.dataTransfer.effectAllowed = "move";
                    setTimeout(() => onDragStart(c.key), 0);
                  }}
                  onDragOver={(e) => onDragOver(e, c.key)}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(c.key);
                  }}
                  onDragEnd={() => catDispatch({ type: "drag_end" })}
                  className={[
                    "group flex items-center gap-2.5 rounded-md border p-3 select-none touch-manipulation",
                    "transition-[border-color,background-color,opacity,transform] duration-150",
                    cat.dragOver === c.key && cat.dragging !== c.key
                      ? "border-primary/50 bg-primary/10 scale-[0.99]"
                      : "border-border bg-card hover:bg-muted/40",
                    cat.dragging === c.key ? "opacity-35 scale-[0.98] border-dashed" : "",
                  ].join(" ")}
                >
                  <div className="cursor-grab active:cursor-grabbing shrink-0 -ml-1">
                    <GripVertical className="size-4 text-muted-foreground/40" />
                  </div>
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: clr }} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" title={c.label}>{c.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{c.short}</p>
                  </div>
                  <div className="flex items-center shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      title={`Edit ${c.label}`}
                      onClick={() => onEdit(c)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title={`Delete ${c.label}`}
                      onClick={() => catDispatch({ type: "set_delete_target", cat: c })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={cat.dialogOpen} onOpenChange={(o) => !o && catDispatch({ type: "close_dialog" })}>
        <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              {cat.editingKey ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Custom Info Banner */}
            {!cat.editingKey && (
              <div className="flex gap-2 bg-info/10 border border-info/20 rounded-md p-2.5 text-xs leading-normal">
                <HelpCircle className="size-4 text-info shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
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
                className="font-medium"
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
                className="font-semibold"
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
        <AlertDialogContent className="bg-background/95 backdrop-blur-lg border-destructive/25">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Info className="size-5 shrink-0" />
              Remove Document Category?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-2 text-sm leading-relaxed text-muted-foreground">
              <span>
                Removing <strong>&ldquo;{cat.deleteTarget?.label}&rdquo;</strong> (`{cat.deleteTarget?.short}`) will delete it from counters and form selections.
              </span>
              
              <span className="flex gap-2.5 bg-warning/10 border border-warning/20 rounded-md p-3 text-xs leading-normal">
                <Info className="size-4 text-warning shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
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
