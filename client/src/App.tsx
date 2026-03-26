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
 *
 * Performance: all heavy app routes are lazy-loaded via React.lazy/Suspense
 * so the initial bundle only includes the landing, auth, and shell code.
 */

import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/auth.store";
import { sendWeeklyReport, isWeeklyReportDue, markWeeklyReportSent } from "@/lib/emailjs";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute, PublicOnlyRoute, OnboardingRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Eagerly loaded (critical path / small pages) ── */
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import NotFound from "@/pages/not-found";

/* ── Lazy-loaded (heavy app routes — deferred until needed) ── */
const Pricing         = lazy(() => import("@/pages/pricing"));
const PrivacyPolicy   = lazy(() => import("@/pages/privacy"));
const TermsOfService  = lazy(() => import("@/pages/terms"));
const SupportPage     = lazy(() => import("@/pages/support"));
const Onboarding      = lazy(() => import("@/pages/onboarding"));
const Dashboard       = lazy(() => import("@/pages/dashboard"));
const Goals           = lazy(() => import("@/pages/goals"));
const GoalDetail      = lazy(() => import("@/pages/goal-detail"));
const SystemsPage     = lazy(() => import("@/pages/systems"));
const SystemBuilderPage  = lazy(() => import("@/pages/system-builder"));
const SystemDetailPage   = lazy(() => import("@/pages/system-detail"));
const TemplatesPage   = lazy(() => import("@/pages/templates"));
const Checkins        = lazy(() => import("@/pages/checkins"));
const Analytics       = lazy(() => import("@/pages/analytics"));
const Journal         = lazy(() => import("@/pages/journal"));
const Settings        = lazy(() => import("@/pages/settings"));
const AiCoach         = lazy(() => import("@/pages/ai-coach"));
const CheckoutSuccess = lazy(() => import("@/pages/checkout-success"));
const AdminPage       = lazy(() => import("@/pages/admin"));
const WorkspacePage   = lazy(() => import("@/pages/workspace"));
const PublicProfile   = lazy(() => import("@/pages/public-profile"));
const AchievementsPage = lazy(() => import("@/pages/achievements"));
const WeeklyReview     = lazy(() => import("@/pages/weekly-review"));

/**
 * PageLoader — minimal skeleton shown while a lazy chunk is downloading.
 * Keeps the layout stable (no layout shift) during the ~100–200 ms delay.
 */
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48 rounded-xl" />
      <Skeleton className="h-4 w-72 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

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
    function checkAndNotify() {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const enabled = localStorage.getItem("strivo_reminder_enabled") === "true";
      if (!enabled) return;
      const reminderTime = localStorage.getItem("strivo_reminder_time") || "08:00";
      const today = new Date().toISOString().split("T")[0];
      const lastNotified = localStorage.getItem("strivo_reminder_last_notified");
      if (lastNotified === today) return;

      const [hours, minutes] = reminderTime.split(":").map(Number);
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (now >= scheduledTime) {
        const missedYesterday = localStorage.getItem("strivo_missed_yesterday") === "true";
        const body = missedYesterday
          ? "Missed yesterday? Restart tiny. Your system only needs the minimum version today."
          : "Time to check in with your habits. Even the minimum version counts.";
        try {
          new Notification("Strivo — Daily Check-in", {
            body,
            icon: "/favicon.ico",
            tag: "strivo-daily-reminder",
          });
          localStorage.setItem("strivo_reminder_last_notified", today);
        } catch {
          // Ignore notification errors silently
        }
      }
    }

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

/**
 * WeeklyReportChecker — fires weekly report emails via EmailJS.
 * Checks once on mount (and once an hour) whether a report is due.
 */
function WeeklyReportChecker() {
  const { user } = useAppStore();

  const check = useCallback(async () => {
    if (!user || !user.weeklyReportEnabled) return;
    if (!isWeeklyReportDue()) return;
    try {
      const { getCheckins } = await import("@/services/checkins.service");
      const { getSystems } = await import("@/services/systems.service");
      const [checkins, systems] = await Promise.all([
        getCheckins(user.id),
        getSystems(user.id),
      ]);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekKey = (d: Date) => d.toISOString().split("T")[0];
      const weekStart = weekKey(weekAgo);

      const weekCheckins = checkins.filter(c => c.dateKey >= weekStart);
      const done = weekCheckins.filter(c => c.status === "done").length;
      const total = weekCheckins.length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      const streakMap: Record<string, number> = {};
      const sortedDates = [...new Set(checkins.map(c => c.dateKey))].sort().reverse();
      for (const sys of systems) {
        let streak = 0;
        for (const dateKey of sortedDates) {
          const c = checkins.find(ci => ci.systemId === sys.id && ci.dateKey === dateKey);
          if (c?.status === "done") streak++;
          else break;
        }
        streakMap[sys.id] = streak;
      }

      const currentStreak = Math.max(0, ...Object.values(streakMap));
      const activeSystems = systems.filter(s => s.active !== false).length;

      let bestStreak = currentStreak;
      try {
        const { computeAnalytics } = await import("@/services/analytics.service");
        const analytics = computeAnalytics(checkins, systems, []);
        bestStreak = Math.max(currentStreak, analytics.topBestStreak);
      } catch { /* fallback to currentStreak */ }

      await sendWeeklyReport({
        email: user.email ?? "",
        name: user.name ?? "there",
        completionRate,
        currentStreak,
        bestStreak,
        checkinsThisWeek: done,
        activeSystems,
      });
      markWeeklyReportSent();
    } catch {
      // silently ignore — don't disrupt app on email failure
    }
  }, [user]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [check]);

  return null;
}

/**
 * ScrollToTop — scrolls window to top on every route change.
 * Prevents users from landing mid-page when navigating between routes.
 */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) { localStorage.setItem("strivo_pending_ref", ref.toUpperCase().trim()); }
    } catch {}
  }, []);
  return null;
}

function Router() {
  const [location] = useLocation();
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <ReferralCapture />
      <AnimatePresence mode="wait" initial={false}>
        <Switch key={location}>
          {/* Public routes */}
          <Route path="/" component={() => <PublicOnlyRoute component={Landing} />} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/support" component={SupportPage} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
          <Route path="/signup" component={() => <PublicOnlyRoute component={Signup} />} />
          <Route path="/forgot-password" component={() => <PublicOnlyRoute component={ForgotPassword} />} />

          {/* Onboarding — requires auth, but exempt from onboarding-completion redirect */}
          <Route path="/onboarding" component={() => <OnboardingRoute component={Onboarding} />} />

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
          <Route path="/ai-coach" component={() => <ProtectedRoute component={AiCoach} />} />
          <Route path="/workspace" component={() => <ProtectedRoute component={WorkspacePage} />} />
          <Route path="/checkout/success" component={CheckoutSuccess} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/achievements" component={() => <ProtectedRoute component={AchievementsPage} />} />
          <Route path="/review" component={() => <ProtectedRoute component={WeeklyReview} />} />

          {/* Public profile pages */}
          <Route path="/profile/:code" component={PublicProfile} />

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  const gscCode = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined;

  return (
    <HelmetProvider>
    <ErrorBoundary>
      {gscCode && (
        <Helmet>
          <meta name="google-site-verification" content={gscCode} />
        </Helmet>
      )}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthInitializer />
            <ReminderChecker />
            <WeeklyReportChecker />
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
}
