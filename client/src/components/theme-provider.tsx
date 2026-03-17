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
 *
 * Plan enforcement: Free-tier users are restricted to light mode. The stored
 * theme value is preserved (so it activates automatically if they upgrade),
 * but the applied CSS class is forced to light when plan === "free".
 */

import { createContext, useContext, useEffect } from "react";
import { useAppStore, type Theme } from "@/store/auth.store";
import { getPlanFeatures } from "@/lib/plan-limits";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, user } = useAppStore();
  const features = getPlanFeatures(user?.plan);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: Theme) => {
      if (!features.darkMode) {
        root.classList.remove("dark");
        return;
      }
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = t === "dark" || (t === "system" && systemDark);
      root.classList.toggle("dark", isDark);
    };

    applyTheme(theme);

    if (features.darkMode && theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [theme, features.darkMode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
