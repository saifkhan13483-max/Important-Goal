/**
 * theme-provider.tsx — App-wide theme manager
 *
 * Architectural choice: ThemeProvider reads and writes theme exclusively
 * from the Zustand store (useAppStore.theme), which is persisted to
 * localStorage via Zustand's persist middleware. This means:
 *   - Theme state is a single source of truth (no duplicate localStorage keys)
 *   - use-auth can sync user.preferredTheme into the store on login and
 *     the UI immediately reflects it
 *   - The ThemeContext still exposes { theme, setTheme } so every consumer
 *     (AppLayout toggle, Settings page, Onboarding) works unchanged
 */

import { createContext, useContext, useEffect } from "react";
import { useAppStore, type Theme } from "@/store/auth.store";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: Theme) => {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = t === "dark" || (t === "system" && systemDark);
      root.classList.toggle("dark", isDark);
    };

    applyTheme(theme);

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
