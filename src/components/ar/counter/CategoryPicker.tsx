import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { colorForKey } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Plus, Search } from "lucide-react";

interface CategoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onPick: (cat: Category) => void;
}

function CategoryPickerList({ categories, onPick }: Pick<CategoryPickerProps, "categories" | "onPick">) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter(
      (c) => c.label.toLowerCase().includes(s) || c.short.toLowerCase().includes(s),
    );
  }, [q, categories]);

  return (
    <div className="space-y-3 font-[system-ui]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search categories…"
          className="pl-9 bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-colors"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1 no-scrollbar">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No categories match.</p>
        ) : (
          filtered.map((cat) => {
            const clr = colorForKey(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onPick(cat)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 active:bg-muted transition-colors text-left touch-manipulation group"
              >
                <span
                  className="size-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                  style={{ color: clr, backgroundColor: `${clr}22` }}
                >
                  {cat.short.slice(0, 3)}
                </span>
                <span className="text-sm flex-1 font-[system-ui] font-medium truncate text-foreground/90">{cat.label}</span>
                <Plus className="size-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="font-[system-ui] bg-background/95 backdrop-blur-lg border-t border-border/60">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base font-bold text-foreground">Add category</DrawerTitle>
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
      <DialogContent className="sm:max-w-md font-[system-ui] bg-background/95 backdrop-blur-lg border border-border/60">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Add category</DialogTitle>
        </DialogHeader>
        <CategoryPickerList categories={categories} onPick={handlePick} />
      </DialogContent>
    </Dialog>
  );
}
