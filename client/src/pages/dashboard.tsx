import { useMemo } from "react";
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
  Lightbulb, Star, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
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

function GreetingBanner({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="relative rounded-2xl overflow-hidden p-6 md:p-8 gradient-brand text-white mb-0">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-48 h-48 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <p className="text-white/70 text-sm font-medium mb-1">{format(new Date(), "EEEE, MMMM d")}</p>
      <h1 className="text-2xl md:text-3xl font-bold mb-1">{greeting}, {name.split(" ")[0]}! 👋</h1>
      <p className="text-white/80 text-sm">Ready to make progress today? Every check-in counts.</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color, hint }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; hint?: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">{label}</p>
            <p
              className="text-2xl font-extrabold leading-none mb-1"
              data-testid={`metric-${label.toLowerCase().replace(/ /g, "-")}`}
            >
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
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
    <Card>
      <CardContent className="p-10 md:p-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href={primaryAction.href}>
            <Button data-testid={primaryAction.testId}>{primaryAction.label}</Button>
          </Link>
          {secondaryAction && (
            <Link href={secondaryAction.href}>
              <Button variant="outline" data-testid={secondaryAction.testId}>
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
      const msgs: Record<string, string> = {
        done:    "Keep it up! 🔥",
        partial: "Partial progress counts.",
        missed:  "Tomorrow is another chance.",
      };
      toast({ title: msgs[status] ?? "Saved!" });
    },
    onError: () => toast({ title: "Couldn't save", variant: "destructive" }),
  });

  const buttons = [
    { status: "done",    label: "Done",    Icon: Check, active: "bg-chart-3 text-white border-chart-3",    idle: "hover:border-chart-3/50 hover:text-chart-3" },
    { status: "partial", label: "Partial", Icon: Minus, active: "bg-chart-4 text-white border-chart-4",    idle: "hover:border-chart-4/50 hover:text-chart-4" },
    { status: "missed",  label: "Missed",  Icon: X,     active: "bg-destructive text-white border-destructive", idle: "hover:border-destructive/50 hover:text-destructive" },
  ] as const;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors"
      data-testid={`quick-checkin-${system.id}`}
    >
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Zap className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-medium flex-1 truncate">{system.title}</span>
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
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-5">
      <GreetingBanner name={user?.name || "there"} />

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
          label="Best Streak"
          value={topStreaks[0]?.[1] ? `${topStreaks[0][1]}d` : "—"}
          sub={topStreaks[0]?.[1] ? "consecutive days" : "Check in to start"}
          color="bg-chart-4/10 text-chart-4"
        />
      </div>

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
                <CardTitle className="text-base">Today's Progress</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Mark each habit done, partial, or missed — right here</p>
              </div>
              <Link href="/checkins">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-today-checkins">
                  Add notes
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
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
              {activeSystems.slice(0, 5).map(system => (
                <QuickCheckinRow
                  key={system.id}
                  system={system}
                  existingCheckin={todayCheckins.find(c => c.systemId === system.id)}
                  userId={userId}
                  today={today}
                />
              ))}
              {activeSystems.length > 5 && (
                <Link href="/checkins">
                  <p className="text-xs text-muted-foreground text-center py-1 hover:text-primary transition-colors cursor-pointer">
                    +{activeSystems.length - 5} more — view all
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
                        pct > 0    ? "bg-destructive/40" :
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
                  return (
                    <div key={systemId} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium truncate">{sys?.title ?? "Unknown system"}</span>
                      <div className="flex items-center gap-1 text-chart-4 font-bold flex-shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-sm">{streak as number}d</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/goals">
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10" data-testid="quick-action-goals">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm">Create a new goal</span>
              </Button>
            </Link>
            <Link href="/systems/new">
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10" data-testid="quick-action-systems">
                <div className="w-6 h-6 rounded-md bg-chart-2/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-chart-2" />
                </div>
                <span className="text-sm">Build a new system</span>
              </Button>
            </Link>
            <Link href="/checkins">
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10" data-testid="quick-action-checkins">
                <div className="w-6 h-6 rounded-md bg-chart-3/10 flex items-center justify-center">
                  <CheckSquare className="w-3.5 h-3.5 text-chart-3" />
                </div>
                <span className="text-sm">Check in for today</span>
              </Button>
            </Link>
            <Link href="/journal">
              <Button variant="outline" className="w-full justify-start gap-2.5 h-10" data-testid="quick-action-journal">
                <div className="w-6 h-6 rounded-md bg-chart-4/10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-chart-4" />
                </div>
                <span className="text-sm">Write a reflection</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Active Goals</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Your current long-term targets</p>
              </div>
              <Link href="/goals">
                <Button variant="ghost" size="sm" data-testid="link-all-goals">
                  See all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {activeGoals.slice(0, 4).map(goal => (
                <Link href={`/goals/${goal.id}`} key={goal.id}>
                  <div
                    className="p-3.5 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:bg-primary/5 transition-colors cursor-pointer"
                    data-testid={`goal-card-${goal.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Target className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <p className="text-sm font-semibold truncate">{goal.title}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                        {goal.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pl-9">
                      <Badge variant="secondary" className="text-xs capitalize">{goal.category}</Badge>
                      {goal.deadline && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(goal.deadline), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No goals yet */}
      {!isNewUser && activeGoals.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Target className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-sm mb-1">No active goals yet</h3>
            <p className="text-muted-foreground text-xs mb-4 max-w-[200px] mx-auto">
              Goals give you direction. Start with just one.
            </p>
            <Link href="/goals">
              <Button variant="outline" size="sm" data-testid="button-add-goal-empty">
                Add a goal
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Your latest check-ins and reflections</p>
              </div>
              <Link href="/checkins">
                <Button variant="ghost" size="sm" data-testid="link-activity-history">
                  View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map((item) => {
                if (item.kind === "checkin") {
                  const c = item.data as Checkin;
                  const sys = systems.find(s => s.id === c.systemId);
                  const StatusIcon = c.status === "done" ? Check : c.status === "partial" ? Minus : X;
                  const statusColor =
                    c.status === "done" ? "text-chart-3 bg-chart-3/10" :
                    c.status === "partial" ? "text-chart-4 bg-chart-4/10" :
                    "text-destructive bg-destructive/10";
                  return (
                    <div
                      key={`checkin-${c.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                      data-testid={`activity-checkin-${c.id}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${statusColor}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{sys?.title ?? "Unknown system"}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.dateKey === today ? "Today" : format(parseISO(c.dateKey), "MMM d")}
                          {c.note ? ` · "${c.note.slice(0, 40)}${c.note.length > 40 ? "…" : ""}"` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs flex-shrink-0 capitalize">
                        {c.status}
                      </Badge>
                    </div>
                  );
                }

                const j = item.data as JournalEntry;
                const dateLabel = j.dateKey === today ? "Today" : format(parseISO(j.dateKey), "MMM d");
                return (
                  <div
                    key={`journal-${j.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                    data-testid={`activity-journal-${j.id}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-primary bg-primary/10">
                      <PenLine className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {j.promptType
                          ? j.promptType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                          : "Reflection"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateLabel}
                        {j.content ? ` · "${j.content.slice(0, 40)}${j.content.length > 40 ? "…" : ""}"` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">journal</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
