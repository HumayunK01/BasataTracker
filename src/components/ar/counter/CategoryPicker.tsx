import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Plus, Search } from "lucide-react";

interface CategoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onPick: (cat: Category) => void;
}

function CategoryPickerList({
  categories,
  onPick,
  autoFocusSearch = false,
}: Pick<CategoryPickerProps, "categories" | "onPick"> & { autoFocusSearch?: boolean }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter(
      (c) => c.label.toLowerCase().includes(s) || c.short.toLowerCase().includes(s),
    );
  }, [q, categories]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // Search is the modal's single purpose; skipped on mobile so the
          // keyboard doesn't pop over the drawer
          autoFocus={autoFocusSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length > 0) onPick(filtered[0]);
          }}
          placeholder="Search categories…"
          className="pl-9 bg-background/60"
        />
      </div>
      <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1 space-y-1.5 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-foreground">
            <div className="size-12 rounded-xl border border-border/50 grid place-items-center">
              <Search className="size-5 opacity-30" />
            </div>
            <p className="text-sm">No categories match &ldquo;{q}&rdquo;.</p>
          </div>
        ) : (
          <>
            {q.trim() && (
              <p className="font-mono text-2xs uppercase tracking-[0.2em] text-foreground px-1 pb-0.5">
                {filtered.length} match{filtered.length === 1 ? "" : "es"}
              </p>
            )}
            {filtered.map((cat) => {
              const clr = colorForKey(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onPick(cat)}
                  className="relative w-full group flex items-center gap-3 p-2.5 rounded-lg border text-left overflow-hidden active:scale-[0.99] transition-transform duration-150 touch-manipulation"
                  style={{
                    borderColor: withAlpha(clr, 0.18),
                    backgroundColor: withAlpha(clr, 0.04),
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none transition-colors duration-150 group-hover:bg-foreground/[0.035]"
                  />
                  <span
                    className="relative size-9 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0 group-hover:scale-105 transition-transform duration-150"
                    style={{
                      color: clr,
                      backgroundColor: withAlpha(clr, 0.13),
                      border: `1px solid ${withAlpha(clr, 0.28)}`,
                    }}
                  >
                    {cat.short.slice(0, 3)}
                  </span>
                  <span className="relative text-sm flex-1 font-medium truncate">{cat.label}</span>
                  <span
                    className="relative size-7 rounded-md flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      color: clr,
                      border: `1px solid ${withAlpha(clr, 0.22)}`,
                      backgroundColor: withAlpha(clr, 0.08),
                    }}
                  >
                    <Plus className="size-3.5" />
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
      {autoFocusSearch && (
        <p className="flex items-center justify-end gap-1.5 pt-1 text-2xs text-foreground">
          <kbd className="font-mono font-semibold px-1.5 py-0.5 rounded border border-border/40 bg-background/60">Enter</kbd>
          adds first match
        </p>
      )}
    </div>
  );
}

export function CategoryPicker({ open, onOpenChange, categories, onPick }: CategoryPickerProps) {
  const isMobile = useIsMobile();
  const handlePick = (cat: Category) => {
    onPick(cat);
    onOpenChange(false);
  };

  const subtitle = `Pick from ${categories.length} categor${categories.length === 1 ? "y" : "ies"} to add to the counter`;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background/95 backdrop-blur-lg border-t border-border/60">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base font-semibold">Add category</DrawerTitle>
            <DrawerDescription className="text-xs text-foreground">{subtitle}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <CategoryPickerList categories={categories} onPick={handlePick} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-lg border border-border/60">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add category</DialogTitle>
          <DialogDescription className="text-xs text-foreground">{subtitle}</DialogDescription>
        </DialogHeader>
        <CategoryPickerList categories={categories} onPick={handlePick} autoFocusSearch />
      </DialogContent>
    </Dialog>
  );
}
