import type { Dispatch } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BadgeCheck, Loader2, KeyRound, Info, ShieldAlert } from "lucide-react";

export interface ProfileState {
  open: boolean;
  first_name: string;
  last_name: string;
  loading: boolean;
}

export type ProfileAction =
  | { type: "open"; first_name: string; last_name: string }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<ProfileState, "first_name" | "last_name">> }
  | { type: "submitting" }
  | { type: "done" };

export interface PwState {
  open: boolean;
  next: string;
  confirm: string;
  loading: boolean;
  error: string;
}

export type PwAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<PwState, "next" | "confirm">> }
  | { type: "submitting" }
  | { type: "done"; error?: string };

interface ProfilePasswordCardProps {
  profile: { first_name?: string; last_name?: string } | null | undefined;
  profileState: ProfileState;
  pwState: PwState;
  profileDispatch: Dispatch<ProfileAction>;
  pwDispatch: Dispatch<PwAction>;
  onUpdateProfile: () => void;
  onChangePassword: () => void;
}

export function ProfilePasswordCard({
  profile,
  profileState,
  pwState,
  profileDispatch,
  pwDispatch,
  onUpdateProfile,
  onChangePassword,
}: ProfilePasswordCardProps) {
  return (
    <div className="col-span-2 sm:col-span-1 bg-card/70 backdrop-blur-md border border-border/60 rounded-xl p-5 sm:p-6 space-y-4 hover:shadow-md hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Profile section */}
      <div className="space-y-3 font-[system-ui]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            <BadgeCheck className="size-4 text-primary group-hover:rotate-6 transition-transform" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/95">Profile</h2>
        </div>
        
        {!profileState.open ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Associate Name</p>
              <p className="text-sm font-semibold text-foreground/90">
                {profile?.first_name || profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`.trim()
                  : <span className="text-muted-foreground italic font-normal">Not set</span>}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-border/60 hover:bg-muted/80 hover:border-foreground/20 transition-all duration-200"
              onClick={() =>
                profileDispatch({
                  type: "open",
                  first_name: profile?.first_name ?? "",
                  last_name: profile?.last_name ?? "",
                })
              }
            >
              Edit name
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">First name</Label>
              <Input
                placeholder="First name"
                value={profileState.first_name}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all"
                onChange={(e) => profileDispatch({ type: "set", patch: { first_name: e.target.value } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">Last name</Label>
              <Input
                placeholder="Last name"
                value={profileState.last_name}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all"
                onChange={(e) => profileDispatch({ type: "set", patch: { last_name: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onUpdateProfile()}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1 border-border/60" onClick={() => profileDispatch({ type: "close" })}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20" onClick={onUpdateProfile} disabled={profileState.loading}>
                {profileState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-border/40" />

      {/* Password section */}
      <div className="space-y-3 font-[system-ui]">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-warning/20 transition-all duration-300">
            <KeyRound className="size-4 text-warning group-hover:rotate-6 transition-transform" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/95">Password</h2>
        </div>
        
        {!pwState.open ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Change your login password. You&#39;ll stay signed in after updating.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full border-border/60 hover:bg-muted/80 hover:border-foreground/20 transition-all duration-200" 
              onClick={() => pwDispatch({ type: "open" })}
            >
              Change password
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {/* Custom Alert Box */}
            <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-2.5">
              <Info className="size-4 text-warning shrink-0 mt-0.5" />
              <p className="text-[10px] text-warning-foreground/90 leading-normal">
                Must be at least 6 characters. Make it strong with numbers and special symbols.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">New password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                minLength={6}
                value={pwState.next}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all"
                onChange={(e) => pwDispatch({ type: "set", patch: { next: e.target.value } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">Confirm password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={pwState.confirm}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all"
                onChange={(e) => pwDispatch({ type: "set", patch: { confirm: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onChangePassword()}
              />
            </div>
            
            {pwState.error && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1 animate-fade-in">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>{pwState.error}</span>
              </div>
            )}
            
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1 border-border/60" onClick={() => pwDispatch({ type: "close" })}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20" onClick={onChangePassword} disabled={pwState.loading}>
                {pwState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Update
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
