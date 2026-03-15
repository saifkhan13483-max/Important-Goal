import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import type { System, Goal, Checkin } from "@/types/schema";
import { getSystems } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { getCheckins } from "@/services/checkins.service";
import { computeAnalytics } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import {
  Flame, Target, Zap, TrendingUp, BarChart2, Calendar,
  Trophy, AlertCircle, Star, CheckSquare, Lightbulb,
  TrendingDown, Heart, Award, Smile, Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

function MetricCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p
              className="text-2xl font-bold"
              data-testid={`metric-${label.toLowerCase().replace(/ /g, "-")}`}
            >
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-md p-3 text-sm shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value}{p.name === "Completion %" || p.name === "Done %" ? "%" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type Period = "daily" | "weekly" | "monthly";

export default function Analytics() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const [period, setPeriod] = useState<Period>("daily");

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const { data: checkins = [], isLoading: checkinsLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const isLoading = systemsLoading || goalsLoading || checkinsLoading;

  const analytics = useMemo(
    () => computeAnalytics(checkins, systems, goals),
    [checkins, systems, goals],
  );

  const {
    streaks, bestStreaks, topBestStreak,
    dailyChart, weeklyChart, monthlyChart,
    categoryBreakdown, systemStats, goalCompletion,
    last30Days, dayOfWeekStats, moodBuckets, difficultyBuckets,
    hasMoodData, hasDifficultyData,
  } = analytics;

  const avgCompletion = useMemo(() => {
    const daysWithData = (last30Days as any[]).filter(d => d.total > 0);
    if (daysWithData.length === 0) return 0;
    return Math.round(daysWithData.reduce((sum: number, d: any) => sum + (d.done / d.total) * 100, 0) / daysWithData.length);
  }, [last30Days]);

  // Build text-based insight cards from data
  const insightCards = useMemo(() => {
    if (checkins.length < 3) return [];
    const cards: { icon: any; text: string; type: "positive" | "neutral" | "tip" }[] = [];

    // Best streak insight
    const topStreakEntry = Object.entries(analytics.bestStreaks)
      .filter(([, v]) => (v as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    if (topStreakEntry) {
      const sys = systems.find(s => s.id === topStreakEntry[0]);
      const streak = topStreakEntry[1] as number;
      if (streak >= 7) {
        cards.push({
          icon: Flame,
          text: `Your longest streak is ${streak} days on "${sys?.title}". That's real consistency.`,
          type: "positive",
        });
      }
    }

    // Consistency insight
    if (avgCompletion >= 80) {
      cards.push({
        icon: Trophy,
        text: `You complete habits ${avgCompletion}% of the time on average. That puts you ahead of most people.`,
        type: "positive",
      });
    } else if (avgCompletion >= 50) {
      cards.push({
        icon: TrendingUp,
        text: `You're completing about ${avgCompletion}% of habits on average. Getting above 70% is the next milestone.`,
        type: "neutral",
      });
    } else if (avgCompletion > 0) {
      cards.push({
        icon: Heart,
        text: `Consistency takes time to build. At ${avgCompletion}% avg, consider simplifying your habits — the minimum should feel almost too easy.`,
        type: "tip",
      });
    }

    // Most consistent system
    const topConsistent = [...systemStats]
      .filter(s => s.totalCheckins >= 5)
      .sort((a, b) => b.pct - a.pct)[0];
    if (topConsistent && topConsistent.pct >= 70) {
      cards.push({
        icon: Award,
        text: `"${topConsistent.title}" is your most reliable habit at ${topConsistent.pct}% completion. It's becoming automatic.`,
        type: "positive",
      });
    }

    // Most missed system
    const topMissed = [...systemStats]
      .filter(s => s.totalCheckins >= 5 && s.missedCount > 0)
      .sort((a, b) => b.missedCount - a.missedCount)[0];
    if (topMissed && topMissed.pct < 50) {
      cards.push({
        icon: Lightbulb,
        text: `"${topMissed.title}" is being missed frequently. Try shrinking it to a 2-minute version — doing less is better than skipping.`,
        type: "tip",
      });
    }

    // Mood insight
    if (hasMoodData) {
      const highMood = moodBuckets.filter(b => b.mood >= 4 && b.count > 0);
      const lowMood  = moodBuckets.filter(b => b.mood <= 2 && b.count > 0);
      if (highMood.length && lowMood.length) {
        const avgHigh = Math.round(highMood.reduce((s, b) => s + b.completionPct, 0) / highMood.length);
        const avgLow  = Math.round(lowMood.reduce((s, b) => s + b.completionPct, 0) / lowMood.length);
        if (avgHigh > avgLow + 15) {
          cards.push({
            icon: Smile,
            text: `On high-mood days you complete ${avgHigh}% of habits vs. ${avgLow}% on low-mood days. Your fallback plan matters most on hard days.`,
            type: "tip",
          });
        }
      }
    }

    // Difficulty insight
    if (hasDifficultyData) {
      const easyBuckets = difficultyBuckets.filter(b => b.difficulty <= 2 && b.count > 0);
      const hardBuckets = difficultyBuckets.filter(b => b.difficulty >= 4 && b.count > 0);
      if (easyBuckets.length && hardBuckets.length) {
        const avgEasy = Math.round(easyBuckets.reduce((s, b) => s + b.completionPct, 0) / easyBuckets.length);
        const avgHard = Math.round(hardBuckets.reduce((s, b) => s + b.completionPct, 0) / hardBuckets.length);
        if (avgEasy > avgHard + 20) {
          cards.push({
            icon: Dumbbell,
            text: `Habits rated easy are completed ${avgEasy}% of the time vs. ${avgHard}% for hard ones. Consider making your minimum action smaller.`,
            type: "tip",
          });
        }
      }
    }

    // Total check-ins milestone
    const total = analytics.totalCheckins;
    if (total >= 100) {
      cards.push({
        icon: Star,
        text: `You've logged ${total} check-ins all time. That's ${total} decisions to show up for yourself. Remarkable.`,
        type: "positive",
      });
    } else if (total >= 30) {
      cards.push({
        icon: TrendingUp,
        text: `${total} total check-ins so far. The research says 66 days to form a habit — you're building real momentum.`,
        type: "neutral",
      });
    }

    return cards.slice(0, 4);
  }, [checkins, systems, systemStats, analytics, avgCompletion, hasMoodData, hasDifficultyData, moodBuckets, difficultyBuckets]);

  // All hooks above — now safe to conditionally return
  const chartData = period === "daily" ? dailyChart
    : period === "weekly" ? weeklyChart
    : monthlyChart;

  const topStreaks = Object.entries(streaks)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  const topBestStreakEntries = Object.entries(bestStreaks)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  const categoryData = Object.entries(categoryBreakdown).map(([cat, count]) => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    Goals: count as number,
  }));

  const mostConsistent = [...systemStats]
    .filter(s => s.totalCheckins >= 3)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const mostMissed = [...systemStats]
    .filter(s => s.totalCheckins >= 3 && s.missedCount > 0)
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, 5);

  const hasData = checkins.length > 0;
  const hasDowData = dayOfWeekStats.some(d => d.totalCount > 0);

  const periodLabel: Record<Period, string> = {
    daily:   "last 14 days",
    weekly:  "last 8 weeks",
    monthly: "last 6 months",
  };

  if (isLoading) {
    return (
      <div
        className="p-6 max-w-5xl mx-auto space-y-6"
        aria-busy="true"
        aria-label="Loading progress insights"
      >
        <span className="sr-only" role="status">Loading your progress data, please wait…</span>
        <h1 className="text-2xl font-bold">Progress Insights</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress Insights</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track your consistency and growth over time
        </p>
      </div>

      {/* Text-based insight cards */}
      {insightCards.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {insightCards.map((card, i) => {
            const colorMap = {
              positive: "bg-chart-3/8 border-chart-3/20 text-chart-3",
              neutral:  "bg-primary/8 border-primary/20 text-primary",
              tip:      "bg-chart-4/8 border-chart-4/20 text-chart-4",
            };
            const iconColor = colorMap[card.type];
            return (
              <div
                key={i}
                className={cn("flex items-start gap-3 p-4 rounded-xl border", colorMap[card.type].split(" ").slice(0, 2).join(" "))}
                data-testid={`insight-card-${i}`}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconColor.split(" ").slice(0, 2).join(" "))}>
                  <card.icon className={cn("w-4 h-4", iconColor.split(" ").slice(2).join(" "))} />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{card.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full empty state when user has no check-ins at all */}
      {!hasData && (
        <Card className="border-primary/20">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <BarChart2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Your progress story starts here</h3>
            <p className="text-muted-foreground text-sm mb-3 max-w-sm mx-auto leading-relaxed">
              Once you start checking in on your systems each day, you'll see charts showing your streaks, consistency, and growth over time.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Even one check-in is enough to start.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="/checkins">
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity" data-testid="button-analytics-go-checkin">
                  <CheckSquare className="w-4 h-4" />
                  Check in today
                </button>
              </a>
              {systems.length === 0 && (
                <a href="/systems/new">
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors" data-testid="button-analytics-build-system">
                    Build a system first
                  </button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          label="Total Goals"
          value={analytics.totalGoals}
          sub={`${analytics.activeGoals} active`}
          color="bg-primary/10 text-primary"
        />
        <MetricCard
          icon={Zap}
          label="Total Systems"
          value={analytics.totalSystems}
          sub={`${analytics.activeSystems} active`}
          color="bg-chart-2/10 text-chart-2"
        />
        <MetricCard
          icon={Calendar}
          label="Total Check-ins"
          value={analytics.totalCheckins}
          sub="all time"
          color="bg-chart-3/10 text-chart-3"
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Completion"
          value={`${avgCompletion}%`}
          sub="last 30 days"
          color="bg-chart-4/10 text-chart-4"
        />
      </div>

      {/* Daily / Weekly / Monthly completion bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Completion Rate — {periodLabel[period]}
            </CardTitle>
            <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
              <TabsList className="h-8">
                <TabsTrigger value="daily"   className="text-xs px-3" data-testid="tab-period-daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly"  className="text-xs px-3" data-testid="tab-period-weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs px-3" data-testid="tab-period-monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {!hasData || chartData.every((d: any) => d.Total === 0) ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No data yet — start checking in daily!
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Done"  fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Total" fill="hsl(var(--muted))"   radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Completion % trend line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Completion % Trend — {periodLabel[period]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No data yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Completion %"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Day-of-week patterns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-chart-2" />
            Day-of-week Patterns
          </CardTitle>
          <p className="text-xs text-muted-foreground">Which days you complete habits most consistently</p>
        </CardHeader>
        <CardContent>
          {!hasDowData ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Check in for at least a week to see patterns.</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="dow-patterns">
              {dayOfWeekStats.map(d => {
                const pct = d.doneRate;
                const barColor = pct >= 70 ? "bg-chart-3" : pct >= 40 ? "bg-chart-4" : "bg-destructive/60";
                return (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-8 flex-shrink-0 text-muted-foreground">{d.shortDay}</span>
                    <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                      <div
                        className={cn("h-full rounded-sm transition-all", barColor)}
                        style={{ width: d.totalCount > 0 ? `${pct}%` : "0%" }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right flex-shrink-0">
                      {d.totalCount > 0 ? `${pct}%` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                      {d.totalCount > 0 ? `${d.doneCount}/${d.totalCount}` : "no data"}
                    </span>
                  </div>
                );
              })}
              {(() => {
                const withData = dayOfWeekStats.filter(d => d.totalCount > 0);
                if (withData.length < 2) return null;
                const best  = [...withData].sort((a, b) => b.doneRate - a.doneRate)[0];
                const worst = [...withData].sort((a, b) => a.doneRate - b.doneRate)[0];
                if (best.day === worst.day) return null;
                return (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Your strongest day is <span className="font-semibold text-foreground">{best.day}</span> ({best.doneRate}%).
                    {worst.doneRate < best.doneRate - 20 && (
                      <> Consider a fallback plan for <span className="font-semibold text-foreground">{worst.day}</span>s ({worst.doneRate}%).</>
                    )}
                  </p>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mood vs Completion + Difficulty vs Completion */}
      {(hasMoodData || hasDifficultyData) && (
        <div className="grid md:grid-cols-2 gap-4">
          {hasMoodData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smile className="w-4 h-4 text-chart-5" />
                  Mood vs. Completion
                </CardTitle>
                <p className="text-xs text-muted-foreground">How your pre-habit mood affects success</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="mood-correlation">
                  {moodBuckets.filter(b => b.count > 0).map(b => (
                    <div key={b.mood} className="flex items-center gap-3">
                      <span className="text-xs w-16 flex-shrink-0 text-muted-foreground">{b.label}</span>
                      <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-chart-5/70 rounded-sm transition-all"
                          style={{ width: `${b.completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right flex-shrink-0">{b.completionPct}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasDifficultyData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-chart-4" />
                  Difficulty vs. Completion
                </CardTitle>
                <p className="text-xs text-muted-foreground">How perceived difficulty affects follow-through</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="difficulty-correlation">
                  {difficultyBuckets.filter(b => b.count > 0).map(b => (
                    <div key={b.difficulty} className="flex items-center gap-3">
                      <span className="text-xs w-20 flex-shrink-0 text-muted-foreground">{b.label}</span>
                      <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-sm transition-all",
                            b.completionPct >= 70 ? "bg-chart-3/70" : b.completionPct >= 40 ? "bg-chart-4/70" : "bg-destructive/50",
                          )}
                          style={{ width: `${b.completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right flex-shrink-0">{b.completionPct}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Current streaks + Best-ever streaks */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Current streaks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-chart-4" />
              Current Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStreaks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No active streaks yet. Keep checking in!
              </p>
            ) : (
              <div className="space-y-3">
                {topStreaks.map(([systemId, streak]) => {
                  const sys = systems.find(s => s.id === systemId);
                  return (
                    <div
                      key={systemId}
                      className="flex items-center justify-between gap-3"
                      data-testid={`streak-current-${systemId}`}
                    >
                      <span className="text-sm truncate">{sys?.title ?? "Unknown"}</span>
                      <div className="flex items-center gap-1 text-chart-4 font-bold flex-shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        {streak as number}d
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best-ever streaks (streak history) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-chart-2" />
              Best Streaks (All-time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBestStreakEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Complete at least one check-in to see best streaks.
              </p>
            ) : (
              <div className="space-y-3">
                {topBestStreakEntries.map(([systemId, best], idx) => {
                  const sys = systems.find(s => s.id === systemId);
                  const current = streaks[systemId] ?? 0;
                  return (
                    <div
                      key={systemId}
                      className="flex items-center justify-between gap-3"
                      data-testid={`streak-best-${systemId}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-4">#{idx + 1}</span>
                        <span className="text-sm truncate">{sys?.title ?? "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {current === best && current > 0 && (
                          <Badge variant="outline" className="text-chart-3 border-chart-3/30 text-xs">active</Badge>
                        )}
                        <div className="flex items-center gap-1 text-chart-2 font-bold">
                          <Star className="w-3 h-3" />
                          {best as number}d
                        </div>
                      </div>
                    </div>
                  );
                })}
                {topBestStreak > 0 && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                    Your personal record: <span className="font-semibold text-foreground">{topBestStreak} days</span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals by category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Goals by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <p className="text-muted-foreground text-sm">Create goals to see categories.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, categoryData.length * 36)}>
              <BarChart data={categoryData} layout="vertical" barSize={12}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Goals" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Most consistent + most missed systems */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-chart-3" />
              Most Consistent Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostConsistent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Check in at least 3 times to see rankings.
              </p>
            ) : (
              <div className="space-y-3">
                {mostConsistent.map((s, i) => (
                  <div key={s.systemId} data-testid={`consistent-system-${s.systemId}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                        <span className="text-sm truncate">{s.title}</span>
                      </div>
                      <Badge variant="outline" className="text-chart-3 border-chart-3/30 flex-shrink-0">
                        {s.pct}%
                      </Badge>
                    </div>
                    <Progress value={s.pct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.doneCount} done / {s.totalCheckins} check-ins
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Most Missed Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostMissed.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No missed check-ins yet — keep it up!
              </p>
            ) : (
              <div className="space-y-3">
                {mostMissed.map((s, i) => (
                  <div key={s.systemId} data-testid={`missed-system-${s.systemId}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                        <span className="text-sm truncate">{s.title}</span>
                      </div>
                      <Badge variant="outline" className="text-destructive border-destructive/30 flex-shrink-0">
                        {s.missedCount} missed
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((s.missedCount / s.totalCheckins) * 100)}% miss rate across{" "}
                      {s.totalCheckins} check-ins
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion by goal */}
      {goalCompletion.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Completion by Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...goalCompletion]
                .sort((a, b) => b.avgPct - a.avgPct)
                .map(gc => (
                  <div key={gc.goalId} data-testid={`goal-completion-${gc.goalId}`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium truncate">{gc.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {gc.systemCount} system{gc.systemCount !== 1 ? "s" : ""}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            gc.avgPct >= 80
                              ? "text-chart-3 border-chart-3/30"
                              : gc.avgPct >= 50
                              ? "text-chart-4 border-chart-4/30"
                              : "text-destructive border-destructive/30"
                          }
                        >
                          {gc.avgPct}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={gc.avgPct} className="h-2" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
