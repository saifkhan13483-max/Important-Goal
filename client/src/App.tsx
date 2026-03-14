import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Goals from "@/pages/goals";
import SystemsPage from "@/pages/systems";
import SystemBuilderPage from "@/pages/system-builder";
import Checkins from "@/pages/checkins";
import Analytics from "@/pages/analytics";
import Journal from "@/pages/journal";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <Button size="icon" variant="ghost" onClick={() => setTheme(next)} data-testid="button-theme-toggle">
      <Icon className="w-4 h-4" />
    </Button>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = { "--sidebar-width": "17rem", "--sidebar-width-icon": "3.5rem" };
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-3 w-48">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
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

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user && user.onboardingCompleted) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicOnlyRoute component={Landing} />} />
      <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/signup" component={() => <PublicOnlyRoute component={Signup} />} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
      <Route path="/systems" component={() => <ProtectedRoute component={SystemsPage} />} />
      <Route path="/systems/new" component={() => <ProtectedRoute component={SystemBuilderPage} />} />
      <Route path="/systems/:id/edit" component={() => <ProtectedRoute component={SystemBuilderPage} />} />
      <Route path="/checkins" component={() => <ProtectedRoute component={Checkins} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/journal" component={() => <ProtectedRoute component={Journal} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
