import { useReducer, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Sun, Moon, Check, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const PASSWORD_RULES = [
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(p) },
];

type Mode = "login" | "signup";

interface LoginState {
  mode: Mode; email: string; password: string;
  firstName: string; lastName: string; showPassword: boolean; loading: boolean;
}
type LoginAction =
  | { type: "set_mode"; mode: Mode }
  | { type: "set_email"; v: string }
  | { type: "set_password"; v: string }
  | { type: "set_first"; v: string }
  | { type: "set_last"; v: string }
  | { type: "toggle_pw" }
  | { type: "submitting" }
  | { type: "done" };

const loginInit: LoginState = { mode: "login", email: "", password: "", firstName: "", lastName: "", showPassword: false, loading: false };

function loginReducer(s: LoginState, a: LoginAction): LoginState {
  switch (a.type) {
    case "set_mode": return { ...s, mode: a.mode, firstName: "", lastName: "" };
    case "set_email": return { ...s, email: a.v };
    case "set_password": return { ...s, password: a.v };
    case "set_first": return { ...s, firstName: a.v };
    case "set_last": return { ...s, lastName: a.v };
    case "toggle_pw": return { ...s, showPassword: !s.showPassword };
    case "submitting": return { ...s, loading: true };
    case "done": return { ...s, loading: false };
    default: return s;
  }
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const [s, dispatch] = useReducer(loginReducer, loginInit);
  const { mode, email, password, firstName, lastName, showPassword, loading } = s;
  const attemptTimestamps = useRef<number[]>([]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter(t => now - t < WINDOW_MS);
    if (attemptTimestamps.current.length >= MAX_ATTEMPTS) return false;
    attemptTimestamps.current.push(now);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
    if (mode === "signup") {
      if (!firstName.trim()) { toast.error("First name is required."); return; }
      if (!lastName.trim()) { toast.error("Last name is required."); return; }
    }
    dispatch({ type: "submitting" });
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
        dispatch({ type: "set_mode", mode: "login" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      dispatch({ type: "done" });
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background relative">

      {/* Card */}
      <div className={`w-full bg-card rounded-md p-5 space-y-4 relative transition-all duration-200 ${mode === "signup" ? "max-w-xs" : "max-w-[16rem]"}`}>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Logo */}
        <div className="flex justify-center">
          <img src="/favicon.png" alt="Basata.ai Tracker" className="size-14 object-contain" />
        </div>

        {/* Title */}
        <h1 className="text-center text-2xl font-semibold text-foreground">
          {mode === "login" ? "Login" : "Sign Up"}
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Name fields — signup only */}
          {mode === "signup" && (
            <div className="flex flex-col xs:flex-row gap-2">
              <Input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => dispatch({ type: "set_first", v: e.target.value })}
                required
                autoComplete="given-name"
                className="h-11 bg-muted border-0 placeholder:text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => dispatch({ type: "set_last", v: e.target.value })}
                required
                autoComplete="family-name"
                className="h-11 bg-muted border-0 placeholder:text-muted-foreground"
              />
            </div>
          )}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => dispatch({ type: "set_email", v: e.target.value })}
            required
            autoComplete="email"
            className="h-11 bg-muted border-0 placeholder:text-muted-foreground"
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => dispatch({ type: "set_password", v: e.target.value })}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-11 bg-muted border-0 placeholder:text-muted-foreground pr-10"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: "toggle_pw" })}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Password rules for signup */}
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
              {PASSWORD_RULES.map(({ label, test }) => {
                const passed = password.length > 0 && test(password);
                const untouched = password.length === 0;
                return (
                  <div key={label} className={[
                    "flex items-center gap-1.5 text-xs transition-colors",
                    untouched ? "text-muted-foreground" : passed ? "text-green-500" : "text-destructive",
                  ].join(" ")}>
                    {untouched || passed
                      ? <Check className="size-3 shrink-0" />
                      : <X className="size-3 shrink-0" />}
                    {label}
                  </div>
                );
              })}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            {mode === "login" ? "Login" : "Create Account"}
          </Button>
        </form>

        {/* Mode switcher */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>Don't have an account?{" "}
              <button type="button" onClick={() => dispatch({ type: "set_mode", mode: "signup" })} className="text-primary hover:underline font-medium">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button type="button" onClick={() => dispatch({ type: "set_mode", mode: "login" })} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
