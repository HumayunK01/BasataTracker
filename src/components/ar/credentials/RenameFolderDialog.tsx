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
import { useRenameFolder, type CredentialFolder } from "@/hooks/useCredentials";
import { Info, Loader2, Pencil, Trash2 } from "lucide-react";

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The folder being renamed. */
  folder: CredentialFolder | null;
  /** Called when the user chooses to delete this folder (opens the page's confirm). */
  onRequestDelete?: (folder: CredentialFolder) => void;
}

export function RenameFolderDialog({ open, onOpenChange, folder, onRequestDelete }: RenameFolderDialogProps) {
  const renameFolder = useRenameFolder();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(folder?.name ?? ""); setError(""); }
  }, [open, folder]);

  const save = () => {
    const n = name.trim();
    if (!folder) return;
    if (!n) { setError("Folder name is required."); return; }
    if (n === folder.name) { onOpenChange(false); return; }
    renameFolder.mutate(
      { id: folder.id, name: n },
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
            Rename Folder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cred-rename-name" className="text-xs font-semibold text-foreground">Folder Name</Label>
            <Input
              id="cred-rename-name"
              placeholder="Folder name"
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
        <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => folder && onRequestDelete?.(folder)}
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="border-border/60" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={renameFolder.isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20">
              {renameFolder.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
