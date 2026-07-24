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
import { useUpsertCredential, type Credential } from "@/hooks/useCredentials";
import { Eye, EyeOff, Info, KeyRound, Loader2 } from "lucide-react";
import type { CredentialFolder } from "@/hooks/useCredentials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The credential being edited, or null when adding. */
  row: Credential | null;
  folderId: string | undefined;
  folders: CredentialFolder[];
}

interface FormState {
  service: string;
  login_id: string;
  password: string;
  notes: string;
  website: string;
}

const EMPTY: FormState = { service: "", login_id: "", password: "", notes: "", website: "" };

export function CredentialDialog({ open, onOpenChange, row, folderId: initialFolderId, folders }: CredentialDialogProps) {
  const upsert = useUpsertCredential();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId ?? "");

  useEffect(() => {
    if (open) {
      setForm(
        row
          ? { service: row.service, login_id: row.login_id, password: row.password, notes: row.notes ?? "", website: row.website ?? "" }
          : EMPTY,
      );
      setSelectedFolderId(initialFolderId ?? "");
      setReveal(false);
      setError("");
    }
  }, [open, row, initialFolderId]);

  const targetFolderId = initialFolderId ?? selectedFolderId;

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const save = () => {
    if (!targetFolderId) { setError("Select a folder first."); return; }
    upsert.mutate(
      {
        row,
        folderId: targetFolderId,
          values: {
            service: form.service,
            login_id: form.login_id,
            password: form.password,
            notes: form.notes.trim() ? form.notes.trim() : null,
            website: form.website.trim() ? form.website.trim() : null,
          },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            {row ? "Edit Credential" : "Add Credential"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!initialFolderId && (
            <div className="space-y-1.5">
              <Label htmlFor="cred-folder" className="text-xs font-semibold text-foreground">Folder</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a folder…" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cred-service" className="text-xs font-semibold text-foreground">Service / Site</Label>
            <Input
              id="cred-service"
              placeholder="e.g. Gmail, Client Portal A"
              value={form.service}
              className="font-medium"
              autoFocus
              onChange={(e) => set("service")(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-website" className="text-xs font-semibold text-foreground">Website <span className="font-normal text-foreground">(optional, for the logo)</span></Label>
            <Input
              id="cred-website"
              placeholder="e.g. github.com"
              value={form.website}
              className="font-medium"
              onChange={(e) => set("website")(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-login" className="text-xs font-semibold text-foreground">Login ID / Username</Label>
            <Input
              id="cred-login"
              placeholder="e.g. you@company.com"
              value={form.login_id}
              className="font-medium"
              onChange={(e) => set("login_id")(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-password" className="text-xs font-semibold text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="cred-password"
                type={reveal ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                className="font-medium pr-10"
                onChange={(e) => set("password")(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                title={reveal ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground hover:text-foreground"
              >
                {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-notes" className="text-xs font-semibold text-foreground">Notes</Label>
            <textarea
              id="cred-notes"
              placeholder="e.g. which account this is for"
              value={form.notes}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              onChange={(e) => set("notes")(e.target.value)}
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
          <Button onClick={save} disabled={upsert.isPending} className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20">
            {upsert.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {row ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
