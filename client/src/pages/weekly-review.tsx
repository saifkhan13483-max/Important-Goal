import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { System, Checkin, Goal } from "@/types/schema";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import { getGoals } from "@/services/goals.service";
import { useToast } from "@/hooks/use-toast";
import { getPlanFeatures } from "@/lib/plan-limits";
import {
  Flame, TrendingUp, TrendingDown, CheckCircle2, XCircle,
  Minus, Target, Calendar, Trophy, Sparkles, ArrowRight,
  ChevronLeft, ChevronRight, BarChart2, RefreshCw, Lightbulb,
  Star, CheckSquare, Bot, Loader2, Brain, Heart, Zap, Clock,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { chatWithCoach } from "@/services/ai.service";
import { Helmet } from "react-helmet-async";

function getWeekDays(weekOffset: number = 0) {
  const today = new Date();
  const refDay = subDays(today, weekOffset * 7);
  const weekStart = startOfWeek(refDay, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDay, { weekStartsOn: 1 });
  const days: string[] = [];
  const cur = new Date(weekStart);
  while (cur <= weekEnd) {
    days.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return { days, weekStart, weekEnd };
}

function StatusDot({ status }: { status: string | null }) {
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0" />;
  if (status === "partial") return <Minus className="w-4 h-4 text-chart-4 flex-shrink-0" />;
  if (status === "missed") return <XCircle className="w-4 h-4 text-destructive/70 flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />;
}

function DayCell({ dateKey, status, isToday, isFuture }: {
  dateKey: string; status: string | null; isToday: boolean; isFuture: boolean;
}) {
  const dayLabel = format(parseISO(dateKey + "T12:00:00"), "EEE");
  const dayNum = format(parseISO(dateKey + "T12:00:00"), "d");
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[36px]",
      isToday ? "bg-primary/10 ring-1 ring-primary/30" : "bg-transparent",
    )}>
      <span className={cn("text-[9px] font-semibold uppercase tracking-wide",
        isToday ? "text-primary" : "text-muted-foreground")}>{dayLabel}</span>
      <span className={cn("text-xs font-bold",
        isToday ? "text-primary" : "text-foreground")}>{dayNum}</span>
      {isFuture ? (
        <div className="w-3.5 h-3.5 rounded-full border border-dashed border-muted-foreground/20" />
      ) : (
        <div className={cn(
          "w-3.5 h-3.5 rounded-full",
          status === "done"    ? "bg-chart-3" :
          status === "partial" ? "bg-chart-4" :
          status === "missed"  ? "bg-destructive/40" :
          "bg-muted/50 border border-border/40",
        )} />
      )}
    </div>
  );
}

