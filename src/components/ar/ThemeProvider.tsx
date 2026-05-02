import { useState, useCallback, useEffect } from "react";
import { ThemeContext, type Theme } from "@/hooks/useTheme";

const STORAGE_KEY = "basata-theme";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
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
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggle = useCallback(() => {
    document.documentElement.classList.add("theme-transitioning");
    setTheme((t) => (t === "dark" ? "light" : "dark"));
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 200);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
