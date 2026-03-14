/**
 * App.tsx — Root application component
 *
 * Architectural overview:
 *  - QueryClientProvider: wraps the entire app with TanStack Query for async state
 *  - ThemeProvider: manages light/dark/system theme via CSS class on <html>
 *  - TooltipProvider: enables shadcn/ui tooltips app-wide
 *  - Router: handles all client-side routing via wouter
 *
 * Route types:
 *  - PublicOnlyRoute: accessible only when NOT logged in (login, signup)
 *  - ProtectedRoute:  requires auth + onboarding completion; redirects otherwise
 *  - Open routes:     onboarding, 404 (not behind auth guard)
 */

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/protected-route";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
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

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={() => <PublicOnlyRoute component={Landing} />} />
      <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/signup" component={() => <PublicOnlyRoute component={Signup} />} />
      <Route path="/forgot-password" component={() => <PublicOnlyRoute component={ForgotPassword} />} />

      {/* Onboarding — accessible to authed users who haven't completed it */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Protected app routes */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
      <Route path="/systems" component={() => <ProtectedRoute component={SystemsPage} />} />
      <Route path="/systems/new" component={() => <ProtectedRoute component={SystemBuilderPage} />} />
      <Route path="/systems/:id/edit" component={() => <ProtectedRoute component={SystemBuilderPage} />} />
      <Route path="/checkins" component={() => <ProtectedRoute component={Checkins} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/journal" component={() => <ProtectedRoute component={Journal} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

      {/* 404 */}
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