export default function WeeklyReview() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const features = getPlanFeatures(user?.plan);
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [intention, setIntention] = useState("");
  const [intentionSaved, setIntentionSaved] = useState(false);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);

  const { days, weekStart, weekEnd } = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayKey = new Date().toISOString().split("T")[0];
  const isCurrentWeek = weekOffset === 0;

  const { data: systems = [], isLoading: sysLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: checkins = [], isLoading: chkLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const isLoading = sysLoading || chkLoading;

  const activeSystems = useMemo(() => systems.filter(s => s.active), [systems]);
  const systemNames = useMemo(() => activeSystems.map(s => s.title), [activeSystems]);

  const weekCheckins = useMemo(() =>
    checkins.filter(c => c.dateKey >= days[0] && c.dateKey <= days[6]),
    [checkins, days],
  );

  const systemStats = useMemo(() => {
    return activeSystems.map(sys => {
      const sc = weekCheckins.filter(c => c.systemId === sys.id);
      const done = sc.filter(c => c.status === "done").length;
      const partial = sc.filter(c => c.status === "partial").length;
      const missed = sc.filter(c => c.status === "missed").length;
      const dayStatuses: Record<string, string | null> = {};
      for (const d of days) {
        const c = sc.find(ch => ch.dateKey === d);
        dayStatuses[d] = c?.status ?? null;
      }
      const pastDays = days.filter(d => d <= todayKey);
      const possibleDays = pastDays.length;
      const rate = possibleDays > 0 ? Math.round((done / possibleDays) * 100) : 0;

      const allCheckins = checkins.filter(c => c.systemId === sys.id && c.status === "done").map(c => c.dateKey).sort((a, b) => b.localeCompare(a));
      const doneSet = new Set(allCheckins);
      let streak = 0;
      const cur = new Date(todayKey);
      for (let i = 0; i < 365; i++) {
        const key = cur.toISOString().split("T")[0];
        if (doneSet.has(key)) { streak++; cur.setDate(cur.getDate() - 1); }
        else break;
      }

      return { system: sys, done, partial, missed, dayStatuses, rate, streak, possibleDays };
    });
  }, [activeSystems, weekCheckins, days, checkins, todayKey]);

  const overallStats = useMemo(() => {
    const pastDays = days.filter(d => d <= todayKey);
    const totalPossible = activeSystems.length * pastDays.length;
    const totalDone = weekCheckins.filter(c => c.status === "done").length;
    const totalMissed = weekCheckins.filter(c => c.status === "missed").length;
    const rate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
    const perfectDays = pastDays.filter(d => {
      const dayCheckins = weekCheckins.filter(c => c.dateKey === d);
      return activeSystems.length > 0 && dayCheckins.filter(c => c.status === "done").length === activeSystems.length;
    }).length;
    return { totalDone, totalMissed, rate, perfectDays, pastDays: pastDays.length };
  }, [activeSystems, weekCheckins, days, todayKey]);

  const topSystem = useMemo(() =>
    [...systemStats].sort((a, b) => b.rate - a.rate)[0],
    [systemStats],
  );
  const lowestSystem = useMemo(() =>
    [...systemStats].filter(s => s.possibleDays > 0 && s.rate < 100).sort((a, b) => a.rate - b.rate)[0],
    [systemStats],
  );

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "This week";
    if (weekOffset === 1) return "Last week";
    return `Week of ${format(weekStart, "MMM d")}`;
  }, [weekOffset, weekStart]);

  const handleGetAiReview = async () => {
    if (!features.aiCoach) return;
    setAiReviewLoading(true);
    try {
      const summary = systemStats.map(s =>
        `${s.system.title}: ${s.done} done, ${s.missed} missed (${s.rate}% rate, ${s.streak}-day streak)`
      ).join("\n");
      const prompt = `Give me a brief, motivating weekly habit review. This week's data:\n${summary}\nOverall: ${overallStats.rate}% completion rate, ${overallStats.perfectDays} perfect days.\nBe specific, encouraging, and give 2-3 actionable suggestions for next week. Keep it under 150 words.`;
      const response = await chatWithCoach(
        [{ role: "user", content: prompt }],
        { systemNames, bestStreak: Math.max(...systemStats.map(s => s.streak), 0), userName: user?.name },
      );
      setAiReview(response);
    } catch {
      toast({ title: "AI unavailable", description: "Couldn't generate review right now.", variant: "destructive" });
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleSaveIntention = () => {
    if (!intention.trim()) return;
    localStorage.setItem(`strivo_week_intention_${days[0]}`, intention.trim());
    setIntentionSaved(true);
    toast({ title: "Intention saved!", description: "You can come back and reflect on it at the end of the week." });
  };

  useEffect(() => {
    const saved = localStorage.getItem(`strivo_week_intention_${days[0]}`);
    if (saved) { setIntention(saved); setIntentionSaved(true); }
    else { setIntention(""); setIntentionSaved(false); }
  }, [days[0]]);

  const rateColor = overallStats.rate >= 80 ? "text-chart-3" : overallStats.rate >= 50 ? "text-chart-4" : "text-destructive";
  const rateBg = overallStats.rate >= 80 ? "bg-chart-3" : overallStats.rate >= 50 ? "bg-chart-4" : "bg-destructive/60";

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Helmet>
        <title>Weekly Review | Strivo</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Weekly Review</span>
          </div>
          <h1 className="text-2xl font-bold">{weekLabel}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)} data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {weekOffset > 0 && (
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} data-testid="button-current-week">
              This week
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0} data-testid="button-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* No systems empty state */}
      {activeSystems.length === 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-10 text-center">
            <Zap className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">No active systems yet</h3>
            <p className="text-muted-foreground text-sm mb-5">Build your first habit system to start tracking your weekly progress.</p>
            <Link href="/systems/new">
              <Button className="gap-2" data-testid="button-review-build-system">
                <Zap className="w-4 h-4" /> Build a system
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {activeSystems.length > 0 && (
        <>
          {/* Summary Hero */}
          <Card className="overflow-hidden">
            <div className="gradient-brand text-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-white/70 text-xs font-medium mb-1">Overall completion</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">{overallStats.rate}%</span>
                    <span className="text-white/60 text-sm">this week</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                  {overallStats.rate >= 80 ? <Trophy className="w-7 h-7" /> :
                   overallStats.rate >= 50 ? <TrendingUp className="w-7 h-7" /> :
                   <Heart className="w-7 h-7" />}
                </div>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${overallStats.rate}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-white text-lg font-bold">{overallStats.totalDone}</p>
                  <p className="text-white/60 text-xs">Done</p>
                </div>
                <div>
                  <p className="text-white text-lg font-bold">{overallStats.perfectDays}</p>
                  <p className="text-white/60 text-xs">Perfect days</p>
                </div>
                <div>
                  <p className="text-white text-lg font-bold">{overallStats.totalMissed}</p>
                  <p className="text-white/60 text-xs">Missed</p>
                </div>
              </div>
            </div>
            {/* Motivation message */}
            <div className="px-5 py-3 bg-muted/20 border-t border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {overallStats.rate >= 90 ? "🔥 Exceptional week. You're in the top tier of consistency." :
                 overallStats.rate >= 75 ? "✅ Strong week. You're building real momentum." :
                 overallStats.rate >= 50 ? "📈 Solid effort. Every day you showed up moves you forward." :
                 overallStats.totalDone > 0 ? "💪 Even showing up partially matters. Next week is a fresh start." :
                 "🌱 No check-ins yet this week. Each day is a new opportunity."}
              </p>
            </div>
          </Card>

          {/* Highlights */}
          {(topSystem || lowestSystem) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {topSystem && topSystem.done > 0 && (
                <Card className="border-chart-3/20 bg-chart-3/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-chart-3" />
                      <span className="text-xs font-semibold text-chart-3 uppercase tracking-wide">Best this week</span>
                    </div>
                    <p className="font-semibold text-sm truncate">{topSystem.system.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-bold text-chart-3">{topSystem.rate}%</span>
                      {topSystem.streak > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> {topSystem.streak}d
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              {lowestSystem && lowestSystem.missed > 0 && (
                <Card className="border-chart-4/20 bg-chart-4/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-chart-4" />
                      <span className="text-xs font-semibold text-chart-4 uppercase tracking-wide">Needs attention</span>
                    </div>
                    <p className="font-semibold text-sm truncate">{lowestSystem.system.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lowestSystem.missed} missed · {lowestSystem.rate}% rate
                    </p>
                    {lowestSystem.system.fallbackPlan && (
                      <p className="text-xs text-chart-4 mt-1.5 leading-relaxed">
                        Backup: "{lowestSystem.system.fallbackPlan}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Per-system breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                System Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {systemStats.map(({ system, done, partial, missed, dayStatuses, rate, streak, possibleDays }) => (
                <div key={system.id} className="space-y-2" data-testid={`review-system-${system.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{system.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {streak > 0 && (
                        <span className="text-[10px] font-semibold text-chart-4 flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> {streak}d
                        </span>
                      )}
                      <span className={cn("text-sm font-bold",
                        rate >= 80 ? "text-chart-3" : rate >= 50 ? "text-chart-4" : "text-destructive/70"
                      )}>{possibleDays > 0 ? `${rate}%` : "—"}</span>
                    </div>
                  </div>
                  {/* Day dots */}
                  <div className="flex gap-1">
                    {days.map(d => (
                      <DayCell
                        key={d}
                        dateKey={d}
                        status={dayStatuses[d]}
                        isToday={d === todayKey}
                        isFuture={d > todayKey}
                      />
                    ))}
                  </div>
                  {/* Mini progress bar */}
                  {possibleDays > 0 && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500",
                        rate >= 80 ? "bg-chart-3" : rate >= 50 ? "bg-chart-4" : "bg-destructive/50"
                      )} style={{ width: `${rate}%` }} />
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {done > 0 && <span className="text-chart-3 font-medium">{done} done</span>}
                    {partial > 0 && <span className="text-chart-4 font-medium">{partial} partial</span>}
                    {missed > 0 && <span className="text-destructive/70 font-medium">{missed} missed</span>}
                    {done === 0 && partial === 0 && missed === 0 && <span>No check-ins yet</span>}
                  </div>
                  {system.minimumAction && missed > 0 && (
                    <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5 leading-relaxed">
                      Fallback: "{system.minimumAction}"
                    </div>
                  )}
                  <Separator className="mt-3" />
                </div>
              ))}
              <Link href="/checkins">
                <Button variant="outline" size="sm" className="w-full gap-2 mt-1" data-testid="button-review-go-checkins">
                  <CheckSquare className="w-4 h-4" />
                  {isCurrentWeek ? "Check in today" : "View check-ins"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* AI Weekly Review — Pro+ */}
          {features.aiCoach && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    AI Coach Review
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetAiReview}
                    disabled={aiReviewLoading || systemStats.length === 0}
                    className="h-7 px-2.5 text-xs gap-1.5"
                    data-testid="button-get-ai-review"
                  >
                    {aiReviewLoading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</>
                    ) : (
                      <><Sparkles className="w-3 h-3" />{aiReview ? "Refresh" : "Analyze my week"}</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {aiReview ? (
                  <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{aiReview}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Click "Analyze my week" to get personalized feedback from your AI coach.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!features.aiCoach && (
            <Card className="border-dashed border-primary/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">AI Weekly Coach</p>
                  <p className="text-xs text-muted-foreground">Get personalized weekly feedback based on your actual habit data.</p>
                </div>
                <Link href="/pricing">
                  <Button size="sm" variant="outline" className="flex-shrink-0 gap-1.5 text-xs" data-testid="button-review-upgrade-ai">
                    <Sparkles className="w-3 h-3" /> Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Weekly Intention */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                {isCurrentWeek ? "This Week's Intention" : "Week Intention"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isCurrentWeek
                  ? "What's the one thing you want to focus on most this week?"
                  : "What was your focus for this week?"}
              </p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Textarea
                placeholder="This week I want to focus on…"
                value={intention}
                onChange={e => { setIntention(e.target.value); setIntentionSaved(false); }}
                rows={3}
                data-testid="textarea-weekly-intention"
                className="resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                {intentionSaved && (
                  <span className="text-xs text-chart-3 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
                <div className={!intentionSaved ? "ml-auto" : ""}>
                  <Button
                    size="sm"
                    onClick={handleSaveIntention}
                    disabled={!intention.trim() || intentionSaved}
                    data-testid="button-save-intention"
                  >
                    {intentionSaved ? "Saved" : "Save Intention"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "View Analytics", href: "/analytics", icon: BarChart2 },
              { label: "Journal", href: "/journal", icon: Brain },
              { label: "Check In", href: "/checkins", icon: CheckSquare },
              { label: "AI Coach", href: "/ai-coach", icon: Bot },
            ].map(link => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <button
                    className="w-full flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                    data-testid={`button-review-link-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{link.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
