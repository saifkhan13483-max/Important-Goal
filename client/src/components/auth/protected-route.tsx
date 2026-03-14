import { Redirect } from "wouter";
import { useAppStore } from "@/store/auth.store";
import { AppLayout } from "@/components/app/app-layout";

interface RouteProps {
  component: React.ComponentType;
}

export function ProtectedRoute({ component: Component }: RouteProps) {
  const { user } = useAppStore();

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

  if (!isAuthLoading && user) {
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  return <Component />;
}
