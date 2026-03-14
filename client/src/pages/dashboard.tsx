import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Goal, System, Checkin } from "@shared/schema";
import {
  Target, Zap, CheckSquare, TrendingUp, ArrowRight, Plus, Flame,
  Calendar, BookOpen, BarChart2
} from "lucide-react";
import { format } from "date-fns";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function GreetingBanner({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="relative rounded-xl overflow-hidden p-6 gradient-brand text-white mb-6">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      <p className="text-white/80 text-sm font-medium mb-1">{format(new Date(), "EEEE, MMMM d")}</p>
      <h1 className="text-2xl font-bold">{greeting}, {name.split(" ")[0]}!</h1>
      <p className="text-white/80 text-sm mt-1">Ready to build some momentum today?</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold" data-testid={`metric-${label.toLowerCase().replace(/ /g, "-")}`}>{value}</p>
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

export default function Dashboard() {
  const { user } = useAuth();
  const today = getTodayKey();

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });
  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({ queryKey: ["/api/systems"] });
  const { data: todayCheckins = [] } = useQuery<Checkin[]>({ queryKey: ["/api/checkins/today"] });
  const { data: analytics } = useQuery<any>({ queryKey: ["/api/analytics"] });

  const activeGoals = goals.filter(g => g.status === "active");
  const activeSystems = systems.filter(s => s.active);
  const todayDone = todayCheckins.filter(c => c.status === "done").length;
  const todayTotal = activeSystems.length;
  const completionPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const topStreaks = Object.entries(analytics?.streaks || {})
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <GreetingBanner name={user?.name || "there"} />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Target} label="Active Goals" value={activeGoals.length} sub="in progress" color="bg-primary/10 text-primary" />
        <MetricCard icon={Zap} label="Active Systems" value={activeSystems.length} sub="running daily" color="bg-chart-2/10 text-chart-2" />
        <MetricCard icon={CheckSquare} label="Today Done" value={`${todayDone}/${todayTotal}`} sub={`${completionPct}% complete`} color="bg-chart-3/10 text-chart-3" />
        <MetricCard icon={Flame} label="Best Streak" value={topStreaks[0]?.[1] ? `${topStreaks[0][1]}d` : "—"} sub="consecutive days" color="bg-chart-4/10 text-chart-4" />
      </div>

      {/* Today's progress */}
      {activeSystems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Today's Progress</CardTitle>
              <Link href="/checkins">
                <Button variant="ghost" size="sm" data-testid="link-today-checkins">
                  Check in <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{todayDone} of {todayTotal} systems done</span>
                <span className="font-semibold">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
            <div className="grid gap-2 mt-4">
              {activeSystems.slice(0, 4).map(system => {
                const checkin = todayCheckins.find(c => c.systemId === system.id);
                const statusColor = checkin?.status === "done" ? "bg-chart-3/10 text-chart-3 border-chart-3/20" :
                  checkin?.status === "partial" ? "bg-chart-4/10 text-chart-4 border-chart-4/20" :
                  "bg-muted text-muted-foreground border-transparent";
                return (
                  <div key={system.id} className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-muted/30" data-testid={`system-today-${system.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{system.title}</span>
                    </div>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${statusColor}`}>
                      {checkin?.status || "pending"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streaks + Quick Actions */}
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
                <p className="text-muted-foreground text-sm">Start checking in to build streaks!</p>
                <Link href="/checkins">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-start-streak">Start today</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topStreaks.map(([systemId, streak]) => {
                  const sys = systems.find(s => s.id === systemId);
                  return (
                    <div key={systemId} className="flex items-center justify-between gap-3">
                      <span className="text-sm truncate">{sys?.title || "Unknown"}</span>
                      <div className="flex items-center gap-1 text-chart-4 font-semibold flex-shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-sm">{streak as number} days</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/goals">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="quick-action-goals">
                <Plus className="w-4 h-4" />
                Create a new goal
              </Button>
            </Link>
            <Link href="/systems/new">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="quick-action-systems">
                <Zap className="w-4 h-4" />
                Build a new system
              </Button>
            </Link>
            <Link href="/checkins">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="quick-action-checkins">
                <CheckSquare className="w-4 h-4" />
                Check in for today
              </Button>
            </Link>
            <Link href="/journal">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="quick-action-journal">
                <BookOpen className="w-4 h-4" />
                Write a journal entry
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
              <CardTitle className="text-base">Active Goals</CardTitle>
              <Link href="/goals">
                <Button variant="ghost" size="sm" data-testid="link-all-goals">See all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {activeGoals.slice(0, 4).map(goal => (
                <div key={goal.id} className="p-3 rounded-md bg-muted/30 border border-border/50" data-testid={`goal-card-${goal.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{goal.title}</p>
                    <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">{goal.priority}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">{goal.category}</Badge>
                    {goal.deadline && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(goal.deadline), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {activeGoals.length === 0 && activeSystems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Your journey starts here</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create your first goal and build a system around it. One small action, done consistently, changes everything.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/goals">
                <Button data-testid="button-create-first-goal">Create a Goal</Button>
              </Link>
              <Link href="/systems/new">
                <Button variant="outline" data-testid="button-create-first-system">Build a System</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
