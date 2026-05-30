import type { Dispatch } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UserX, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";

export interface DelState {
  open: boolean;
  confirmText: string;
  password: string;
  loading: boolean;
}

export type DelAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set_text"; text: string }
  | { type: "set_pw"; pw: string }
  | { type: "submitting" }
  | { type: "done" };

interface DangerZoneProps {
  delState: DelState;
  delDispatch: Dispatch<DelAction>;
  onDeleteAccount: () => void;
}

export function DangerZone({ delState, delDispatch, onDeleteAccount }: DangerZoneProps) {
  return (
    <>
      <div className="bg-card/70 backdrop-blur-md border border-destructive/20 rounded-xl overflow-hidden hover:border-destructive/40 hover:shadow-md hover:shadow-destructive/5 transition-all duration-300 group">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-destructive/15 bg-destructive/[0.02]">
          <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-destructive/20 transition-all duration-300">
            <UserX className="size-4 text-destructive group-hover:rotate-6 transition-transform" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-destructive font-[system-ui]">Danger Zone</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-[system-ui]">Irreversible system actions · Proceed with caution</p>
          </div>
        </div>
        <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-[system-ui]">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold text-foreground">Delete Account</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Permanently delete your profile and wipe all document count history, custom categories, and immutable audit logs. This action cannot be reversed.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="w-full sm:w-auto shrink-0 shadow-sm shadow-destructive/10 transition-transform duration-100 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => delDispatch({ type: "open" })}
          >
            Delete account
          </Button>
        </div>
      </div>

      <AlertDialog open={delState.open} onOpenChange={(o) => !o && delDispatch({ type: "close" })}>
        <AlertDialogContent className="font-[system-ui] sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5 shrink-0 animate-bounce" />
              <AlertDialogTitle className="text-lg font-bold">Wipe Account and Data?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 mt-2 text-sm leading-relaxed">
              <span className="block text-foreground/90 font-medium">
                This is a highly destructive operation.
              </span>
              
              {/* Premium Warning Alert */}
              <span className="flex gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs leading-normal">
                <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-destructive-foreground/90 leading-relaxed">
                  All your historical counts, logs, custom shortnames, and data indices will be immediately deleted from Supabase. You will be logged out and cannot register with the same state again.
                </span>
              </span>

              <span className="block pt-1 text-muted-foreground">
                Please type <strong className="text-foreground select-all font-mono font-black">DELETE</strong> below and enter your password to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2.5 mt-2">
            <Input
              placeholder="Type DELETE"
              value={delState.confirmText}
              className="border-border/60 focus-visible:ring-destructive/30 focus-visible:border-destructive/60 transition-all font-semibold uppercase"
              onChange={(e) => delDispatch({ type: "set_text", text: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Enter your current password"
              value={delState.password}
              className="border-border/60 focus-visible:ring-destructive/30 focus-visible:border-destructive/60 transition-all"
              onChange={(e) => delDispatch({ type: "set_pw", pw: e.target.value })}
            />
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60" onClick={() => delDispatch({ type: "close" })}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={delState.confirmText !== "DELETE" || !delState.password || delState.loading}
              className="bg-destructive hover:bg-destructive/95 text-destructive-foreground disabled:opacity-50 shadow-sm shadow-destructive/20 font-bold"
            >
              {delState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
