import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import * as AuthService from "@/services/auth.service";
import * as UserService from "@/services/user.service";
import type { User } from "@/types/schema";

export function useAuth() {
  const qc = useQueryClient();
  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUid(u ? u.uid : null);
    });
    return unsub;
  }, []);

  const authStateLoading = firebaseUid === undefined;

  const profileQuery = useQuery<User | null>({
    queryKey: ["user", firebaseUid],
    queryFn: () => (firebaseUid ? UserService.getUser(firebaseUid) : null),
    enabled: !authStateLoading && firebaseUid !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading = authStateLoading || (firebaseUid !== null && firebaseUid !== undefined && profileQuery.isLoading);
  const user = (!authStateLoading && firebaseUid && profileQuery.data) ? profileQuery.data : null;

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
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => {
      if (!firebaseUid) throw new Error("Not authenticated");
      return UserService.updateUser(firebaseUid, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", firebaseUid] }),
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
  };
}
