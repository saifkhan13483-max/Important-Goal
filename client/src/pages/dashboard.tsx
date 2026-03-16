import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Goal, System, Checkin, JournalEntry } from "@/types/schema";
import { getGoals } from "@/services/goals.service";
import { getSystems } from "@/services/systems.service";
import { getCheckinsByDate, getCheckins, upsertCheckin } from "@/services/checkins.service";
import { getJournals } from "@/services/journal.service";
import { computeAnalytics } from "@/services/analytics.service";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Zap, CheckSquare, TrendingUp, ArrowRight, Plus, Flame,
  Calendar, BookOpen, Check, Minus, X, BarChart2, PenLine, Sparkles,
  Lightbulb, Star, Loader2, AlertCircle, RefreshCw, Trophy, Heart,
  LayoutGrid, Flag, TrendingDown, Brain,
} from "lucide-react";
import { FutureSelfAudioPlayer, hasFutureSelfAudio } from "@/components/future-self-audio";
import { format, parseISO, subDays } from "date-fns";
import { cn } from "@/lib/utils";

const beginnerTips = [
  "Start small. A good system is easy to repeat — even on your worst day.",
  "Your goal gives direction. Your system creates daily progress.",
  "On hard days, your backup plan keeps you moving. That's why we build one.",
  "Small actions done consistently beat big plans done rarely.",
  "Missing one day is not failure. Getting back the next day is success.",
  "Identity first: 'I am someone who...' is more powerful than 'I want to...'",
  "The best habit trigger is something you already do every day.",
  "Your reward should be immediate — it trains your brain to love the habit.",
];

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getTipOfTheDay(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return beginnerTips[dayOfYear % beginnerTips.length];
}

