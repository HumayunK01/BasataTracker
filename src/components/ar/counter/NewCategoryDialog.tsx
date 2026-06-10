import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddCategory, useCategories, type Category } from "@/hooks/useCategories";
import { toast } from "sonner";
import { HelpCircle, Info, Loader2, Tag } from "lucide-react";

// Same key derivation as the Settings page so both entry points agree
function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

interface NewCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created category, e.g. to add it to the counter */
  onCreated?: (cat: Category) => void;
}

export function NewCategoryDialog({ open, onOpenChange, onCreated }: NewCategoryDialogProps) {
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const [label, setLabel] = useState("");
  const [short, setShort] = useState("");
  const [error, setError] = useState("");

  const close = (o: boolean) => {
    if (!o) {
      setLabel("");
      setShort("");
      setError("");
    }
    onOpenChange(o);
  };

  const save = () => {
    const l = label.trim();
    const s = short.trim();
    if (!l) { setError("Label is required."); return; }
    if (!s) { setError("Short name is required."); return; }
    if (s.length > 10) { setError("Short name must be 10 characters or fewer."); return; }
    const key = toKey(l);
    if (!key) { setError("Could not derive a key from this label."); return; }
    if (categories.some((c) => c.key === key)) {
      setError("A category with this name already exists.");
      return;
    }
    const cat: Category = { key, label: l, short: s, position: categories.length };
    addCategory.mutate(cat, {
      onSuccess: () => {
        toast.success("Category added.");
        onCreated?.(cat);
        close(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            Add New Category
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2 bg-info/10 border border-info/20 rounded-md p-2.5 text-xs leading-normal">
            <HelpCircle className="size-4 text-info shrink-0 mt-0.5" />
            <span className="text-muted-foreground">
              The new category is saved to your account and added to this counter right away.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="counter-cat-label" className="text-xs font-semibold text-muted-foreground">Category Label</Label>
            <Input
              id="counter-cat-label"
              placeholder="e.g. Worked on NG"
              value={label}
              className="font-medium"
              onChange={(e) => { setLabel(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="counter-cat-short" className="text-xs font-semibold text-muted-foreground">Abbreviation / Short Name</Label>
            <Input
              id="counter-cat-short"
              placeholder="e.g. NG"
              maxLength={10}
              value={short}
              className="font-semibold"
              onChange={(e) => { setShort(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-[10px] text-muted-foreground">Displayed on counters and mobile screens (Max 10 chars)</p>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="border-border/60" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={addCategory.isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20">
            {addCategory.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
