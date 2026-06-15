import { useEffect, useState } from "react";
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
import { useRenameFaxAccount, type FaxAccount } from "@/hooks/useFaxAccounts";
import { Info, Loader2, Pencil } from "lucide-react";

interface RenameAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account being renamed. */
  account: FaxAccount | null;
}

export function RenameAccountDialog({ open, onOpenChange, account }: RenameAccountDialogProps) {
  const renameAccount = useRenameFaxAccount();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(account?.name ?? ""); setError(""); }
  }, [open, account]);

  const save = () => {
    const n = name.trim();
    if (!account) return;
    if (!n) { setError("Account name is required."); return; }
    if (n === account.name) { onOpenChange(false); return; }
    renameAccount.mutate(
      { id: account.id, name: n },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Pencil className="size-4 text-primary" />
            Rename Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fax-rename-name" className="text-xs font-semibold text-muted-foreground">Account Name</Label>
            <Input
              id="fax-rename-name"
              placeholder="e.g. Ayush Rathi"
              value={name}
              className="font-medium"
              autoFocus
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={renameAccount.isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20">
            {renameAccount.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
