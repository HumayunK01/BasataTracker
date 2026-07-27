import { Dispatch, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2, Info, ShieldAlert, Check, X, Eye, EyeOff, User, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

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
  showPassword: boolean;
}

export type PwAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set"; patch: Partial<Pick<PwState, "next" | "confirm">> }
  | { type: "toggle_show" }
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
  email?: string;
  createdAt?: string;
  categoriesCount: number;
  logsCount: number;
}

const PASSWORD_RULES = [
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(p) },
];

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  if (pw.length < 6) return { label: "Too short", color: "bg-foreground", width: "8%" };
  if (passed <= 1) return { label: "Weak", color: "bg-destructive", width: "25%" };
  if (passed <= 2) return { label: "Fair", color: "bg-warning", width: "50%" };
  if (passed <= 3) return { label: "Good", color: "bg-info", width: "75%" };
  return { label: "Strong", color: "bg-success", width: "100%" };
}

export function ProfilePasswordCard({
  profile,
  profileState,
  pwState,
  profileDispatch,
  pwDispatch,
  onUpdateProfile,
  onChangePassword,
  email,
  createdAt,
  categoriesCount,
  logsCount,
}: ProfilePasswordCardProps) {
  const initials = (() => {
    const f = profile?.first_name?.[0] ?? "";
    const l = profile?.last_name?.[0] ?? "";
    return ((f + l) || email?.[0] || "?").toUpperCase();
  })();

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* ── Shared stats bar ── */}
      <div className="flex items-stretch border-b border-border/50">
        {/* Avatar + identity — always visible */}
        <div className="flex items-center gap-3 px-5 py-4 min-w-0 flex-1">
          <div className="size-11 rounded-full bg-primary/12 flex items-center justify-center shrink-0 text-primary text-sm font-bold tracking-tight">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {profile?.first_name || profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : "Set your name"}
            </p>
            <p className="text-xs text-foreground truncate">{email || "No email"}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-stretch divide-x divide-border/50">
          {[
            { label: "Categories", value: categoriesCount },
            { label: "Days logged", value: logsCount },
            { label: "Version", value: "1.2.0" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-5 min-w-[88px]">
              <p className="text-lg font-bold tabular-nums leading-none">{stat.value}</p>
              <p className="text-2xs text-foreground uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-col xl:flex-row">
        {/* Profile panel */}
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="size-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Profile</h3>
          </div>

          {!profileState.open ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-foreground uppercase tracking-wide font-medium">Full name</p>
                  <button
                    type="button"
                    onClick={() =>
                      profileDispatch({
                        type: "open",
                        first_name: profile?.first_name ?? "",
                        last_name: profile?.last_name ?? "",
                      })
                    }
                    className="text-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
                <p className="text-sm font-semibold mt-0.5">
                  {profile?.first_name || profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`.trim()
                    : <span className="text-foreground italic font-normal">Not set</span>}
                </p>
              </div>
              {createdAt && (
                <div>
                  <p className="text-xs text-foreground uppercase tracking-wide font-medium">Member since</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
              {/* Mobile stats */}
              <div className="flex sm:hidden gap-3 pt-1 border-t border-border/30">
                {[
                  { label: "Categories", value: categoriesCount },
                  { label: "Days", value: logsCount },
                  { label: "Version", value: "1.2.0" },
                ].map((stat) => (
                  <div key={stat.label} className="flex-1">
                    <p className="text-base font-bold tabular-nums">{stat.value}</p>
                    <p className="text-2xs text-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in max-w-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">First name</Label>
                <Input
                  placeholder="First name"
                  value={profileState.first_name}
                  onChange={(e) => profileDispatch({ type: "set", patch: { first_name: e.target.value } })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Last name</Label>
                <Input
                  placeholder="Last name"
                  value={profileState.last_name}
                  onChange={(e) => profileDispatch({ type: "set", patch: { last_name: e.target.value } })}
                  onKeyDown={(e) => e.key === "Enter" && onUpdateProfile()}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 border-border/60" onClick={() => profileDispatch({ type: "close" })}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={onUpdateProfile} disabled={profileState.loading}>
                  {profileState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden xl:block w-px bg-border/50" />
        <div className="xl:hidden border-t border-border/50" />

        {/* Password panel */}
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="size-4 text-warning" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Password</h3>
          </div>

          {!pwState.open ? (
            <div className="space-y-4">
              <p className="text-xs text-foreground leading-relaxed">
                You'll stay signed in on this device after updating. Other sessions will be prompted to re-authenticate.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border/60 hover:bg-muted/80"
                onClick={() => pwDispatch({ type: "open" })}
              >
                Change password
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in max-w-sm">
              <div className="flex gap-2 bg-warning/10 border border-warning/20 rounded-lg p-3">
                <Info className="size-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-normal">
                  Must be at least 6 characters. A strong password uses a mix of uppercase, lowercase, numbers, and symbols.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New password</Label>
                <div className="relative">
                  <Input
                    type={pwState.showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    minLength={6}
                    value={pwState.next}
                    onChange={(e) => pwDispatch({ type: "set", patch: { next: e.target.value } })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => pwDispatch({ type: "toggle_show" })}
                    tabIndex={-1}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-foreground hover:text-foreground"
                  >
                    {pwState.showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {pwState.next.length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", getPasswordStrength(pwState.next).color)}
                      style={{ width: getPasswordStrength(pwState.next).width }}
                    />
                  </div>
                  <p className="text-xs text-foreground text-right">{getPasswordStrength(pwState.next).label}</p>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-1.5">
                    {PASSWORD_RULES.map(({ label, test }) => {
                      const passed = pwState.next.length > 0 && test(pwState.next);
                      const untouched = pwState.next.length === 0;
                      return (
                        <div key={label} className={cn(
                          "flex items-center gap-1.5 text-xs transition-colors",
                          untouched ? "text-foreground" : passed ? "text-success" : "text-destructive"
                        )}>
                          {untouched || passed
                            ? <Check className="size-3 shrink-0" />
                            : <X className="size-3 shrink-0" />}
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Confirm password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={pwState.confirm}
                  onChange={(e) => pwDispatch({ type: "set", patch: { confirm: e.target.value } })}
                  onKeyDown={(e) => e.key === "Enter" && onChangePassword()}
                />
              </div>

              {pwState.error && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 animate-fade-in font-medium">
                  <ShieldAlert className="size-3.5 shrink-0" />
                  <span>{pwState.error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 border-border/60" onClick={() => pwDispatch({ type: "close" })}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={onChangePassword} disabled={pwState.loading}>
                  {pwState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Update
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