/* ─── Next Milestone widget ─────────────────────────────────────── */
function NextMilestone({
  goals, analytics,
}: {
  goals: Goal[];
  analytics: ReturnType<typeof computeAnalytics>;
}) {
  const today = new Date().toISOString().split("T")[0];

  // Find nearest upcoming deadline
  const upcoming = goals
    .filter(g => g.status === "active" && g.deadline && g.deadline >= today)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))[0];

  // Compute best streak and next streak milestone
  const bestCurrentStreak = Math.max(0, ...Object.values(analytics.streaks));
  const STREAK_MILESTONES = [7, 14, 21, 30, 50, 66, 100];
  const nextStreakTarget = STREAK_MILESTONES.find(m => m > bestCurrentStreak) ?? 100;
  const streakDaysLeft   = nextStreakTarget - bestCurrentStreak;

  if (upcoming) {
    const daysLeft = Math.ceil(
      (new Date(upcoming.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const urgency = daysLeft <= 7 ? "text-chart-4" : "text-primary";
    return (
      <Card className="hover-elevate" data-testid="widget-next-milestone">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Flag className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Milestone</p>
              <p className="font-medium text-sm truncate">{upcoming.title}</p>
              <p className={`text-xs mt-0.5 font-semibold ${urgency}`}>
                {daysLeft === 0
                  ? "Due today!"
                  : daysLeft === 1
                  ? "Tomorrow"
                  : `${daysLeft} days left`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Target: {format(parseISO(upcoming.deadline!), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bestCurrentStreak > 0) {
    return (
      <Card className="hover-elevate" data-testid="widget-next-milestone">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-chart-4/10 flex items-center justify-center flex-shrink-0">
              <Flame className="w-4.5 h-4.5 text-chart-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Milestone</p>
              <p className="font-medium text-sm">{nextStreakTarget}-day streak</p>
              <p className="text-xs text-chart-4 mt-0.5 font-semibold">{streakDaysLeft} more day{streakDaysLeft !== 1 ? "s" : ""} to go</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-chart-4/70 transition-all"
                  style={{ width: `${Math.round((bestCurrentStreak / nextStreakTarget) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {bestCurrentStreak} of {nextStreakTarget} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate border-dashed" data-testid="widget-next-milestone">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Flag className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Milestone</p>
            <p className="font-medium text-sm">No milestone yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Set a goal deadline or build a 7-day streak to unlock your first milestone.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── One Insight card ───────────────────────────────────────────── */
function OneInsight({
  analytics, activeSystems, completionPct,
}: {
  analytics: ReturnType<typeof computeAnalytics>;
  activeSystems: System[];
  completionPct: number;
}) {
  const insight = (() => {
    // Best day-of-week
    const bestDow = analytics.dayOfWeekStats
      .filter(d => d.totalCount >= 3)
      .sort((a, b) => b.doneRate - a.doneRate)[0];

    // Worst day-of-week
    const worstDow = analytics.dayOfWeekStats
      .filter(d => d.totalCount >= 3)
      .sort((a, b) => a.doneRate - b.doneRate)[0];

    // Mood improvement (moodAfter - moodBefore trend)
    const hasMoodInsight = analytics.hasMoodData;

    // Overall completion rate trend
    const recent7 = analytics.last30Days.slice(-7);
    const prev7   = analytics.last30Days.slice(-14, -7);
    const recentAvg = recent7.reduce((s, d) => s + (d.total > 0 ? (d.done / d.total) * 100 : 0), 0) / 7;
    const prevAvg   = prev7.reduce((s, d) => s + (d.total > 0 ? (d.done / d.total) * 100 : 0), 0) / 7;
    const trendDiff = Math.round(recentAvg - prevAvg);

    if (bestDow && bestDow.doneRate > 60 && worstDow && bestDow.shortDay !== worstDow.shortDay) {
      return {
        icon: TrendingUp,
        color: "text-chart-3",
        bg:   "bg-chart-3/10",
        title: `${bestDow.day}s are your strongest`,
        body:  `You complete ${bestDow.doneRate}% of habits on ${bestDow.day}s — your personal high. Try to schedule your hardest habits for this day.`,
      };
    }

    if (activeSystems.length > 0 && trendDiff >= 10) {
      return {
        icon: TrendingUp,
        color: "text-chart-3",
        bg:   "bg-chart-3/10",
        title: "You're trending up",
        body:  `Your completion rate improved by ${trendDiff}% this week compared to last week. Keep this momentum going!`,
      };
    }

    if (activeSystems.length > 0 && trendDiff <= -10) {
      return {
        icon: TrendingDown,
        color: "text-chart-4",
        bg:   "bg-chart-4/10",
        title: "Slight dip this week",
        body:  `Your completion rate dropped ${Math.abs(trendDiff)}% vs last week. That's okay — review your fallback plans and start fresh today.`,
      };
    }

    if (hasMoodInsight) {
      const highMoodBucket = analytics.moodBuckets.filter(b => b.count >= 2 && b.mood >= 4);
      if (highMoodBucket.length > 0) {
        const avg = Math.round(highMoodBucket.reduce((s, b) => s + b.completionPct, 0) / highMoodBucket.length);
        return {
          icon: Heart,
          color: "text-primary",
          bg:   "bg-primary/10",
          title: "Good mood = better habits",
          body:  `When you rate your mood as Good or Great before a session, you complete ${avg}% of habits. Protecting your energy pays off.`,
        };
      }
    }

    if (activeSystems.length === 0) {
      return {
        icon: Sparkles,
        color: "text-primary",
        bg:   "bg-primary/10",
        title: "Your first insight is coming",
        body:  "Build your first system and check in for a few days — we'll start showing personalized insights based on your patterns.",
      };
    }

    return {
      icon: Lightbulb,
      color: "text-primary",
      bg:   "bg-primary/10",
      title: "Check in consistently",
      body:  `With ${activeSystems.length} active system${activeSystems.length !== 1 ? "s" : ""}, a few more days of data will reveal your strongest patterns.`,
    };
  })();

  const Icon = insight.icon;
  return (
    <Card className="hover-elevate" data-testid="widget-one-insight">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.bg}`}>
            <Icon className={`w-4.5 h-4.5 ${insight.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">One Insight</p>
            <p className="font-medium text-sm">{insight.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.body}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GreetingBanner({ name, identityStatement, completionPct, todayDone, todayTotal }: {
  name: string; identityStatement?: string | null; completionPct: number; todayDone: number; todayTotal: number;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="relative rounded-2xl overflow-hidden p-4 sm:p-6 md:p-8 gradient-brand text-white">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-48 h-48 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-xs sm:text-sm font-medium mb-1">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 leading-tight">{greeting}, {name.split(" ")[0]}! 👋</h1>
          {identityStatement ? (
            <p className="text-white/90 text-xs sm:text-sm font-semibold mt-1 leading-snug">
              Remember: You are a person who {identityStatement}.
            </p>
          ) : (
            <p className="text-white/80 text-xs sm:text-sm">
              {todayTotal === 0
                ? "Ready to start building your systems?"
                : todayDone === todayTotal
                ? "Perfect day! All habits complete. 🔥"
                : `${todayTotal - todayDone} habit${todayTotal - todayDone !== 1 ? "s" : ""} left for today.`}
            </p>
          )}
          {identityStatement && todayTotal > 0 && (
            <p className="text-white/70 text-xs mt-1.5">
              {todayDone === todayTotal ? "Perfect day! All habits complete. 🔥" : `${todayTotal - todayDone} habit${todayTotal - todayDone !== 1 ? "s" : ""} left for today.`}
            </p>
          )}
        </div>
        {todayTotal > 0 && (
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{completionPct}%</p>
            <p className="text-xs text-white/70">complete</p>
          </div>
        )}
      </div>
      {todayTotal > 0 && (
        <div className="mt-3 sm:mt-4">
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/80 transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="text-xs text-white/60 mt-1">{todayDone} of {todayTotal} systems checked in</p>
        </div>
      )}
    </div>
  );
}

/* ─── Hype Drop Warning ──────────────────────────────────────────── */
function HypeDropWarning({
  bestStreak, hadStreakBreak, fallbackPlan, minimumAction, dismissedKey,
}: {
  bestStreak: number;
  hadStreakBreak: boolean;
  fallbackPlan?: string | null;
  minimumAction?: string | null;
  dismissedKey: string;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissedKey) === "true"; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissedKey, "true"); } catch {}
    setDismissed(true);
  };

  if (hadStreakBreak) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-2/8 border border-chart-2/20" data-testid="hype-drop-streak-break">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <RefreshCw className="w-4 h-4 text-chart-2 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">Streaks break. Systems don't. 🔁</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Missing one day never derailed anyone. Missing two days starts a pattern.
          </p>
          {(minimumAction || fallbackPlan) && (
            <div className="mt-2 space-y-1">
              {minimumAction && <p className="text-xs font-medium text-foreground">💪 Your minimum action: <span className="text-muted-foreground">{minimumAction}</span></p>}
              {fallbackPlan && <p className="text-xs font-medium text-foreground">📋 Your recovery plan: <span className="text-muted-foreground">{fallbackPlan}</span></p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (bestStreak >= 1 && bestStreak <= 7) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20" data-testid="hype-drop-early">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <Flame className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">Building momentum! 🚀</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Day {bestStreak} — the first week is the hardest. Your system is doing the heavy lifting, not your motivation. Keep going!
          </p>
        </div>
      </div>
    );
  }

  if (bestStreak >= 8 && bestStreak <= 21) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/25" data-testid="hype-drop-warning">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <AlertCircle className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">⚠️ Week 2–3 Alert: Hype Drop Zone</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Motivation naturally drops around now — this is completely normal. Your SYSTEM carries you, not your mood.
            Keep your minimum action going. Just show up.
          </p>
        </div>
      </div>
    );
  }

  if (bestStreak >= 22 && bestStreak <= 65) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="hype-drop-zone">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <Brain className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">You're in the habit-building zone.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Science says 66 days builds automaticity — and you're on day {bestStreak}. Your brain is rewiring itself. Stay consistent.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Day 2 / 3 / 7 Retention Banners ──────────────────────────── */
function RetentionBanner({
  allCheckins, activeSystems, systemsWithMinAction,
}: {
  allCheckins: Checkin[];
  activeSystems: System[];
  systemsWithMinAction: System[];
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("sf_retention_dismissed_" + new Date().toISOString().split("T")[0]) === "true"; } catch { return false; }
  });

  if (dismissed || activeSystems.length === 0) return null;

  const sortedDates = [...new Set(allCheckins.map(c => c.dateKey))].sort();
  if (sortedDates.length === 0) return null;

  const firstDate   = new Date(sortedDates[0] + "T00:00:00");
  const today       = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
  const daysSince   = Math.round((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const dismiss     = () => {
    try { localStorage.setItem("sf_retention_dismissed_" + new Date().toISOString().split("T")[0], "true"); } catch {}
    setDismissed(true);
  };

  const firstMinAction = systemsWithMinAction[0]?.minimumAction;

  if (daysSince === 1) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20" data-testid="retention-banner-day2">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <Sparkles className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">Day 2 — this is how systems work.</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            You didn't need motivation yesterday. You needed a low enough bar to keep going. That's the whole idea.
          </p>
          {firstMinAction && (
            <p className="text-xs font-medium text-foreground">
              Even this counts today: <span className="text-chart-3">"{firstMinAction}"</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (daysSince === 2) {
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/20" data-testid="retention-banner-day3">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <AlertCircle className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">Day 3 is where most people start negotiating.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Don't go bigger. Go smaller. The system that survives day 3 is the one that actually sticks.
          </p>
          <Link href="/checkins">
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1.5" data-testid="button-day3-checkin">
              <CheckSquare className="w-3 h-3" />
              Do today's minimum
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (daysSince === 6) {
    const uniqueDaysChecked = new Set(allCheckins.filter(c => c.status !== "missed").map(c => c.dateKey)).size;
    const survivalRate = sortedDates.length > 0
      ? Math.round((uniqueDaysChecked / Math.min(7, sortedDates.length)) * 100)
      : 0;

    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="retention-banner-day7">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="Dismiss">×</button>
        <Trophy className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground mb-1">One week. That's not nothing.</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            Seven days ago you decided to build something different. Here's what that looked like:
          </p>
          <div className="flex gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-lg font-extrabold text-primary">{uniqueDaysChecked}<span className="text-xs text-muted-foreground font-normal">/7</span></p>
              <p className="text-[10px] text-muted-foreground">days active</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-chart-3">{survivalRate}%</p>
              <p className="text-[10px] text-muted-foreground">survival rate</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">What helped you keep going this week?</p>
        </div>
      </div>
    );
  }

  return null;
}

function RecoveryBanner({ missedSystems }: { missedSystems: System[] }) {
  if (missedSystems.length === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/20">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <RefreshCw className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-chart-4 mb-0.5">Missed yesterday? Let's reset gently.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {missedSystems.length === 1
              ? `"${missedSystems[0].title}" was missed. Use the fallback plan — even 1 minute counts.`
              : `${missedSystems.length} systems were missed. Start fresh today with the smallest possible action.`}
          </p>
        </div>
      </div>
      <Link href="/checkins" className="sm:flex-shrink-0">
        <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs h-7">
          Check in now
        </Button>
      </Link>
    </div>
  );
}

function TomorrowIntentionCard({ checkin, systemName }: { checkin: Checkin; systemName: string }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(`tomorrow-intention-dismissed-${checkin.id}`) === "true"; } catch { return false; }
  });
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20" data-testid="tomorrow-intention-card">
      <div className="flex-shrink-0 text-xl">📋</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-chart-3 mb-0.5">Today's intention — you set this yesterday</p>
        <p className="text-xs text-muted-foreground mb-1.5">For <span className="font-medium text-foreground">{systemName}</span>:</p>
        <p className="text-sm text-foreground font-medium leading-snug">"{checkin.tomorrowIntention}"</p>
      </div>
      <button
        onClick={() => {
          try { localStorage.setItem(`tomorrow-intention-dismissed-${checkin.id}`, "true"); } catch {}
          setDismissed(true);
        }}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
        aria-label="Dismiss intention reminder"
        data-testid="button-dismiss-intention"
      >
        ×
      </button>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color, hint }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; hint?: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide leading-tight">{label}</p>
            <p
              className="text-xl sm:text-2xl font-extrabold leading-none mb-1"
              data-testid={`metric-${label.toLowerCase().replace(/ /g, "-")}`}
            >
              {value}
            </p>
            {sub && <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{sub}</p>}
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyStateCard({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon: any;
  title: string;
  description: string;
  primaryAction: { label: string; href: string; testId: string };
  secondaryAction?: { label: string; href: string; testId: string };
}) {
  return (
    <Card className="border-primary/20 bg-primary/3">
      <CardContent className="p-7 sm:p-10 md:p-14 text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-5">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </div>
        <h3 className="font-bold text-base sm:text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-5 sm:mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
          <Link href={primaryAction.href} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" data-testid={primaryAction.testId}>{primaryAction.label}</Button>
          </Link>
          {secondaryAction && (
            <Link href={secondaryAction.href} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto" data-testid={secondaryAction.testId}>
                {secondaryAction.label}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickCheckinRow({
  system, existingCheckin, userId, today,
}: { system: System; existingCheckin?: Checkin; userId: string; today: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const current = existingCheckin?.status as "done" | "partial" | "missed" | undefined;

  const mutation = useMutation({
    mutationFn: (status: string) =>
      upsertCheckin(userId, system.id, today, { status }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["checkins-today", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      const identityLine = system.identityStatement
        ? `${system.identityStatement.charAt(0).toUpperCase() + system.identityStatement.slice(1)}. You just proved it.`
        : "You showed up. You just proved it.";
      const msgs: Record<string, string> = {
        done:    identityLine,
        partial: "Partial is not failure. You kept the system alive.",
        missed:  "It's paused, not broken. See you tomorrow.",
      };
      toast({ title: status === "done" ? "Done! 🔥" : status === "partial" ? "Partial saved" : "Noted", description: msgs[status] ?? "Saved!" });
    },
    onError: () => toast({ title: "Couldn't save", variant: "destructive" }),
  });

  const buttons = [
    { status: "done",    label: "Done",    Icon: Check, active: "bg-chart-3 text-white border-chart-3",    idle: "hover:border-chart-3/50 hover:text-chart-3" },
    { status: "partial", label: "Partial", Icon: Minus, active: "bg-chart-4 text-white border-chart-4",    idle: "hover:border-chart-4/50 hover:text-chart-4" },
    { status: "missed",  label: "Missed",  Icon: X,     active: "bg-muted-foreground/60 text-white border-muted-foreground/60", idle: "hover:border-muted-foreground/30 hover:text-muted-foreground" },
  ] as const;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        current === "done" ? "bg-chart-3/5 border-chart-3/20" : "bg-muted/30 border-border/50 hover:border-border",
      )}
      data-testid={`quick-checkin-${system.id}`}
    >
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
        current === "done" ? "bg-chart-3/15" : "bg-primary/10",
      )}>
        {current === "done"
          ? <Check className="w-3.5 h-3.5 text-chart-3" />
          : <Zap className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block truncate">{system.title}</span>
        {system.identityStatement && current !== "done" && (
          <span className="text-[11px] text-muted-foreground/70 truncate block leading-tight">
            I am a person who {system.identityStatement}
          </span>
        )}
      </div>
      {system.minimumAction && (
        <span className="text-xs text-muted-foreground truncate max-w-24 hidden sm:block">{system.minimumAction}</span>
      )}
      <div className="flex items-center gap-1 flex-shrink-0">
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          buttons.map(({ status, label, Icon, active, idle }) => (
            <button
              key={status}
              type="button"
              onClick={() => mutation.mutate(status)}
              title={label}
              data-testid={`quick-checkin-${system.id}-${status}`}
              className={cn(
                "w-7 h-7 rounded-md border text-xs flex items-center justify-center transition-all",
                current === status ? active : `bg-muted/40 border-border text-muted-foreground ${idle}`,
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const today = getTodayKey();
  const yesterday = subDays(new Date(), 1).toISOString().split("T")[0];
  const tip = getTipOfTheDay();

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: todayCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins-today", userId, today],
    queryFn: () => getCheckinsByDate(userId, today),
    enabled: !!userId,
  });

  const { data: allCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const { data: journals = [] } = useQuery<JournalEntry[]>({
    queryKey: ["journals", userId],
    queryFn: () => getJournals(userId),
    enabled: !!userId,
  });

  const analytics = useMemo(
    () => computeAnalytics(allCheckins, systems, goals),
    [allCheckins, systems, goals],
  );

  const activeGoals = goals.filter(g => g.status === "active");
  const activeSystems = systems.filter(s => s.active);
  const todayDone = todayCheckins.filter(c => c.status === "done").length;
  const todayTotal = activeSystems.length;
  const completionPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const topStreaks = Object.entries(analytics.streaks)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3);

  const yesterdayCheckins = allCheckins.filter(c => c.dateKey === yesterday);
  const missedYesterday = activeSystems.filter(s => {
    const c = yesterdayCheckins.find(c => c.systemId === s.id);
    return c?.status === "missed";
  });

  const tomorrowIntentionCheckin = yesterdayCheckins.find(c => c.tomorrowIntention && c.tomorrowIntention.trim());

  const recentActivity = useMemo(() => {
    type ActivityItem =
      | { kind: "checkin"; data: Checkin; sortKey: string }
      | { kind: "journal"; data: JournalEntry; sortKey: string };

    const checkinItems: ActivityItem[] = [...allCheckins]
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .slice(0, 10)
      .map(c => ({ kind: "checkin" as const, data: c, sortKey: c.dateKey }));

    const journalItems: ActivityItem[] = [...journals]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 10)
      .map(j => ({ kind: "journal" as const, data: j, sortKey: (j.createdAt ?? "").split("T")[0] }));

    return [...checkinItems, ...journalItems]
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .slice(0, 5);
  }, [allCheckins, journals]);

  const isLoading = goalsLoading || systemsLoading;
  const isNewUser = !isLoading && activeGoals.length === 0 && activeSystems.length === 0;

  if (isLoading) {
    return (
      <div
        className="p-3 sm:p-5 md:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5"
        aria-busy="true"
        aria-label="Loading dashboard data"
      >
        <span className="sr-only" role="status">Loading your dashboard, please wait…</span>
        <Skeleton className="h-24 sm:h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 sm:h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-36 sm:h-40 rounded-xl" />
      </div>
    );
  }

  const systemsWithMinAction = activeSystems.filter(s => s.minimumAction);

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-5">
      <GreetingBanner
        name={user?.name || "there"}
        identityStatement={user?.identityStatement}
        completionPct={completionPct}
        todayDone={todayDone}
        todayTotal={todayTotal}
      />

      {/* Day 2 / 3 / 7 Retention Banner */}
      <RetentionBanner
        allCheckins={allCheckins}
        activeSystems={activeSystems}
        systemsWithMinAction={systemsWithMinAction}
      />

      {/* Hype Drop Warning */}
      {activeSystems.length > 0 && (() => {
        const bestStreak = Math.max(0, ...Object.values(analytics.streaks));
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split("T")[0];
        const hadStreakBreak = activeSystems.some(s => {
          const yCheckin = allCheckins.find(c => c.systemId === s.id && c.dateKey === yesterdayKey);
          return yCheckin?.status === "skipped";
        });
        const topSystem = activeSystems[0];
        const dismissedKey = `hype-drop-dismissed-${Math.floor(bestStreak / 7)}`;
        return (
          <HypeDropWarning
            bestStreak={bestStreak}
            hadStreakBreak={hadStreakBreak}
            fallbackPlan={topSystem?.fallbackPlan}
            minimumAction={topSystem?.minimumAction}
            dismissedKey={dismissedKey}
          />
        );
      })()}

      {/* Recovery banner */}
      <RecoveryBanner missedSystems={missedYesterday} />

      {/* Future Self Audio player */}
      {hasFutureSelfAudio(user?.futureAudioUrl) && (
        missedYesterday.length > 0 ? (
          <FutureSelfAudioPlayer
            context="missedDay"
            firestoreUrl={user?.futureAudioUrl}
            userName={user?.name}
            playOnFirstVisit={user?.futureAudioPlayOnFirstVisit ?? true}
            playAfterMissed={user?.futureAudioPlayAfterMissed ?? true}
            autoplay={user?.futureAudioAutoplay ?? true}
            muted={user?.futureAudioMuted ?? false}
          />
        ) : (
          <FutureSelfAudioPlayer
            context="firstVisit"
            firestoreUrl={user?.futureAudioUrl}
            userName={user?.name}
            playOnFirstVisit={user?.futureAudioPlayOnFirstVisit ?? true}
            playAfterMissed={user?.futureAudioPlayAfterMissed ?? true}
            autoplay={user?.futureAudioAutoplay ?? true}
            muted={user?.futureAudioMuted ?? false}
          />
        )
      )}

      {/* Tomorrow intention reminder */}
      {tomorrowIntentionCheckin && (() => {
        const sys = systems.find(s => s.id === tomorrowIntentionCheckin.systemId);
        return sys ? (
          <TomorrowIntentionCard checkin={tomorrowIntentionCheckin} systemName={sys.title} />
        ) : null;
      })()}

      {/* Beginner tip of the day */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
        <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-primary mb-0.5 uppercase tracking-wide">Tip of the day</p>
          <p className="text-sm text-foreground leading-relaxed">{tip}</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          label="Active Goals"
          value={activeGoals.length}
          sub={activeGoals.length === 0 ? "Create your first goal" : "in progress"}
          color="bg-primary/10 text-primary"
        />
        <MetricCard
          icon={Zap}
          label="My Systems"
          value={activeSystems.length}
          sub={activeSystems.length === 0 ? "Build your first system" : "running daily"}
          color="bg-chart-2/10 text-chart-2"
        />
        <MetricCard
          icon={CheckSquare}
          label="Today's Progress"
          value={todayTotal === 0 ? "—" : `${todayDone}/${todayTotal}`}
          sub={todayTotal === 0 ? "No systems yet" : `${completionPct}% complete`}
          color="bg-chart-3/10 text-chart-3"
        />
        <MetricCard
          icon={Flame}
          label="Streak"
          value={topStreaks[0]?.[1] ? `${topStreaks[0][1]}d` : "—"}
          sub={topStreaks[0]?.[1] ? "consecutive days" : "Check in to start"}
          color="bg-chart-4/10 text-chart-4"
        />
      </div>

      {/* Weekly consistency score */}
      {activeSystems.length > 0 && (() => {
        const last7 = analytics.last30Days.slice(-7);
        const weekDone  = last7.filter(d => d.done > 0).length;
        const weekLabel = weekDone >= 6 ? "Excellent week" : weekDone >= 4 ? "Solid week" : weekDone >= 2 ? "Getting started" : "Let's build a streak";
        const weekColor = weekDone >= 6 ? "bg-chart-3/10 border-chart-3/20 text-chart-3" : weekDone >= 4 ? "bg-primary/8 border-primary/20 text-primary" : "bg-muted/50 border-border/50 text-muted-foreground";
        return (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${weekColor}`} data-testid="weekly-consistency">
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">{weekLabel} · {weekDone} of 7 days active</p>
              <div className="flex gap-1">
                {last7.map((d, i) => (
                  <div
                    key={i}
                    title={d.done > 0 ? `${d.date}: ${d.done} done` : `${d.date}: nothing`}
                    className={`h-2 flex-1 rounded-full transition-all ${d.done > 0 ? "bg-current opacity-80" : "bg-current opacity-15"}`}
                  />
                ))}
              </div>
            </div>
            <span className="text-lg font-extrabold flex-shrink-0">{Math.round((weekDone / 7) * 100)}%</span>
          </div>
        );
      })()}

      {/* Next Milestone + One Insight row */}
      {!isNewUser && (
        <div className="grid md:grid-cols-2 gap-4">
          <NextMilestone goals={goals} analytics={analytics} />
          <OneInsight analytics={analytics} activeSystems={activeSystems} completionPct={completionPct} />
        </div>
      )}

      {/* Empty state for new users */}
      {isNewUser && (
        <EmptyStateCard
          icon={Sparkles}
          title="Your journey starts here"
          description="You haven't created your first system yet. Start with one small habit — something you could do even on your worst day. One action, done consistently, changes everything."
          primaryAction={{ label: "Build my first system", href: "/systems/new", testId: "button-create-first-system" }}
          secondaryAction={{ label: "Create a goal first", href: "/goals", testId: "button-create-first-goal" }}
        />
      )}

      {/* Today's check-in */}
      {activeSystems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Today's Check-ins</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Tap Done, Partial, or Missed for each habit</p>
              </div>
              <Link href="/checkins">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-today-checkins">
                  Full view
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {completionPct === 100 && todayTotal > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl gradient-brand text-white mb-4">
                <Trophy className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">Perfect day! All done. 🔥</p>
                  <p className="text-xs text-white/80">Incredible consistency. See you tomorrow!</p>
                </div>
              </div>
            )}
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{todayDone} of {todayTotal} habits done today</span>
                <span className="font-bold">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2.5" />
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-end gap-3 px-1 mb-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Done · Partial · Missed</span>
              </div>
              {activeSystems.slice(0, 6).map(system => (
                <QuickCheckinRow
                  key={system.id}
                  system={system}
                  existingCheckin={todayCheckins.find(c => c.systemId === system.id)}
                  userId={userId}
                  today={today}
                />
              ))}
              {activeSystems.length > 6 && (
                <Link href="/checkins">
                  <p className="text-xs text-muted-foreground text-center py-1 hover:text-primary transition-colors cursor-pointer">
                    +{activeSystems.length - 6} more — view all
                  </p>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No systems yet — guided nudge */}
      {!isNewUser && activeSystems.length === 0 && activeGoals.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-base mb-2">You have goals — now build a system</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
              A goal without a system is just a wish. Build a daily habit around your first goal in 5 minutes.
            </p>
            <Link href="/systems/new">
              <Button size="sm" className="gap-1.5" data-testid="button-build-first-system">
                <Zap className="w-3.5 h-3.5" />
                Build my first system
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Weekly Progress */}
      {activeSystems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">This Week</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Your check-in consistency for the last 7 days</p>
              </div>
              <Link href="/analytics">
                <Button variant="ghost" size="sm" data-testid="link-weekly-analytics">
                  Full insights <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const last7: { dateKey: string; label: string; shortDay: string; pct: number | null; isToday: boolean }[] = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateKey = d.toISOString().split("T")[0];
                const dayCheckins = allCheckins.filter(c => c.dateKey === dateKey);
                const doneCount = dayCheckins.filter(c => c.status === "done").length;
                const pct = activeSystems.length > 0 && dayCheckins.length > 0
                  ? Math.round((doneCount / activeSystems.length) * 100)
                  : dayCheckins.length === 0 && i === 0 ? null
                  : dayCheckins.length === 0 ? null
                  : 0;
                last7.push({
                  dateKey,
                  label: format(d, "EEE"),
                  shortDay: format(d, "d"),
                  pct,
                  isToday: i === 0,
                });
              }

              const daysWithData = last7.filter(d => d.pct !== null);
              const weekAvg = daysWithData.length > 0
                ? Math.round(daysWithData.reduce((s, d) => s + (d.pct ?? 0), 0) / daysWithData.length)
                : null;

              return (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-2">
                    {last7.map(day => {
                      const pct = day.pct;
                      const isEmpty = pct === null;
                      const bgClass =
                        isEmpty ? "bg-muted/50" :
                        pct === 100 ? "bg-chart-3/80" :
                        pct >= 50  ? "bg-chart-4/70" :
                        pct > 0    ? "bg-primary/40" :
                        "bg-muted";
                      const barH = isEmpty ? 8 : Math.max(8, Math.round((pct / 100) * 56));
                      return (
                        <div key={day.dateKey} className="flex flex-col items-center gap-1.5 flex-1">
                          <div className="w-full flex items-end justify-center" style={{ height: 60 }}>
                            <div
                              className={`w-full rounded-t-md transition-all ${bgClass} ${day.isToday ? "ring-1 ring-primary/40" : ""}`}
                              style={{ height: barH }}
                              title={isEmpty ? "No data" : `${pct}% complete`}
                            />
                          </div>
                          <span className={`text-[10px] font-medium ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                            {day.label}
                          </span>
                          <span className={`text-[9px] ${day.isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {day.isToday ? "today" : day.shortDay}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-chart-3/80" />
                        <span className="text-xs text-muted-foreground">100%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-chart-4/70" />
                        <span className="text-xs text-muted-foreground">Partial</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-muted/50" />
                        <span className="text-xs text-muted-foreground">No data</span>
                      </div>
                    </div>
                    {weekAvg !== null && (
                      <span className="text-xs text-muted-foreground">
                        Avg: <span className="font-semibold text-foreground">{weekAvg}%</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Streaks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-chart-4" />
              Active Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStreaks.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center mx-auto mb-3">
                  <Flame className="w-5 h-5 text-chart-4" />
                </div>
                <p className="text-sm font-medium mb-1">No streaks yet</p>
                <p className="text-muted-foreground text-xs mb-3 max-w-[180px] mx-auto">
                  Check in for your systems each day to build a streak.
                </p>
                <Link href="/checkins">
                  <Button variant="outline" size="sm" data-testid="button-start-streak">
                    Start today's check-in
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topStreaks.map(([systemId, streak]) => {
                  const sys = systems.find(s => s.id === systemId);
                  const pct = Math.min(100, Math.round(((streak as number) / 30) * 100));
                  return (
                    <div key={systemId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{sys?.title ?? "Unknown system"}</span>
                        <div className="flex items-center gap-1 text-chart-4 font-bold flex-shrink-0">
                          <Flame className="w-3.5 h-3.5" />
                          {streak as number}d
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-chart-4/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested next step */}
        <Card className="bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Suggested next step
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSystems.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Build your first system to start your habit journey.
                </p>
                <Link href="/systems/new">
                  <Button size="sm" className="gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Build first system
                  </Button>
                </Link>
              </div>
            ) : todayCheckins.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You haven't checked in yet today. Start with your first habit — it takes under 10 seconds.
                </p>
                <Link href="/checkins">
                  <Button size="sm" className="gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Check in now
                  </Button>
                </Link>
              </div>
            ) : completionPct === 100 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All done today! Take a moment to reflect on what went well.
                </p>
                <Link href="/journal">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <PenLine className="w-3.5 h-3.5" />
                    Write a reflection
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {todayTotal - todayDone} habit{todayTotal - todayDone !== 1 ? "s" : ""} remaining. Keep the momentum going!
                </p>
                <Link href="/checkins">
                  <Button size="sm" className="gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Continue check-ins
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <div className="flex gap-2">
                <Link href="/checkins">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Check-ins <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Link href="/journal">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Journal <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map((item, i) => {
                if (item.kind === "checkin") {
                  const c = item.data as Checkin;
                  const sys = systems.find(s => s.id === c.systemId);
                  const statusColors = {
                    done: "text-chart-3 bg-chart-3/10",
                    partial: "text-chart-4 bg-chart-4/10",
                    missed: "text-muted-foreground bg-muted",
                  };
                  return (
                    <div key={`checkin-${c.id}`} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs", statusColors[c.status as keyof typeof statusColors] || "bg-muted text-muted-foreground")}>
                        {c.status === "done" ? "✓" : c.status === "partial" ? "~" : "×"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{sys?.title ?? "Unknown system"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{c.status} · {c.dateKey}</p>
                      </div>
                    </div>
                  );
                } else {
                  const j = item.data as JournalEntry;
                  return (
                    <div key={`journal-${j.id}`} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <PenLine className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{j.promptType ? j.promptType.charAt(0).toUpperCase() + j.promptType.slice(1) : "Journal"} entry</p>
                        <p className="text-[10px] text-muted-foreground truncate">{j.content.slice(0, 60)}…</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Zap, label: "New System", href: "/systems/new", color: "text-primary" },
          { icon: Target, label: "New Goal", href: "/goals", color: "text-chart-2" },
          { icon: LayoutGrid, label: "Templates", href: "/templates", color: "text-chart-3" },
          { icon: BookOpen, label: "Reflect", href: "/journal", color: "text-chart-4" },
        ].map(({ icon: Icon, label, href, color }) => (
          <Link key={label} href={href}>
            <Button variant="outline" className="w-full h-10 gap-2 justify-start text-xs">
              <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", color)} />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}

