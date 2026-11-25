import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "reverhost-theme";

const readStoredTheme = (): Theme => {
  try {
    if (localStorage.getItem(THEME_STORAGE_KEY) === "light") {
      return "light";
    }
  } catch {
    return "dark";
  }
  return "dark";
};

const writeStoredTheme = (theme: Theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      let next: Theme = "dark";
      if (current === "dark") {
        next = "light";
      }
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
