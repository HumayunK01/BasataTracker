import { useReducer, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Eye, EyeOff, Sun, Moon, Check, X, ChevronLeft } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { AppLogo } from "@/components/ar/AppLogo";

const PASSWORD_RULES = [
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(p) },
];

type Mode = "login" | "signup";

interface LoginState {
  mode: Mode; email: string; password: string;
  firstName: string; lastName: string; showPassword: boolean; loading: boolean;
  confirmEmail: string | null;
}
type LoginAction =
  | { type: "set_mode"; mode: Mode }
  | { type: "set_email"; v: string }
  | { type: "set_password"; v: string }
  | { type: "set_first"; v: string }
  | { type: "set_last"; v: string }
  | { type: "toggle_pw" }
  | { type: "submitting" }
  | { type: "done" }
  | { type: "signup_success"; email: string }
  | { type: "back_to_login" };

const loginInit: LoginState = { mode: "login", email: "", password: "", firstName: "", lastName: "", showPassword: false, loading: false, confirmEmail: null };

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
    case "signup_success": return { ...loginInit, confirmEmail: a.email };
    case "back_to_login": return { ...loginInit };
    default: return s;
  }
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const [s, dispatch] = useReducer(loginReducer, loginInit);
  const { mode, email, password, firstName, lastName, showPassword, loading, confirmEmail } = s;
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
        dispatch({ type: "signup_success", email });
        return;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      dispatch({ type: "done" });
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-background px-5 py-8 overflow-hidden">

      {/* Ambient grid glow */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06)_0%,transparent_70%)]" />
      </div>

      {/* Theme toggle — top right */}
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={toggle}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="fixed top-4 right-4 z-20 size-10 rounded-lg flex items-center justify-center text-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </motion.button>

      <AnimatePresence mode="wait">
        {confirmEmail ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-sm"
          >
            <div className="bg-card border border-border/80 rounded-xl p-6 space-y-5">
              <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <AppLogo className="h-10 object-contain" />
          </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">Account created!</h1>
                  <p className="text-sm text-foreground leading-relaxed">
                    We sent a confirmation link to{" "}
                    <span className="font-medium text-foreground break-all">{confirmEmail}</span>.
                    Please check your inbox to activate your account.
                  </p>
                </div>
              </div>
              <Button
                className="w-full h-12 text-sm font-semibold tracking-wide"
                onClick={() => dispatch({ type: "back_to_login" })}
              >
                Back to sign in
              </Button>
              <p className="text-center text-xs text-foreground">
                Didn&apos;t get it? Check your spam folder.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-sm"
          >
            <div className="bg-card border border-border/80 rounded-xl p-6 sm:p-7 space-y-6">

              {/* Logo + Title */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <AppLogo className="h-9 object-contain" />
                </div>
                <div className="space-y-1 text-center">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="text-sm text-foreground">
                    {mode === "login"
                      ? "Sign in to continue to Basata Tracker"
                      : "Start tracking your daily document work"}
                  </p>
                </div>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">

                {/* Name fields — signup only */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col xs:flex-row gap-2.5 overflow-hidden"
                  >
                    <Input
                      type="text"
                      placeholder="First name"
                      aria-label="First name"
                      value={firstName}
                      onChange={(e) => dispatch({ type: "set_first", v: e.target.value })}
                      required
                      autoComplete="given-name"
                      className="h-12 text-sm"
                    />
                    <Input
                      type="text"
                      placeholder="Last name"
                      aria-label="Last name"
                      value={lastName}
                      onChange={(e) => dispatch({ type: "set_last", v: e.target.value })}
                      required
                      autoComplete="family-name"
                      className="h-12 text-sm"
                    />
                  </motion.div>
                )}

                <div className="space-y-2.5">
                  <Input
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => dispatch({ type: "set_email", v: e.target.value })}
                    required
                    autoComplete="email"
                    className="h-12 text-sm"
                  />

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      aria-label="Password"
                      value={password}
                      onChange={(e) => dispatch({ type: "set_password", v: e.target.value })}
                      required
                      minLength={6}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-12 text-sm pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "toggle_pw" })}
                      tabIndex={-1}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center rounded-md text-foreground hover:text-foreground transition-colors active:scale-90"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Password rules for signup */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-x-4 gap-y-1.5"
                  >
                    {PASSWORD_RULES.map(({ label, test }) => {
                      const passed = password.length > 0 && test(password);
                      const untouched = password.length === 0;
                      return (
                        <div key={label} className={`flex items-center gap-1.5 text-xs transition-colors ${
                          untouched ? "text-foreground" : passed ? "text-success" : "text-destructive"
                        }`}>
                          {untouched || passed
                            ? <Check className="size-3 shrink-0" />
                            : <X className="size-3 shrink-0" />}
                          {label}
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                <Button type="submit" className="w-full h-12 text-sm font-semibold tracking-wide" disabled={loading}>
                  {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {mode === "login" ? "Login" : "Create Account"}
                </Button>
              </form>

              {/* Mode switcher */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center text-sm text-foreground"
              >
                {mode === "login" ? (
                  <>Don't have an account?{" "}
                    <button type="button" onClick={() => dispatch({ type: "set_mode", mode: "signup" })} className="text-primary hover:underline font-medium">
                      Sign up
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => dispatch({ type: "set_mode", mode: "login" })} className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                    <ChevronLeft className="size-3.5" />
                    Sign in
                  </button>
                )}
              </motion.p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
