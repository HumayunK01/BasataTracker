import { useRef, useState } from "react";
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

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const attemptTimestamps = useRef<number[]>([]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter(t => now - t < WINDOW_MS);
    if (attemptTimestamps.current.length >= MAX_ATTEMPTS) return false;
    attemptTimestamps.current.push(now);
    return true;
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setFirstName("");
    setLastName("");
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
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
        switchMode("login");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Logo */}
        <div className="flex justify-center">
          <img src="/favicon.png" alt="Basata.ai Tracker" className="h-14 w-14 object-contain" />
        </div>

        {/* Title */}
        <h1 className="text-center text-2xl font-bold text-foreground">
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
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                className="h-11 bg-muted border-0 placeholder:text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 bg-muted border-0 placeholder:text-muted-foreground"
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-11 bg-muted border-0 placeholder:text-muted-foreground pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      ? <Check className="h-3 w-3 shrink-0" />
                      : <X className="h-3 w-3 shrink-0" />}
                    {label}
                  </div>
                );
              })}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "login" ? "Login" : "Create Account"}
          </Button>
        </form>

        {/* Mode switcher */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>Don't have an account?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="text-primary hover:underline font-medium">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button type="button" onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
