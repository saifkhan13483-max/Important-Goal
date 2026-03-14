import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { System, Goal, Checkin } from "@/types/schema";
import { getSystems } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { getCheckins } from "@/services/checkins.service";
import { computeAnalytics } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Flame, Target, Zap, TrendingUp, BarChart2, Calendar } from "lucide-react";
import { format } from "date-fns";

function MetricCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-popover-border rounded-md p-3 text-sm shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

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

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const analytics = computeAnalytics(checkins, systems, goals);
  const { streaks, last30Days, categoryBreakdown } = analytics;

  const topStreaks = Object.entries(streaks)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  const avgCompletion = last30Days.length > 0 && last30Days.some((d: any) => d.total > 0)
    ? Math.round(
        last30Days.filter((d: any) => d.total > 0)
          .reduce((sum: number, d: any) => sum + (d.done / d.total) * 100, 0) /
        last30Days.filter((d: any) => d.total > 0).length
      )
    : 0;

  const chartData = last30Days.slice(-14).map((d: any) => ({
    date: format(new Date(d.date), "MMM d"),
    Done: d.done,
    Total: d.total,
    "Completion %": d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
  }));

  const categoryData = Object.entries(categoryBreakdown).map(([cat, count]) => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    Goals: count as number,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track your consistency and growth</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Target} label="Total Goals" value={analytics.totalGoals} sub={`${analytics.activeGoals} active`} color="bg-primary/10 text-primary" />
        <MetricCard icon={Zap} label="Total Systems" value={analytics.totalSystems} sub={`${analytics.activeSystems} active`} color="bg-chart-2/10 text-chart-2" />
        <MetricCard icon={Calendar} label="Total Check-ins" value={analytics.totalCheckins} sub="all time" color="bg-chart-3/10 text-chart-3" />
        <MetricCard icon={TrendingUp} label="Avg Completion" value={`${avgCompletion}%`} sub="last 30 days" color="bg-chart-4/10 text-chart-4" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            14-Day Check-in History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 || chartData.every((d: any) => d.Total === 0) ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No data yet — start checking in daily!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Done" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Total" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Completion Rate Trend (%)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No data yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-chart-4" />
              Current Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStreaks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active streaks yet. Keep checking in!</p>
            ) : (
              <div className="space-y-3">
                {topStreaks.map(([systemId, streak]) => {
                  const sys = systems.find(s => s.id === systemId);
                  return (
                    <div key={systemId} className="flex items-center justify-between gap-3" data-testid={`streak-${systemId}`}>
                      <span className="text-sm truncate">{sys?.title || "Unknown"}</span>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Goals by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Create goals to see categories.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={categoryData} layout="vertical" barSize={12}>
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Goals" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
