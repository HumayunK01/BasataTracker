import { useEffect, useReducer } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function isExpired(session: Session): boolean {
  return !!session.expires_at && session.expires_at * 1000 < Date.now();
}

// ── Hard session cap: force logout 10 hours after sign-in, no matter what ──
const SESSION_START_KEY = "basata-session-started-at";
const MAX_SESSION_MS = 10 * 60 * 60 * 1000; // 10 hours

// Several components mount useAuth; this guards against duplicate
// signOut calls + toasts when the cap trips.
let forcedLogoutInFlight = false;

function sessionCapExceeded(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_START_KEY);
    if (!raw) return false;
    const started = Number(raw);
    return Number.isFinite(started) && Date.now() - started > MAX_SESSION_MS;
  } catch {
    return false;
  }
}

function markSessionStart() {
  try {
    // Only set once per login so refreshes/tab reloads don't extend the cap
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }
  } catch {
    // Ignore localStorage failures
  }
}

function clearSessionStart() {
  try {
    localStorage.removeItem(SESSION_START_KEY);
  } catch {
    // Ignore localStorage failures
  }
}

function forceLogout() {
  if (forcedLogoutInFlight) return;
  forcedLogoutInFlight = true;
  clearSessionStart();
  supabase.auth.signOut().finally(() => {
    forcedLogoutInFlight = false;
  });
  toast.info("Your session has ended after 10 hours. Please sign in again.");
}

interface AuthState { user: User | null; session: Session | null; loading: boolean; }
type AuthAction =
  | { type: "set"; session: Session | null }
  | { type: "ready" }
  | { type: "clear" };

function authReducer(s: AuthState, a: AuthAction): AuthState {
  switch (a.type) {
    case "set": return { user: a.session?.user ?? null, session: a.session, loading: false };
    case "ready": return { ...s, loading: false };
    case "clear": return { user: null, session: null, loading: false };
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, { user: null, session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && (isExpired(session) || sessionCapExceeded())) {
        forceLogout();
        dispatch({ type: "clear" });
      } else {
        if (session) markSessionStart();
        dispatch({ type: "set", session });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        clearSessionStart();
        dispatch({ type: "set", session: null });
        return;
      }
      if (isExpired(session) || sessionCapExceeded()) {
        forceLogout();
        dispatch({ type: "clear" });
        return;
      }
      markSessionStart();
      dispatch({ type: "set", session });
    });

    // Periodic check so the cap also trips mid-session (or on laptop wake)
    const capInterval = setInterval(() => {
      if (sessionCapExceeded()) {
        forceLogout();
        dispatch({ type: "clear" });
      }
    }, 60_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(capInterval);
    };
  }, []);

  const signOut = () => {
    clearSessionStart();
    return supabase.auth.signOut();
  };

  const refreshSession = async (): Promise<boolean> => {
    if (sessionCapExceeded()) {
      forceLogout();
      dispatch({ type: "clear" });
      return false;
    }
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut();
      dispatch({ type: "clear" });
      return false;
    }
    dispatch({ type: "set", session: data.session });
    return true;
  };

  return { user: state.user, session: state.session, loading: state.loading, signOut, refreshSession };
}
