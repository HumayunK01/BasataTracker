import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck, ArrowLeft, Eye, EyeOff, LayoutDashboard, TrendingUp, Zap } from "lucide-react";
import { AppLogo } from "@/components/ar/AppLogo";

type Mode = "login" | "signup" | "forgot" | "check-email";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* ── Left branding panel — desktop only ── */}
      <div className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 flex-col justify-between bg-card border-r border-border p-12">
        <AppLogo className="h-14 object-contain self-start" />

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              Your AR workflow,<br />at a glance.
            </h1>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Built for medical billing associates who care about clarity and speed.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { Icon: LayoutDashboard, text: "Track daily document counts by category" },
              { Icon: TrendingUp, text: "Visualise trends across weeks and months" },
              { Icon: Zap, text: "Counter mode for real-time tally while you work" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <blockquote className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm text-muted-foreground italic leading-relaxed">
              "Designed for AR associates who need clarity on their daily output."
            </p>
          </blockquote>
        </div>

        <p className="text-xs text-muted-foreground/40">© {new Date().getFullYear()} Basata Tracker</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-6 py-10">

        {/* Mobile logo — only on small screens */}
        <div className="lg:hidden mb-8">
          <AppLogo className="h-14 object-contain" />
        </div>

        <div key={mode} className="w-full max-w-sm space-y-6 animate-fade-in">

          {/* ── Check email ── */}
          {mode === "check-email" ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to{" "}
                  <strong className="text-foreground font-medium">{email}</strong>
                </p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 items-start">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MailCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Account created!</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click the link in your email to confirm your address, then come back to sign in.
                  </p>
                </div>
              </div>
              <Button className="w-full h-11" variant="outline" onClick={() => setMode("login")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
              </Button>
            </div>

          ) : mode === "forgot" ? (
            /* ── Forgot password ── */
            <div className="space-y-6">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                <h2 className="text-2xl font-semibold tracking-tight">Forgot password?</h2>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email-forgot">Email address</Label>
                  <Input id="email-forgot" type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            </div>

          ) : (
            /* ── Login / Signup ── */
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {mode === "login" ? "Welcome back" : "Create an account"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Sign in to your Basata Tracker account"
                    : "Start tracking your daily AR workflow"}
                </p>
              </div>

              {/* Tab switcher */}
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={[
                      "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                      mode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {m === "login" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" className="h-11" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required minLength={6}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Mobile footer */}
        <p className="lg:hidden mt-10 text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} Basata Tracker
        </p>
      </div>
    </div>
  );
}
