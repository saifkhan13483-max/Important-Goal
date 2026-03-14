/**
 * protected-route.tsx — Route guard components
 *
 * Architectural choice: Route guards are extracted into their own file so they
 * are reusable and not buried inside App.tsx. They read auth state from the
 * Zustand store (useAppStore) for fast, synchronous access without re-triggering
 * Firebase queries, while the useAuth hook handles initialization.
 *
 * ProtectedRoute   — wraps authenticated-only pages; redirects to /login if not authed
 * PublicOnlyRoute  — wraps public pages (login/signup); redirects to /dashboard if authed
 */

import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/auth.store";
import { AppLayout } from "@/components/app/app-layout";

interface RouteProps {
  component: React.ComponentType;
}

export function ProtectedRoute({ component: Component }: RouteProps) {
  const { user, isAuthLoading } = useAppStore();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (!user.onboardingCompleted) return <Redirect to="/onboarding" />;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

export function PublicOnlyRoute({ component: Component }: RouteProps) {
  const { user, isAuthLoading } = useAppStore();

  // Once auth resolves and there IS a user, redirect away from public pages.
  // While still loading, show the page immediately to avoid a stuck spinner.
  if (!isAuthLoading && user) {
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  return <Component />;
}
