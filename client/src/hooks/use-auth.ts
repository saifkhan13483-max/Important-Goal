/**
 * use-auth.ts — Central authentication hook
 *
 * Architectural choice: This hook is the single integration point between
 * Firebase Auth, Firestore (via TanStack Query), and Zustand.
 *
 *  1. Firebase onAuthStateChanged provides the raw UID.
 *  2. TanStack Query fetches and caches the Firestore user profile.
 *  3. The resolved user (or null) is synced into Zustand via useAppStore,
 *     so any component in the tree can read auth state without calling this hook.
 *  4. Mutations (login, signup, logout) are exposed for use in auth pages.
 *
 * Only call this hook when you need mutations. For read-only auth state,
 * prefer useAppStore() directly to avoid unnecessary re-renders.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import * as AuthService from "@/services/auth.service";
import * as UserService from "@/services/user.service";
import type { User } from "@/types/schema";
import { useAppStore, type Theme } from "@/store/auth.store";

export function useAuth() {
  const qc = useQueryClient();
  const { setUser, setAuthLoading, clearAuth, setTheme } = useAppStore();

  // Track the Firebase UID locally — drives the Firestore profile query below
  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(undefined);

  // Step 1: Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUid(firebaseUser ? firebaseUser.uid : null);
      if (!firebaseUser) {
        // No Firebase user → clear Zustand auth state immediately
        clearAuth();
      }
    });
    return unsub;
  }, [clearAuth]);

  // Hard deadline: if auth is still loading after 5s, force-resolve it.
  // This prevents the loading screen from hanging forever due to Firebase
  // connectivity issues or a missing Firestore user profile.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [setAuthLoading]);

  const authStateLoading = firebaseUid === undefined;

  // Step 2: Fetch Firestore user profile once Firebase UID is known
  const profileQuery = useQuery<User | null>({
    queryKey: ["user", firebaseUid],
    queryFn: () => (firebaseUid ? UserService.getUser(firebaseUid) : null),
    enabled: !authStateLoading && firebaseUid !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    authStateLoading ||
    (firebaseUid !== null && firebaseUid !== undefined && profileQuery.isLoading);

  const user =
    !authStateLoading && firebaseUid && profileQuery.data
      ? profileQuery.data
      : null;

  // Step 3: Sync resolved auth state into Zustand store.
  // Also syncs the user's preferred theme so ThemeProvider applies it immediately.
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setUser(user);
        if (user.preferredTheme) {
          setTheme(user.preferredTheme as Theme);
        }
      } else if (firebaseUid === null) {
        clearAuth();
      } else {
        // Firebase has a UID but no Firestore profile was found — still done loading
        setAuthLoading(false);
      }
    } else {
      setAuthLoading(true);
    }
  }, [user, isLoading, firebaseUid, setUser, clearAuth, setAuthLoading, setTheme]);

  // --- Mutations ---

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      AuthService.signIn(data.email, data.password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user"] }),
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const cred = await AuthService.signUp(data.email, data.password);
      await UserService.createUser(cred.user.uid, {
        id: cred.user.uid,
        email: data.email,
        name: data.name,
        onboardingCompleted: false,
        preferredTheme: "system",
        timezone: "UTC",
      });
      return cred;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: () => AuthService.signOut(),
    onSuccess: () => {
      qc.clear();
      clearAuth();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => {
      if (!firebaseUid) throw new Error("Not authenticated");
      return UserService.updateUser(firebaseUid, data);
    },
    onSuccess: (updatedUser) => {
      qc.invalidateQueries({ queryKey: ["user", firebaseUid] });
      setUser(updatedUser);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    signupPending: signupMutation.isPending,
    logoutPending: logoutMutation.isPending,
    updatePending: updateProfileMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
  };
}
