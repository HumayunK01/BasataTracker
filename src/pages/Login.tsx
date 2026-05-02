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
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "hsl(var(--background))" }}>

      {/* ── Left branding panel ── */}
      <div style={{
        width: "420px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
        background: "hsl(var(--card))",
        borderRight: "1px solid hsl(var(--border))",
      }} className="hidden lg:flex">

        <AppLogo style={{ height: "36px", objectFit: "contain", alignSelf: "flex-start" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2, color: "hsl(var(--foreground))", margin: 0 }}>
              Your AR workflow,<br />at a glance.
            </h1>
            <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginTop: "10px" }}>
              Built for medical billing associates who care about clarity and speed.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { Icon: LayoutDashboard, text: "Track daily document counts by category" },
              { Icon: TrendingUp, text: "Visualise trends across weeks and months" },
              { Icon: Zap, text: "Counter mode for real-time tally while you work" },
            ].map(({ Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "34px", height: "34px", borderRadius: "8px",
                  background: "hsl(var(--primary) / 0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon style={{ width: "16px", height: "16px", color: "hsl(var(--primary))" }} />
                </div>
                <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>

          <blockquote style={{ borderLeft: "2px solid hsl(var(--primary) / 0.4)", paddingLeft: "16px", margin: 0 }}>
            <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontStyle: "italic", margin: 0 }}>
              "Designed for AR associates who need clarity on their daily output."
            </p>
          </blockquote>
        </div>

        <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground) / 0.4)", margin: 0 }}>
          © {new Date().getFullYear()} Basata Tracker
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: "48px 24px",
      }}>
        {/* Mobile logo */}
        <AppLogo style={{ height: "32px", objectFit: "contain", marginBottom: "32px" }} className="lg:hidden" />

        <div style={{ width: "100%", maxWidth: "360px" }}>

          {/* ── Check email ── */}
          {mode === "check-email" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 600, margin: 0, color: "hsl(var(--foreground))" }}>Check your email</h2>
                <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginTop: "6px" }}>
                  We sent a confirmation link to <strong style={{ color: "hsl(var(--foreground))" }}>{email}</strong>
                </p>
              </div>
              <div style={{
                background: "hsl(var(--primary) / 0.06)",
                border: "1px solid hsl(var(--primary) / 0.2)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "hsl(var(--primary) / 0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <MailCheck style={{ width: "18px", height: "18px", color: "hsl(var(--primary))" }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, margin: 0, color: "hsl(var(--foreground))" }}>Account created!</p>
                  <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", marginTop: "4px", lineHeight: 1.5 }}>
                    Click the link in your email to confirm your address, then come back to sign in.
                  </p>
                </div>
              </div>
              <Button style={{ height: "44px", width: "100%" }} variant="outline" onClick={() => setMode("login")}>
                <ArrowLeft style={{ width: "16px", height: "16px", marginRight: "8px" }} /> Back to sign in
              </Button>
            </div>

          ) : mode === "forgot" ? (
            /* ── Forgot password ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    fontSize: "12px", color: "hsl(var(--muted-foreground))",
                    background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "12px",
                  }}
                >
                  <ArrowLeft style={{ width: "14px", height: "14px" }} /> Back to sign in
                </button>
                <h2 style={{ fontSize: "22px", fontWeight: 600, margin: 0, color: "hsl(var(--foreground))" }}>Forgot password?</h2>
                <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginTop: "6px" }}>
                  Enter your email and we'll send you a reset link.
                </p>
              </div>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label htmlFor="email-forgot">Email address</Label>
                  <Input id="email-forgot" type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-11" />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            </div>

          ) : (
            /* ── Login / Signup ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 600, margin: 0, color: "hsl(var(--foreground))" }}>
                  {mode === "login" ? "Welcome back" : "Create an account"}
                </h2>
                <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginTop: "6px" }}>
                  {mode === "login" ? "Sign in to your Basata Tracker account" : "Start tracking your daily AR workflow"}
                </p>
              </div>

              {/* Tab switcher */}
              <div style={{
                display: "flex",
                background: "hsl(var(--muted))",
                borderRadius: "8px",
                padding: "4px",
                gap: "4px",
              }}>
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: mode === m ? "hsl(var(--background))" : "transparent",
                      color: mode === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      boxShadow: mode === m ? "0 1px 3px hsl(var(--foreground) / 0.08)" : "none",
                    }}
                  >
                    {m === "login" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-11" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")}
                        style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
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
                      style={{
                        position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))",
                        display: "flex", alignItems: "center",
                      }}>
                      {showPassword ? <EyeOff style={{ width: "16px", height: "16px" }} /> : <Eye style={{ width: "16px", height: "16px" }} />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0 }}>Minimum 6 characters</p>
                  )}
                </div>

                <Button type="submit" className="w-full" style={{ height: "44px", marginTop: "4px" }} disabled={loading}>
                  {loading && <Loader2 style={{ width: "16px", height: "16px", marginRight: "8px" }} className="animate-spin" />}
                  {mode === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
