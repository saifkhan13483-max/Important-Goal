/**
 * App.tsx — Root application component
 *
 * Architectural overview:
 *  - QueryClientProvider: wraps the entire app with TanStack Query for async state
 *  - ThemeProvider: manages light/dark/system theme via CSS class on <html>
 *  - TooltipProvider: enables shadcn/ui tooltips app-wide
 *  - AuthInitializer: sets up Firebase onAuthStateChanged listener at app level
 *  - Router: handles all client-side routing via wouter
 *
 * Route types:
 *  - PublicOnlyRoute: accessible only when NOT logged in (login, signup)
 *  - ProtectedRoute:  requires auth + onboarding completion; redirects otherwise
 *  - Open routes:     onboarding, 404 (not behind auth guard)
 */

import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";

import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Goals from "@/pages/goals";
import GoalDetail from "@/pages/goal-detail";
import SystemsPage from "@/pages/systems";
import SystemBuilderPage from "@/pages/system-builder";
import SystemDetailPage from "@/pages/system-detail";
import TemplatesPage from "@/pages/templates";
import Checkins from "@/pages/checkins";
import Analytics from "@/pages/analytics";
import Journal from "@/pages/journal";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

/**
 * AuthInitializer — Sets up the Firebase onAuthStateChanged listener at the
 * top of the component tree, ensuring auth state is initialized regardless
 * of which route the user lands on. Without this, isAuthLoading would stay
 * true forever on pages that don't themselves call useAuth().
 */
function AuthInitializer() {
  useAuth();
  return null;
}

/**
 * ReminderChecker — Fires browser push notifications for daily check-in reminders.
 * Reads reminder settings from localStorage (set in Settings page) and shows a
 * notification once per day if the configured time has passed and the user hasn't
 * already been notified today.
 */
function ReminderChecker() {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const enabled = localStorage.getItem("sf_reminder_enabled") === "true";
    if (!enabled) return;
    const reminderTime = localStorage.getItem("sf_reminder_time") || "08:00";
    const today = new Date().toISOString().split("T")[0];
    const lastNotified = localStorage.getItem("sf_reminder_last_notified");
    if (lastNotified === today) return;

    const [hours, minutes] = reminderTime.split(":").map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (now >= scheduledTime) {
      const missedYesterday = localStorage.getItem("sf_missed_yesterday") === "true";
      const body = missedYesterday
        ? "Missed yesterday? Restart tiny. Your system only needs the minimum version today."
        : "Time to check in with your habits. Even the minimum version counts.";
      try {
        new Notification("SystemForge — Daily Check-in", {
          body,
          icon: "/favicon.ico",
          tag: "sf-daily-reminder",
        });
        localStorage.setItem("sf_reminder_last_notified", today);
      } catch {
        // Ignore notification errors silently
      }
    }
  }, []);

  return null;
}

function Router() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
    <Switch key={location}>
      {/* Public routes */}
      <Route path="/" component={() => <PublicOnlyRoute component={Landing} />} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/signup" component={() => <PublicOnlyRoute component={Signup} />} />
      <Route path="/forgot-password" component={() => <PublicOnlyRoute component={ForgotPassword} />} />

      {/* Onboarding — accessible to authed users who haven't completed it */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Protected app routes */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
      <Route path="/goals/:id" component={() => <ProtectedRoute component={GoalDetail} />} />
      <Route path="/systems" component={() => <ProtectedRoute component={SystemsPage} />} />
      <Route path="/systems/new" component={() => <ProtectedRoute component={SystemBuilderPage} />} />
      <Route path="/systems/:id/edit" component={() => <ProtectedRoute component={SystemBuilderPage} />} />
      <Route path="/systems/:id" component={() => <ProtectedRoute component={SystemDetailPage} />} />
      <Route path="/templates" component={() => <ProtectedRoute component={TemplatesPage} />} />
      <Route path="/checkins" component={() => <ProtectedRoute component={Checkins} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/journal" component={() => <ProtectedRoute component={Journal} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthInitializer />
          <ReminderChecker />
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
