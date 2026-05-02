import { useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "basata-theme";
const THEME_CHANGE_EVENT = "basata-theme-change";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setTheme(getInitialTheme());
      }
    };
    const handleCustomChange = () => {
      setTheme(getInitialTheme());
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleCustomChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomChange);
    };
  }, []);

  const toggle = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, nextTheme); } catch {}
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      return nextTheme;
    });
  }, []);

  return { theme, toggle };
}
