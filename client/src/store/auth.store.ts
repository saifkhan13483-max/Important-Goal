/**
 * auth.store.ts — Zustand global state store
 *
 * Architectural choice: Zustand is used as the single source of truth for
 * auth state and global UI preferences. This lets any component subscribe to
 * auth state without prop drilling or repeated Firebase listener setup.
 *
 * Auth flow:
 *   Firebase onAuthStateChanged → useAuth hook → setUser / setAuthLoading here
 *
 * TanStack Query handles Firestore profile fetching and caching. Once the
 * profile is resolved, useAuth syncs it into this store so all components
 * can read it via useAppStore() without calling useAuth.
 *
 * Only theme and sidebarOpen are persisted to localStorage. Auth state is
 * intentionally NOT persisted — Firebase SDK handles session persistence
 * natively via its own IndexedDB storage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/schema";

export type Theme = "light" | "dark" | "system";

interface AppState {
  // --- Auth state ---
  user: User | null;
  isAuthLoading: boolean;

  // --- UI state ---
  theme: Theme;
  sidebarOpen: boolean;

  // --- Auth actions ---
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  clearAuth: () => void;

  // --- UI actions ---
  setTheme: (theme: Theme) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth initial state
      user: null,
      isAuthLoading: true,

      // UI initial state
      theme: "system",
      sidebarOpen: true,

      // Auth actions
      setUser: (user) => set({ user, isAuthLoading: false }),
      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
      clearAuth: () => set({ user: null, isAuthLoading: false }),

      // UI actions
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: "strivo-app-store",
      // Only persist UI preferences — auth session is managed by Firebase SDK
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Convenience alias for backwards-compat / intent clarity
export const useAuthStore = useAppStore;
