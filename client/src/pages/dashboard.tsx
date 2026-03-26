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
import { ensureReferralCode, getReferralShareUrl } from "@/services/referral.service";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Zap, CheckSquare, TrendingUp, ArrowRight, Plus, Flame,
  Calendar, BookOpen, Check, Minus, X, BarChart2, PenLine, Sparkles,
  Lightbulb, Star, Loader2, AlertCircle, RefreshCw, Trophy, Heart,
  LayoutGrid, Flag, TrendingDown, Brain, Share2, Copy, ChevronRight,
  Activity, Clock, Award, Gift,
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

/* ─── Greeting Banner ──────────────────────────────────────────────── */
function GreetingBanner({ name, identityStatement, completionPct, todayDone, todayTotal }: {
  name: string; identityStatement?: string | null; completionPct: number; todayDone: number; todayTotal: number;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const allDone = todayTotal > 0 && todayDone === todayTotal;

  return (
    <div className="relative rounded-2xl overflow-hidden gradient-brand text-white">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 opacity-5 bg-white rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="relative p-5 sm:p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(), "EEEE, MMMM d")}
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 leading-tight truncate">
              {greeting}, {name.split(" ")[0]}! {allDone ? "🔥" : "👋"}
            </h1>
            {identityStatement ? (
              <p className="text-white/90 text-xs sm:text-sm font-medium leading-relaxed line-clamp-2">
                You are a person who {identityStatement}.
              </p>
            ) : (
              <p className="text-white/80 text-xs sm:text-sm">
                {todayTotal === 0
                  ? "Ready to build better habits?"
                  : allDone
                  ? "Perfect day! All habits complete."
                  : `${todayTotal - todayDone} habit${todayTotal - todayDone !== 1 ? "s" : ""} left today.`}
              </p>
            )}
            {identityStatement && todayTotal > 0 && (
              <p className="text-white/70 text-xs mt-1">
                {allDone ? "All habits complete today. 🎉" : `${todayTotal - todayDone} of ${todayTotal} remaining`}
              </p>
            )}
          </div>
          {todayTotal > 0 && (
            <div className="flex-shrink-0 text-right">
              <div className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center",
                allDone ? "bg-white/25" : "bg-white/15",
              )}>
                <p className="text-2xl sm:text-3xl font-extrabold leading-none">{completionPct}%</p>
                <p className="text-[10px] text-white/70 mt-0.5">today</p>
              </div>
            </div>
          )}
        </div>

        {todayTotal > 0 && (
          <div className="mt-4 sm:mt-5">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
              <span>{todayDone} of {todayTotal} done</span>
              <span>{completionPct}% complete</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Metric Card ──────────────────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, sub, colorClass, trend }: {
  icon: any; label: string; value: string | number; sub?: string; colorClass: string; trend?: "up" | "down" | null;
}) {
  return (
    <Card className="hover-elevate group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", colorClass)}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          {trend && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 h-5", trend === "up" ? "text-chart-3 border-chart-3/30 bg-chart-3/5" : "text-chart-4 border-chart-4/30 bg-chart-4/5")}>
              {trend === "up" ? <TrendingUp className="w-2.5 h-2.5 mr-0.5 inline" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5 inline" />}
              {trend === "up" ? "Up" : "Down"}
            </Badge>
          )}
        </div>
        <p className="text-2xl sm:text-3xl font-extrabold leading-none mb-1"
           data-testid={`metric-${label.toLowerCase().replace(/ /g, "-")}`}>
          {value}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground leading-tight">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ─── Activity Heatmap (30 days) ───────────────────────────────────── */
function ActivityHeatmap({ allCheckins, activeSystems }: { allCheckins: Checkin[]; activeSystems: System[] }) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateKey = d.toISOString().split("T")[0];
      const dayCheckins = allCheckins.filter(c => c.dateKey === dateKey);
      const doneCount = dayCheckins.filter(c => c.status === "done").length;
      const total = activeSystems.length;
      const pct = total > 0 && dayCheckins.length > 0 ? Math.round((doneCount / total) * 100) : null;
      result.push({ dateKey, label: format(d, "MMM d"), shortDay: format(d, "d"), day: format(d, "EEE"), pct, isToday: i === 0 });
    }
    return result;
  }, [allCheckins, activeSystems]);

  const getColor = (pct: number | null, isToday: boolean) => {
    if (isToday && pct === null) return "bg-primary/20 border border-primary/40";
    if (pct === null) return "bg-muted/60";
    if (pct === 100) return "bg-chart-3 opacity-90";
    if (pct >= 60) return "bg-chart-4/80";
    if (pct > 0) return "bg-primary/50";
    return "bg-muted";
  };

  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}>
        {days.map((day) => (
          <div
            key={day.dateKey}
            title={day.pct !== null ? `${day.label}: ${day.pct}%` : day.isToday ? "Today" : `${day.label}: no data`}
            className={cn(
              "aspect-square rounded-sm transition-all hover:scale-110 cursor-default",
              getColor(day.pct, day.isToday),
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">30 days ago</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-chart-3 opacity-90" /><span className="text-[10px] text-muted-foreground">100%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-chart-4/80" /><span className="text-[10px] text-muted-foreground">Partial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-muted/60" /><span className="text-[10px] text-muted-foreground">None</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">Today</span>
      </div>
    </div>
  );
}

/* ─── 7-Day Bar Chart ──────────────────────────────────────────────── */
function WeeklyChart({ allCheckins, activeSystems }: { allCheckins: Checkin[]; activeSystems: System[] }) {
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayCheckins = allCheckins.filter(c => c.dateKey === dateKey);
      const doneCount = dayCheckins.filter(c => c.status === "done").length;
      const pct = activeSystems.length > 0 && dayCheckins.length > 0
        ? Math.round((doneCount / activeSystems.length) * 100) : null;
      return { dateKey, label: format(d, "EEE"), shortDay: format(d, "d"), pct, isToday: i === 6 };
    });
  }, [allCheckins, activeSystems]);

  const weekAvg = useMemo(() => {
    const withData = last7.filter(d => d.pct !== null);
    return withData.length > 0 ? Math.round(withData.reduce((s, d) => s + (d.pct ?? 0), 0) / withData.length) : null;
  }, [last7]);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-1 sm:gap-2" style={{ height: 80 }}>
        {last7.map((day) => {
          const isEmpty = day.pct === null;
          const bgClass = isEmpty ? "bg-muted/50"
            : day.pct === 100 ? "bg-chart-3/80"
            : (day.pct ?? 0) >= 50 ? "bg-chart-4/70"
            : (day.pct ?? 0) > 0 ? "bg-primary/50"
            : "bg-muted/60";
          const barH = isEmpty ? 6 : Math.max(6, Math.round(((day.pct ?? 0) / 100) * 70));

          return (
            <div key={day.dateKey} className="flex flex-col items-center gap-1.5 flex-1">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: 70 }}>
                {!isEmpty && day.pct !== null && (
                  <span className={cn("text-[9px] font-bold mb-0.5", day.isToday ? "text-primary" : "text-muted-foreground")}>
                    {day.pct}%
                  </span>
                )}
                <div
                  className={cn("w-full rounded-t-lg transition-all duration-500", bgClass, day.isToday && "ring-2 ring-primary/40 ring-offset-1")}
                  style={{ height: barH }}
                  title={isEmpty ? "No data" : `${day.pct}% complete`}
                />
              </div>
              <span className={cn("text-[10px] font-semibold", day.isToday ? "text-primary" : "text-muted-foreground")}>
                {day.label}
              </span>
              <span className={cn("text-[9px]", day.isToday ? "text-primary font-bold" : "text-muted-foreground/70")}>
                {day.isToday ? "today" : day.shortDay}
              </span>
            </div>
          );
        })}
      </div>
      {weekAvg !== null && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-3">
            {[
              { color: "bg-chart-3/80", label: "100%" },
              { color: "bg-chart-4/70", label: "≥50%" },
              { color: "bg-primary/50", label: "<50%" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-sm", color)} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            Avg: <span className="font-bold text-foreground">{weekAvg}%</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Quick Check-in Row ───────────────────────────────────────────── */
function QuickCheckinRow({ system, existingCheckin, userId, today }: {
  system: System; existingCheckin?: Checkin; userId: string; today: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const current = existingCheckin?.status as "done" | "partial" | "missed" | undefined;

  const mutation = useMutation({
    mutationFn: (status: string) => upsertCheckin(userId, system.id, today, { status }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["checkins", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      const identityLine = system.identityStatement
        ? `${system.identityStatement.charAt(0).toUpperCase() + system.identityStatement.slice(1)}. You just proved it.`
        : "You showed up. You just proved it.";
      const msgs: Record<string, string> = {
        done: identityLine,
        partial: "Partial is not failure. You kept the system alive.",
        missed: "It's paused, not broken. See you tomorrow.",
      };
      toast({ title: status === "done" ? "Done! 🔥" : status === "partial" ? "Partial saved" : "Noted", description: msgs[status] ?? "Saved!" });
    },
    onError: () => toast({ title: "Couldn't save", variant: "destructive" }),
  });

  const buttons = [
    { status: "done", label: "Done", Icon: Check, active: "bg-chart-3 text-white border-chart-3 shadow-sm", idle: "hover:border-chart-3/60 hover:text-chart-3 hover:bg-chart-3/5" },
    { status: "partial", label: "Partial", Icon: Minus, active: "bg-chart-4 text-white border-chart-4 shadow-sm", idle: "hover:border-chart-4/60 hover:text-chart-4 hover:bg-chart-4/5" },
    { status: "missed", label: "Missed", Icon: X, active: "bg-muted-foreground/60 text-white border-muted-foreground/60", idle: "hover:border-muted-foreground/40 hover:text-muted-foreground" },
  ] as const;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
        current === "done" ? "bg-chart-3/5 border-chart-3/25" : "bg-card border-border hover:border-primary/30 hover:bg-primary/2",
      )}
      data-testid={`quick-checkin-${system.id}`}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
        current === "done" ? "bg-chart-3/20" : "bg-primary/10",
      )}>
        {current === "done"
          ? <Check className="w-4 h-4 text-chart-3" />
          : <Zap className="w-4 h-4 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold block truncate">{system.title}</span>
        {system.minimumAction && (
          <span className="text-[11px] text-muted-foreground/80 truncate block leading-tight mt-0.5">
            Min: {system.minimumAction}
          </span>
        )}
        {system.identityStatement && current !== "done" && !system.minimumAction && (
          <span className="text-[11px] text-muted-foreground/70 truncate block leading-tight mt-0.5">
            I am someone who {system.identityStatement}
          </span>
        )}
      </div>
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
                "w-8 h-8 rounded-lg border text-xs flex items-center justify-center transition-all active:scale-95",
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

/* ─── Active Streak Card ───────────────────────────────────────────── */
function StreakCard({ streaks, systems }: { streaks: Record<string, number>; systems: System[] }) {
  const topStreaks = Object.entries(streaks)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topStreaks.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-2xl bg-chart-4/10 flex items-center justify-center mx-auto mb-3">
          <Flame className="w-6 h-6 text-chart-4" />
        </div>
        <p className="text-sm font-semibold mb-1">No streaks yet</p>
        <p className="text-xs text-muted-foreground mb-3 max-w-[160px] mx-auto leading-relaxed">
          Check in daily to build your first streak.
        </p>
        <Link href="/checkins">
          <Button variant="outline" size="sm" className="text-xs" data-testid="button-start-streak">
            Start today
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topStreaks.map(([systemId, streak]) => {
        const sys = systems.find(s => s.id === systemId);
        const pct = Math.min(100, Math.round((streak / 30) * 100));
        const milestoneNext = [7, 14, 21, 30, 50, 66, 100].find(m => m > streak) ?? 100;
        return (
          <div key={systemId} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{sys?.title ?? "Unknown"}</p>
                <p className="text-[10px] text-muted-foreground">{milestoneNext - streak} days to {milestoneNext}-day milestone</p>
              </div>
              <div className="flex items-center gap-1 text-chart-4 font-extrabold flex-shrink-0">
                <Flame className="w-4 h-4" />
                <span className="text-lg">{streak}</span>
                <span className="text-xs text-muted-foreground font-normal">d</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-chart-4/60 to-chart-4 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Next Milestone ───────────────────────────────────────────────── */
function NextMilestone({ goals, analytics }: {
  goals: Goal[];
  analytics: ReturnType<typeof computeAnalytics>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = goals
    .filter(g => g.status === "active" && g.deadline && g.deadline >= today)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))[0];

  const bestCurrentStreak = Math.max(0, ...Object.values(analytics.streaks));
  const STREAK_MILESTONES = [7, 14, 21, 30, 50, 66, 100];
  const nextStreakTarget = STREAK_MILESTONES.find(m => m > bestCurrentStreak) ?? 100;
  const streakDaysLeft = nextStreakTarget - bestCurrentStreak;

  if (upcoming) {
    const daysLeft = Math.ceil((new Date(upcoming.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 7 ? "text-chart-4" : "text-primary";
    return (
      <div className="flex items-start gap-3" data-testid="widget-next-milestone">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Flag className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Milestone</p>
          <p className="font-semibold text-sm truncate">{upcoming.title}</p>
          <p className={cn("text-xs mt-0.5 font-bold", urgency)}>
            {daysLeft === 0 ? "Due today!" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days left`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(parseISO(upcoming.deadline!), "MMM d, yyyy")}
          </p>
        </div>
      </div>
    );
  }

  if (bestCurrentStreak > 0) {
    return (
      <div className="flex items-start gap-3" data-testid="widget-next-milestone">
        <div className="w-9 h-9 rounded-xl bg-chart-4/10 flex items-center justify-center flex-shrink-0">
          <Flame className="w-4 h-4 text-chart-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Milestone</p>
          <p className="font-semibold text-sm">{nextStreakTarget}-day streak</p>
          <p className="text-xs text-chart-4 mt-0.5 font-bold">{streakDaysLeft} day{streakDaysLeft !== 1 ? "s" : ""} to go</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-chart-4/70 transition-all" style={{ width: `${Math.round((bestCurrentStreak / nextStreakTarget) * 100)}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3" data-testid="widget-next-milestone">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <Flag className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Milestone</p>
        <p className="font-semibold text-sm">No milestone yet</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Set a goal deadline or build a streak.</p>
      </div>
    </div>
  );
}

/* ─── One Insight ──────────────────────────────────────────────────── */
function OneInsight({ analytics, activeSystems, completionPct }: {
  analytics: ReturnType<typeof computeAnalytics>;
  activeSystems: System[];
  completionPct: number;
}) {
  const insight = (() => {
    const bestDow = analytics.dayOfWeekStats.filter(d => d.totalCount >= 3).sort((a, b) => b.doneRate - a.doneRate)[0];
    const worstDow = analytics.dayOfWeekStats.filter(d => d.totalCount >= 3).sort((a, b) => a.doneRate - b.doneRate)[0];
    const recent7 = analytics.last30Days.slice(-7);
    const prev7 = analytics.last30Days.slice(-14, -7);
    const recentAvg = recent7.reduce((s, d) => s + (d.total > 0 ? (d.done / d.total) * 100 : 0), 0) / 7;
    const prevAvg = prev7.reduce((s, d) => s + (d.total > 0 ? (d.done / d.total) * 100 : 0), 0) / 7;
    const trendDiff = Math.round(recentAvg - prevAvg);

    if (bestDow && bestDow.doneRate > 60 && worstDow && bestDow.shortDay !== worstDow.shortDay) {
      return { icon: TrendingUp, color: "text-chart-3", bg: "bg-chart-3/10", title: `${bestDow.day}s are your best`, body: `${bestDow.doneRate}% completion rate on ${bestDow.day}s.` };
    }
    if (activeSystems.length > 0 && trendDiff >= 10) {
      return { icon: TrendingUp, color: "text-chart-3", bg: "bg-chart-3/10", title: "You're trending up", body: `${trendDiff}% better than last week.` };
    }
    if (activeSystems.length > 0 && trendDiff <= -10) {
      return { icon: TrendingDown, color: "text-chart-4", bg: "bg-chart-4/10", title: "Small dip this week", body: "Review your fallback plans and start fresh." };
    }
    if (analytics.hasMoodData) {
      const highMoodBucket = analytics.moodBuckets.filter(b => b.count >= 2 && b.mood >= 4);
      if (highMoodBucket.length > 0) {
        const avg = Math.round(highMoodBucket.reduce((s, b) => s + b.completionPct, 0) / highMoodBucket.length);
        return { icon: Heart, color: "text-primary", bg: "bg-primary/10", title: "Mood boosts habits", body: `${avg}% completion on good mood days.` };
      }
    }
    if (activeSystems.length === 0) {
      return { icon: Sparkles, color: "text-primary", bg: "bg-primary/10", title: "Insights incoming", body: "Build a system and check in to see patterns." };
    }
    return { icon: Lightbulb, color: "text-primary", bg: "bg-primary/10", title: "Keep checking in", body: `${activeSystems.length} active system${activeSystems.length !== 1 ? "s" : ""}. More data = better insights.` };
  })();

  const Icon = insight.icon;
  return (
    <div className="flex items-start gap-3" data-testid="widget-one-insight">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", insight.bg)}>
        <Icon className={cn("w-4 h-4", insight.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Insight</p>
        <p className="font-semibold text-sm">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</p>
      </div>
    </div>
  );
}

/* ─── Hype Drop Warning ────────────────────────────────────────────── */
function HypeDropWarning({ bestStreak, hadStreakBreak, fallbackPlan, minimumAction, dismissedKey }: {
  bestStreak: number; hadStreakBreak: boolean; fallbackPlan?: string | null; minimumAction?: string | null; dismissedKey: string;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissedKey) === "true"; } catch { return false; }
  });
  if (dismissed) return null;
  const dismiss = () => { try { localStorage.setItem(dismissedKey, "true"); } catch {} setDismissed(true); };

  if (hadStreakBreak) return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-2/8 border border-chart-2/20" data-testid="hype-drop-streak-break">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
      <RefreshCw className="w-4 h-4 text-chart-2 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">Streaks break. Systems don't. 🔁</p>
        <p className="text-xs text-muted-foreground leading-relaxed">Missing one day never derailed anyone. Missing two starts a pattern.</p>
        {(minimumAction || fallbackPlan) && (
          <div className="mt-2 space-y-1">
            {minimumAction && <p className="text-xs font-medium">💪 Min action: <span className="text-muted-foreground">{minimumAction}</span></p>}
            {fallbackPlan && <p className="text-xs font-medium">📋 Recovery: <span className="text-muted-foreground">{fallbackPlan}</span></p>}
          </div>
        )}
      </div>
    </div>
  );

  if (bestStreak >= 1 && bestStreak <= 7) return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20" data-testid="hype-drop-early">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
      <Flame className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">Building momentum! 🚀 Day {bestStreak}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">The first week is the hardest. Your system is doing the work, not your motivation.</p>
      </div>
    </div>
  );

  if (bestStreak >= 8 && bestStreak <= 21) return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/25" data-testid="hype-drop-warning">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
      <AlertCircle className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">⚠️ Hype Drop Zone (Day {bestStreak})</p>
        <p className="text-xs text-muted-foreground leading-relaxed">Motivation naturally dips around now. Your system carries you — just show up.</p>
      </div>
    </div>
  );

  if (bestStreak >= 22 && bestStreak <= 65) return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="hype-drop-zone">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
      <Brain className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">Habit-building zone — Day {bestStreak}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">Science says 66 days builds automaticity. Your brain is rewiring. Stay consistent.</p>
      </div>
    </div>
  );

  return null;
}

/* ─── Retention Banner ─────────────────────────────────────────────── */
function RetentionBanner({ allCheckins, activeSystems, systemsWithMinAction }: {
  allCheckins: Checkin[]; activeSystems: System[]; systemsWithMinAction: System[];
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("strivo_retention_dismissed_" + getTodayKey()) === "true"; } catch { return false; }
  });
  if (dismissed || activeSystems.length === 0) return null;
  const sortedDates = Array.from(new Set(allCheckins.map(c => c.dateKey))).sort();
  if (sortedDates.length === 0) return null;
  const firstDate = new Date(sortedDates[0] + "T00:00:00");
  const today = new Date(getTodayKey() + "T00:00:00");
  const daysSince = Math.round((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const dismiss = () => { try { localStorage.setItem("strivo_retention_dismissed_" + getTodayKey(), "true"); } catch {} setDismissed(true); };
  const firstMinAction = systemsWithMinAction[0]?.minimumAction;

  if (daysSince === 1) return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20" data-testid="retention-banner-day2">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
      <Sparkles className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">Day 2 — this is how systems work.</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">You didn't need motivation yesterday. You needed a low bar. That's the whole idea.</p>
        {firstMinAction && <p className="text-xs font-medium">Even this counts: <span className="text-chart-3">"{firstMinAction}"</span></p>}
      </div>
    </div>
  );

  if (daysSince === 2) return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/20" data-testid="retention-banner-day3">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
      <AlertCircle className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">Day 3 is where most people quit.</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">Don't go bigger — go smaller. The system that survives day 3 sticks.</p>
        <Link href="/checkins"><Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" data-testid="button-day3-checkin"><CheckSquare className="w-3 h-3" />Do today's minimum</Button></Link>
      </div>
    </div>
  );

  if (daysSince === 6) {
    const uniqueDaysChecked = new Set(allCheckins.filter(c => c.status !== "missed").map(c => c.dateKey)).size;
    return (
      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="retention-banner-day7">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none" aria-label="Dismiss">×</button>
        <Trophy className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-5">
          <p className="text-sm font-semibold mb-1">One week. That's not nothing.</p>
          <div className="flex gap-4 mt-1.5">
            <div><p className="text-lg font-extrabold text-primary">{uniqueDaysChecked}<span className="text-xs text-muted-foreground font-normal">/7</span></p><p className="text-[10px] text-muted-foreground">days active</p></div>
            <div><p className="text-lg font-extrabold text-chart-3">{Math.round((uniqueDaysChecked / Math.min(7, sortedDates.length)) * 100)}%</p><p className="text-[10px] text-muted-foreground">survival rate</p></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Recovery Banner ──────────────────────────────────────────────── */
function RecoveryBanner({ missedSystems }: { missedSystems: System[] }) {
  if (missedSystems.length === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/20">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <RefreshCw className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-chart-4 mb-0.5">Missed yesterday? Let's reset.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {missedSystems.length === 1
              ? `"${missedSystems[0].title}" — use the fallback plan.`
              : `${missedSystems.length} systems missed. Start fresh today.`}
          </p>
        </div>
      </div>
      <Link href="/checkins" className="sm:flex-shrink-0">
        <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs h-7">Check in now</Button>
      </Link>
    </div>
  );
}

/* ─── Tomorrow Intention Card ──────────────────────────────────────── */
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
        <p className="text-xs text-muted-foreground mb-1">For <span className="font-medium text-foreground">{systemName}</span>:</p>
        <p className="text-sm text-foreground font-medium leading-snug">"{checkin.tomorrowIntention}"</p>
      </div>
      <button onClick={() => { try { localStorage.setItem(`tomorrow-intention-dismissed-${checkin.id}`, "true"); } catch {} setDismissed(true); }} className="flex-shrink-0 text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss" data-testid="button-dismiss-intention">×</button>
    </div>
  );
}

/* ─── Onboarding Checklist ─────────────────────────────────────────── */
function OnboardingChecklist({ hasGoals, hasSystems, hasCheckins }: {
  hasGoals: boolean; hasSystems: boolean; hasCheckins: boolean;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("strivo_onboarding_checklist_dismissed") === "true"; } catch { return false; }
  });
  if (dismissed || (hasGoals && hasSystems && hasCheckins)) return null;

  const steps = [
    { done: hasGoals, label: "Create your first goal", href: "/goals", icon: Target, testId: "onboarding-step-goals" },
    { done: hasSystems, label: "Build a habit system", href: "/systems/new", icon: Zap, testId: "onboarding-step-systems" },
    { done: hasCheckins, label: "Complete your first check-in", href: "/checkins", icon: CheckSquare, testId: "onboarding-step-checkins" },
  ];
  const doneCount = steps.filter(s => s.done).length;

  return (
    <Card className="border-primary/20 bg-primary/3" data-testid="onboarding-checklist">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Get started</p>
              <p className="text-xs text-muted-foreground">{doneCount} of {steps.length} complete</p>
            </div>
          </div>
          <button onClick={() => { localStorage.setItem("strivo_onboarding_checklist_dismissed", "true"); setDismissed(true); }} className="text-muted-foreground hover:text-foreground text-sm" aria-label="Dismiss" data-testid="button-dismiss-checklist">✕</button>
        </div>
        <Progress value={(doneCount / steps.length) * 100} className="h-1.5 mb-3" />
        <div className="space-y-1.5">
          {steps.map(({ done, label, href, icon: Icon, testId }) => (
            <Link key={label} href={href}>
              <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all", done ? "bg-chart-3/5 border-chart-3/20 opacity-70" : "bg-background border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer")} data-testid={testId}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", done ? "bg-chart-3 text-white" : "bg-muted text-muted-foreground")}>
                  {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                </div>
                <span className={cn("text-sm flex-1", done && "line-through text-muted-foreground")}>{label}</span>
                {!done && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Share Streak Card ────────────────────────────────────────────── */
function ShareStreakCard({ streak, systemTitle, userName }: { streak: number; systemTitle: string; userName: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  if (streak < 3) return null;
  const shareText = `🔥 ${streak}-day streak on "${systemTitle}"!\n\nBuilding habits that survive real life with Strivo — free at strivo.life`;
  const copyToClipboard = async () => {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); toast({ title: "Copied!" }); }
    catch { toast({ title: "Couldn't copy", variant: "destructive" }); }
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-chart-4/8 border border-chart-4/25" data-testid="share-streak-card">
      <Trophy className="w-5 h-5 text-chart-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{streak}-day streak 🔥 — share it!</p>
        <p className="text-xs text-muted-foreground truncate">"{systemTitle}"</p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copyToClipboard} data-testid="button-share-streak-copy">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? "Copied" : "Copy"}
        </Button>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" data-testid="button-share-streak-twitter"><Share2 className="w-3 h-3" />Share</Button>
        </a>
      </div>
    </div>
  );
}

/* ─── Empty State ──────────────────────────────────────────────────── */
function EmptyStateCard({ icon: Icon, title, description, primaryAction, secondaryAction }: {
  icon: any; title: string; description: string;
  primaryAction: { label: string; href: string; testId: string };
  secondaryAction?: { label: string; href: string; testId: string };
}) {
  return (
    <Card className="border-primary/20 bg-primary/3">
      <CardContent className="p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={primaryAction.href}><Button className="w-full sm:w-auto" data-testid={primaryAction.testId}>{primaryAction.label}</Button></Link>
          {secondaryAction && <Link href={secondaryAction.href}><Button variant="outline" className="w-full sm:w-auto" data-testid={secondaryAction.testId}>{secondaryAction.label}</Button></Link>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Referral Banner ──────────────────────────────────────────────── */
function ReferralBanner({ user }: { user: import("@/types/schema").User | null }) {
  const [code, setCode] = useState<string | null>(user?.referralCode ?? null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("strivo_referral_dismissed") === "true"; } catch { return false; }
  });
  const { toast } = useToast();

  const freezes = user?.streakFreezes ?? 0;
  const referralCount = user?.referralCount ?? 0;

  const loadCode = async () => {
    if (!user || code) return;
    try {
      const c = await ensureReferralCode(user);
      setCode(c);
    } catch {}
  };

  const copyLink = async () => {
    if (!code) { await loadCode(); return; }
    const url = getReferralShareUrl(code);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (dismissed) return null;

  return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/20" data-testid="referral-banner">
      <button
        onClick={() => { localStorage.setItem("strivo_referral_dismissed", "true"); setDismissed(true); }}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none"
        aria-label="Dismiss"
      >×</button>
      <Gift className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2">
          Invite a friend, earn streak freezes
          {freezes > 0 && <Badge variant="outline" className="text-chart-4 border-chart-4/30 text-[10px] gap-1"><Flame className="w-2.5 h-2.5" />{freezes} freeze{freezes !== 1 ? "s" : ""}</Badge>}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
          Each friend who joins with your link gives you both a streak freeze.{referralCount > 0 && ` You've referred ${referralCount} friend${referralCount !== 1 ? "s" : ""} so far.`}
        </p>
        <Button
          size="sm" variant="outline"
          className="gap-1.5 h-7 text-xs"
          onClick={copyLink}
          onMouseEnter={loadCode}
          data-testid="button-copy-referral"
        >
          {copied ? <><Check className="w-3 h-3 text-chart-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy invite link</>}
        </Button>
        {code && <p className="text-[10px] text-muted-foreground mt-1 font-mono">Code: {code}</p>}
      </div>
    </div>
  );
}

/* ─── Smart Reminder Hint ──────────────────────────────────────────── */
function SmartReminderHint({ allCheckins, user }: { allCheckins: Checkin[]; user: import("@/types/schema").User | null }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("strivo_reminder_hint_dismissed") === "true"; } catch { return false; }
  });
  if (dismissed || !user || user.reminderEnabled) return null;
  if (allCheckins.length < 5) return null;

  const hourCounts: Record<number, number> = {};
  allCheckins.forEach(c => {
    if (!c.createdAt) return;
    const h = new Date(c.createdAt).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  });
  const bestHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (!bestHour) return null;
  const hour = Number(bestHour[0]);
  const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;

  return (
    <div className="relative flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15" data-testid="smart-reminder-hint">
      <button
        onClick={() => { localStorage.setItem("strivo_reminder_hint_dismissed", "true"); setDismissed(true); }}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg leading-none"
        aria-label="Dismiss"
      >×</button>
      <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 pr-5">
        <p className="text-sm font-semibold mb-1">Your peak time is around {label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">That's when you've been most consistent. Set a reminder for then and automate showing up.</p>
        <Link href="/settings">
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" data-testid="button-set-reminder">
            <Clock className="w-3 h-3" /> Set a reminder
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ─────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-5 lg:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-5" aria-busy="true">
      <span className="sr-only" role="status">Loading your dashboard…</span>
      <Skeleton className="h-36 sm:h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard Component ─────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const today = getTodayKey();
  const yesterday = subDays(new Date(), 1).toISOString().split("T")[0];
  const tip = getTipOfTheDay();

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["goals", userId], queryFn: () => getGoals(userId), enabled: !!userId,
  });
  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId], queryFn: () => getSystems(userId), enabled: !!userId,
  });
  const { data: todayCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId, today], queryFn: () => getCheckinsByDate(userId, today), enabled: !!userId,
  });
  const { data: allCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId], queryFn: () => getCheckins(userId), enabled: !!userId,
  });
  const { data: journals = [] } = useQuery<JournalEntry[]>({
    queryKey: ["journal", userId], queryFn: () => getJournals(userId), enabled: !!userId,
  });

  const analytics = useMemo(() => computeAnalytics(allCheckins, systems, goals), [allCheckins, systems, goals]);

  const activeGoals = goals.filter(g => g.status === "active");
  const activeSystems = systems.filter(s => s.active !== false);
  const todayDone = todayCheckins.filter(c => c.status === "done").length;
  const todayTotal = activeSystems.length;
  const completionPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const topStreaks = Object.entries(analytics.streaks)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const bestStreak = topStreaks[0]?.[1] ?? 0;

  const yesterdayCheckins = allCheckins.filter(c => c.dateKey === yesterday);
  const missedYesterday = activeSystems.filter(s => yesterdayCheckins.find(c => c.systemId === s.id)?.status === "missed");
  const hadStreakBreak = missedYesterday.length > 0;
  const tomorrowIntentionCheckin = yesterdayCheckins.find(c => c.tomorrowIntention?.trim());
  const systemsWithMinAction = activeSystems.filter(s => s.minimumAction);
  const topSystemForHype = activeSystems[0];

  const recentActivity = useMemo(() => {
    type AI = { kind: "checkin"; data: Checkin; sortKey: string } | { kind: "journal"; data: JournalEntry; sortKey: string };
    const checkinItems: AI[] = [...allCheckins].sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 10).map(c => ({ kind: "checkin" as const, data: c, sortKey: c.dateKey }));
    const journalItems: AI[] = [...journals].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 10).map(j => ({ kind: "journal" as const, data: j, sortKey: (j.createdAt ?? "").split("T")[0] }));
    return [...checkinItems, ...journalItems].sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 6);
  }, [allCheckins, journals]);

  const isLoading = goalsLoading || systemsLoading;
  const isNewUser = !isLoading && activeGoals.length === 0 && activeSystems.length === 0;

  const last7Days = useMemo(() => {
    return analytics.last30Days.slice(-7);
  }, [analytics]);
  const weekDone = last7Days.filter(d => d.done > 0).length;
  const weekTrend = (() => {
    const recent = analytics.last30Days.slice(-7).reduce((s, d) => s + (d.total > 0 ? (d.done / d.total) : 0), 0) / 7;
    const prev = analytics.last30Days.slice(-14, -7).reduce((s, d) => s + (d.total > 0 ? (d.done / d.total) : 0), 0) / 7;
    const diff = Math.round((recent - prev) * 100);
    return diff >= 10 ? "up" : diff <= -10 ? "down" : null;
  })() as "up" | "down" | null;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 sm:p-5 lg:p-6 max-w-6xl mx-auto" aria-label="Dashboard">

      {/* ── Greeting Banner ── */}
      <GreetingBanner
        name={user?.name ?? "there"}
        identityStatement={user?.identityStatement}
        completionPct={completionPct}
        todayDone={todayDone}
        todayTotal={todayTotal}
      />

      {/* ── Metric Cards (2x2 mobile, 4 col desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 sm:mt-5">
        <MetricCard
          icon={Target} label="Active Goals" value={activeGoals.length}
          sub={activeGoals.length === 0 ? "Create your first" : `${activeGoals.length} in progress`}
          colorClass="bg-primary/10 text-primary" trend={null}
        />
        <MetricCard
          icon={Zap} label="Systems" value={activeSystems.length}
          sub={activeSystems.length === 0 ? "Build your first" : "running daily"}
          colorClass="bg-chart-2/10 text-chart-2" trend={null}
        />
        <MetricCard
          icon={CheckSquare} label="Today" value={todayTotal === 0 ? "—" : `${todayDone}/${todayTotal}`}
          sub={todayTotal === 0 ? "No systems yet" : `${completionPct}% complete`}
          colorClass="bg-chart-3/10 text-chart-3" trend={null}
        />
        <MetricCard
          icon={Flame} label="Best Streak" value={bestStreak > 0 ? `${bestStreak}d` : "—"}
          sub={bestStreak > 0 ? "consecutive days" : "Start checking in"}
          colorClass="bg-chart-4/10 text-chart-4" trend={weekTrend}
        />
      </div>

      {/* ── Banners row ── */}
      <div className="mt-4 sm:mt-5 space-y-3">
        {hasFutureSelfAudio(user?.id ?? "", user?.futureAudioUrl) && (
          missedYesterday.length > 0
            ? <FutureSelfAudioPlayer context="missedDay" firestoreUrl={user?.futureAudioUrl} userName={user?.name} playOnFirstVisit={user?.futureAudioPlayOnFirstVisit ?? true} playAfterMissed={user?.futureAudioPlayAfterMissed ?? true} autoplay={user?.futureAudioAutoplay ?? true} muted={user?.futureAudioMuted ?? false} />
            : <FutureSelfAudioPlayer context="firstVisit" firestoreUrl={user?.futureAudioUrl} userName={user?.name} playOnFirstVisit={user?.futureAudioPlayOnFirstVisit ?? true} playAfterMissed={user?.futureAudioPlayAfterMissed ?? true} autoplay={user?.futureAudioAutoplay ?? true} muted={user?.futureAudioMuted ?? false} />
        )}
        <OnboardingChecklist hasGoals={goals.length > 0} hasSystems={systems.length > 0} hasCheckins={allCheckins.length > 0} />
        {tomorrowIntentionCheckin && (() => { const sys = systems.find(s => s.id === tomorrowIntentionCheckin.systemId); return sys ? <TomorrowIntentionCard checkin={tomorrowIntentionCheckin} systemName={sys.title} /> : null; })()}
        <RecoveryBanner missedSystems={missedYesterday} />
        <RetentionBanner allCheckins={allCheckins} activeSystems={activeSystems} systemsWithMinAction={systemsWithMinAction} />
        <HypeDropWarning
          bestStreak={bestStreak}
          hadStreakBreak={hadStreakBreak}
          fallbackPlan={topSystemForHype?.fallbackPlan}
          minimumAction={topSystemForHype?.minimumAction}
          dismissedKey={`strivo_hype_drop_dismissed_${getTodayKey()}`}
        />
        {topStreaks.length > 0 && (() => {
          const [topSystemId, topStreak] = topStreaks[0];
          const topSystem = systems.find(s => s.id === topSystemId);
          return topSystem ? <ShareStreakCard streak={topStreak as number} systemTitle={topSystem.title} userName={user?.name ?? ""} /> : null;
        })()}
        <ReferralBanner user={user} />
        <SmartReminderHint allCheckins={allCheckins} user={user} />
      </div>

      {/* ── Main 2-column grid (lg+) ── */}
      <div className="mt-4 sm:mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* ── Left: main content (2/3) ── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">

          {/* Empty state for new users */}
          {isNewUser && (
            <EmptyStateCard
              icon={Sparkles}
              title="Your journey starts here"
              description="You haven't created your first system yet. Start with one small habit — something you could do even on your worst day."
              primaryAction={{ label: "Build my first system", href: "/systems/new", testId: "button-create-first-system" }}
              secondaryAction={{ label: "Create a goal first", href: "/goals", testId: "button-create-first-goal" }}
            />
          )}

          {/* No systems but has goals */}
          {!isNewUser && activeSystems.length === 0 && activeGoals.length > 0 && (
            <Card className="border-primary/20 bg-primary/3">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-base mb-2">You have goals — now build a system</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">A goal without a system is just a wish. Build a daily habit in 5 minutes.</p>
                <Link href="/systems/new"><Button size="sm" className="gap-1.5" data-testid="button-build-first-system"><Zap className="w-3.5 h-3.5" />Build my first system</Button></Link>
              </CardContent>
            </Card>
          )}

          {/* Today's Check-ins */}
          {activeSystems.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      Today's Check-ins
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Tap Done, Partial, or Missed for each habit</p>
                  </div>
                  <Link href="/checkins">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="link-today-checkins">
                      Full view <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {completionPct === 100 && todayTotal > 0 && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl gradient-brand text-white mb-4">
                    <Trophy className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Perfect day! All done. 🔥</p>
                      <p className="text-xs text-white/80">Incredible work. See you tomorrow!</p>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{todayDone} of {todayTotal} done</span>
                    <span className="font-bold">{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-2" />
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium text-right mb-2 px-0.5">
                  Done · Partial · Missed
                </div>
                <div className="space-y-2">
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
                      <p className="text-xs text-muted-foreground text-center py-2 hover:text-primary transition-colors cursor-pointer">
                        +{activeSystems.length - 6} more — view all
                      </p>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 7-Day Chart + 30-Day Heatmap */}
          {activeSystems.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Activity
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Your check-in consistency</p>
                  </div>
                  <Link href="/analytics">
                    <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-weekly-analytics">
                      Full insights <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">This Week</p>
                  <WeeklyChart allCheckins={allCheckins} activeSystems={activeSystems} />
                </div>
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Last 30 Days</p>
                  <ActivityHeatmap allCheckins={allCheckins} activeSystems={activeSystems} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <div className="flex gap-1">
                    <Link href="/checkins"><Button variant="ghost" size="sm" className="text-xs h-7">Check-ins <ArrowRight className="w-3 h-3 ml-0.5" /></Button></Link>
                    <Link href="/journal"><Button variant="ghost" size="sm" className="text-xs h-7">Journal <ArrowRight className="w-3 h-3 ml-0.5" /></Button></Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-1">
                  {recentActivity.map((item) => {
                    if (item.kind === "checkin") {
                      const c = item.data as Checkin;
                      const sys = systems.find(s => s.id === c.systemId);
                      const statusConf = {
                        done: { cls: "text-chart-3 bg-chart-3/10", icon: "✓" },
                        partial: { cls: "text-chart-4 bg-chart-4/10", icon: "~" },
                        missed: { cls: "text-muted-foreground bg-muted", icon: "×" },
                      };
                      const conf = statusConf[c.status as keyof typeof statusConf] || statusConf.missed;
                      return (
                        <div key={`checkin-${c.id}`} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold", conf.cls)}>{conf.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{sys?.title ?? "Unknown system"}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{c.status} · {c.dateKey}</p>
                          </div>
                          {c.note && <p className="text-[10px] text-muted-foreground truncate max-w-[80px] hidden sm:block italic">"{c.note}"</p>}
                        </div>
                      );
                    } else {
                      const j = item.data as JournalEntry;
                      return (
                        <div key={`journal-${j.id}`} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <PenLine className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{j.promptType ? j.promptType.charAt(0).toUpperCase() + j.promptType.slice(1) : "Journal"} entry</p>
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
        </div>

        {/* ── Right: sidebar widgets (1/3) ── */}
        <div className="space-y-4 sm:space-y-5">

          {/* Active Streaks */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-chart-4" />
                Active Streaks
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <StreakCard streaks={analytics.streaks} systems={systems} />
            </CardContent>
          </Card>

          {/* Next Milestone + Insight */}
          {!isNewUser && (
            <Card>
              <CardContent className="p-5 space-y-4 divide-y divide-border/40">
                <NextMilestone goals={goals} analytics={analytics} />
                <div className="pt-4">
                  <OneInsight analytics={analytics} activeSystems={activeSystems} completionPct={completionPct} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested Next Step */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Next Step
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {activeSystems.length === 0 ? (
                <div className="space-y-2.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">Build your first system to start.</p>
                  <Link href="/systems/new"><Button size="sm" className="gap-1.5 w-full"><Zap className="w-3.5 h-3.5" />Build system</Button></Link>
                </div>
              ) : todayCheckins.length === 0 ? (
                <div className="space-y-2.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">You haven't checked in yet today. Takes under 10 seconds.</p>
                  <Link href="/checkins"><Button size="sm" className="gap-1.5 w-full"><CheckSquare className="w-3.5 h-3.5" />Check in now</Button></Link>
                </div>
              ) : completionPct === 100 ? (
                <div className="space-y-2.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">All done! Reflect on what went well.</p>
                  <Link href="/journal"><Button size="sm" variant="outline" className="gap-1.5 w-full"><PenLine className="w-3.5 h-3.5" />Write reflection</Button></Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{todayTotal - todayDone} habit{todayTotal - todayDone !== 1 ? "s" : ""} remaining. Keep going!</p>
                  <Link href="/checkins"><Button size="sm" className="gap-1.5 w-full"><CheckSquare className="w-3.5 h-3.5" />Continue</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tip of the Day */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wide">Tip of the day</p>
              <p className="text-sm text-foreground leading-relaxed">{tip}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-0.5">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Plus, label: "New System", href: "/systems/new", colorClass: "text-primary" },
                { icon: Target, label: "New Goal", href: "/goals", colorClass: "text-chart-2" },
                { icon: LayoutGrid, label: "Templates", href: "/templates", colorClass: "text-chart-3" },
                { icon: BookOpen, label: "Journal", href: "/journal", colorClass: "text-chart-4" },
                { icon: BarChart2, label: "Analytics", href: "/analytics", colorClass: "text-primary" },
                { icon: Calendar, label: "Check-ins", href: "/checkins", colorClass: "text-chart-2" },
              ].map(({ icon: Icon, label, href, colorClass }) => (
                <Link key={label} href={href}>
                  <Button variant="outline" className="w-full h-10 gap-2 justify-start text-xs hover:border-primary/40 hover:bg-primary/5">
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", colorClass)} />
                    <span className="truncate">{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
