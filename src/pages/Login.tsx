import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

type Mode = "login" | "signup" | "forgot" | "check-email";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMode("check-email");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        toast.success("Password reset email sent.");
        setMode("login");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Basata <span className="text-primary">Tracker</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" && "Sign in to your account"}
            {mode === "signup" && "Create a new account"}
            {mode === "forgot" && "Reset your password"}
            {mode === "check-email" && "One more step"}
          </p>
        </div>

        {/* Check email screen */}
        {mode === "check-email" && (
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Account created!</p>
              <p className="text-sm text-muted-foreground">
                Check your email to confirm your address before signing in.
              </p>
            </div>
            <Button className="w-full" onClick={() => setMode("login")}>
              Go to login
            </Button>
          </div>
        )}

        {/* Form */}
        {mode !== "check-email" && <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" && "Sign in"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && "Send reset email"}
            </Button>
          </form>

          {/* Mode switchers */}
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            {mode === "login" && (
              <>
                <button type="button" onClick={() => setMode("forgot")} className="hover:text-foreground transition-colors block w-full">
                  Forgot your password?
                </button>
                <button type="button" onClick={() => setMode("signup")} className="hover:text-foreground transition-colors block w-full">
                  Don't have an account? <span className="text-primary font-medium">Sign up</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button type="button" onClick={() => setMode("login")} className="hover:text-foreground transition-colors">
                Already have an account? <span className="text-primary font-medium">Sign in</span>
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" onClick={() => setMode("login")} className="hover:text-foreground transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
