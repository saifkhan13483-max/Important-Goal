import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/auth/login", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const signupMutation = useMutation({
    mutationFn: (data: { email: string; password: string; name: string }) =>
      apiRequest("POST", "/api/auth/signup", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      qc.clear();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<SafeUser>) => apiRequest("PATCH", "/api/auth/me", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  return {
    user: user ?? null,
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
