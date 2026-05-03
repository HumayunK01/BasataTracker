import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function isExpired(session: Session): boolean {
  return !!session.expires_at && session.expires_at * 1000 < Date.now();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isExpired(session)) {
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isExpired(session)) {
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  // Force-refresh the JWT; signs out if the refresh fails.
  const refreshSession = async (): Promise<boolean> => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      return false;
    }
    setSession(data.session);
    setUser(data.session.user);
    return true;
  };

  return { user, session, loading, signOut, refreshSession };
}
