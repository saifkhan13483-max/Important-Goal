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

  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(undefined);

  // Step 1: Subscribe to Firebase auth state changes.
  // When Firebase resolves with no user, immediately clear auth.
  // Firebase reads from its local IndexedDB cache so this fires in < 200ms.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUid(firebaseUser.uid);
      } else {
        setFirebaseUid(null);
        clearAuth();
      }
    });
    return unsub;
  }, [clearAuth]);

  const authStateResolved = firebaseUid !== undefined;

  // Step 2: Fetch Firestore user profile once Firebase UID is known.
  const profileQuery = useQuery<User | null>({
    queryKey: ["user", firebaseUid],
    queryFn: () => (firebaseUid ? UserService.getUser(firebaseUid) : null),
    enabled: authStateResolved && firebaseUid !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const user =
    authStateResolved && firebaseUid && profileQuery.data
      ? profileQuery.data
      : null;

  // Step 3: Sync resolved user into the Zustand store.
  // Only ever set loading to false — never back to true.
  useEffect(() => {
    if (!authStateResolved) return;

    if (user) {
      setUser(user);
      // Only apply preferredTheme from the server profile if this device has
      // no explicit local preference stored yet (i.e. first login on a new device).
      // Once the user has a locally-persisted theme, that takes priority so
      // navigating between pages never resets the theme.
      if (user.preferredTheme) {
        try {
          const stored = localStorage.getItem("sf-app-store");
          const hasLocalTheme = stored && JSON.parse(stored)?.state?.theme;
          if (!hasLocalTheme) {
            setTheme(user.preferredTheme as Theme);
          }
        } catch {
          setTheme(user.preferredTheme as Theme);
        }
      }
    } else if (firebaseUid === null) {
      clearAuth();
    } else if (!profileQuery.isLoading) {
      // Firebase has a UID but profile is done loading (null result or error)
      setAuthLoading(false);
    }
  }, [user, firebaseUid, authStateResolved, profileQuery.isLoading, setUser, clearAuth, setAuthLoading, setTheme]);

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
    isLoading: !authStateResolved || (!!firebaseUid && profileQuery.isLoading),
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
