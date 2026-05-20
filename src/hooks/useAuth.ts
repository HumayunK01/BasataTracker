import { useEffect, useReducer } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function isExpired(session: Session): boolean {
  return !!session.expires_at && session.expires_at * 1000 < Date.now();
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
    default: return s;
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, { user: null, session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isExpired(session)) {
        supabase.auth.signOut();
        dispatch({ type: "clear" });
      } else {
        dispatch({ type: "set", session });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isExpired(session)) {
        supabase.auth.signOut();
        dispatch({ type: "clear" });
        return;
      }
      dispatch({ type: "set", session });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const refreshSession = async (): Promise<boolean> => {
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
