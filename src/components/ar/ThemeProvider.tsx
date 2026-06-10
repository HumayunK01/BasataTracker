import { useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { ThemeContext, type Theme } from "@/hooks/useTheme";

const STORAGE_KEY = "basata-theme";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Ignore localStorage access failures
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {
      // Ignore localStorage access failures
    }
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains("light")
      ? "dark"
      : "light";

    // The class flip must happen synchronously inside the view-transition
    // callback so the browser snapshots the correct before/after frames.
    const flip = () => {
      applyTheme(next);
      flushSync(() => setTheme(next));
    };

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (doc.startViewTransition && !reduceMotion) {
      doc.startViewTransition(flip);
    } else {
      flip();
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
