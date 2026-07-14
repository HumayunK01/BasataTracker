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
import { useCreateFolder, type CredentialFolder } from "@/hooks/useCredentials";
import { FolderPlus, Info, Loader2 } from "lucide-react";

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created folder, e.g. to select it right away. */
  onCreated?: (folder: CredentialFolder) => void;
}

export function NewFolderDialog({ open, onOpenChange, onCreated }: NewFolderDialogProps) {
  const createFolder = useCreateFolder();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(""); setError(""); }
  }, [open]);

  const save = () => {
    const n = name.trim();
    if (!n) { setError("Folder name is required."); return; }
    createFolder.mutate(n, {
      onSuccess: (folder) => {
        onCreated?.(folder);
        onOpenChange(false);
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <FolderPlus className="size-4 text-primary" />
            New Folder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cred-folder-name" className="text-xs font-semibold text-muted-foreground">Folder Name</Label>
            <Input
              id="cred-folder-name"
              placeholder="e.g. Client A, Personal"
              value={name}
              className="font-medium"
              autoFocus
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-xs text-muted-foreground">Each folder keeps its own separate list of credentials.</p>
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
          <Button onClick={save} disabled={createFolder.isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20">
            {createFolder.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
