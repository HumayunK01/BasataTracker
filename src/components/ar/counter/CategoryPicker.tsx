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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
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
          className="pl-9"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Search className="size-8 opacity-20" />
            <p className="text-sm">No categories match &ldquo;{q}&rdquo;.</p>
          </div>
        ) : (
          filtered.map((cat) => {
            const clr = colorForKey(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onPick(cat)}
                className="w-full flex items-center gap-3 p-2.5 rounded-md border border-transparent hover:border-border/60 hover:bg-muted/50 active:bg-muted active:scale-[0.99] transition-[background-color,border-color,transform] duration-150 text-left touch-manipulation group"
              >
                <span
                  className="size-8 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0 group-hover:scale-105 transition-transform"
                  style={{
                    color: clr,
                    backgroundColor: withAlpha(clr, 0.13),
                    border: `1px solid ${withAlpha(clr, 0.25)}`,
                  }}
                >
                  {cat.short.slice(0, 3)}
                </span>
                <span className="text-sm flex-1 font-medium truncate">{cat.label}</span>
                <span className="size-6 rounded-full flex items-center justify-center text-muted-foreground bg-muted/40 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Plus className="size-3.5" />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CategoryPicker({ open, onOpenChange, categories, onPick }: CategoryPickerProps) {
  const isMobile = useIsMobile();
  const handlePick = (cat: Category) => {
    onPick(cat);
    onOpenChange(false);
  };

  const subtitle = `${categories.length} ${categories.length === 1 ? "category" : "categories"} available. Pick one to start counting.`;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background/95 backdrop-blur-lg border-t border-border/60">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base font-semibold">Add category</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">{subtitle}</DrawerDescription>
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
          <DialogDescription className="text-xs text-muted-foreground">{subtitle}</DialogDescription>
        </DialogHeader>
        <CategoryPickerList categories={categories} onPick={handlePick} autoFocusSearch />
      </DialogContent>
    </Dialog>
  );
}
