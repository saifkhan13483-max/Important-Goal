import type { Checkin, System, Goal } from "@/types/schema";

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export interface SystemStat {
  systemId: string;
  title: string;
  doneCount: number;
  missedCount: number;
  totalCheckins: number;
  pct: number;
}

export interface GoalCompletion {
  goalId: string;
  title: string;
  systemCount: number;
  avgPct: number;
}

export interface AnalyticsData {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalSystems: number;
  activeSystems: number;
  totalCheckins: number;
  streaks: Record<string, number>;
  last30Days: { date: string; done: number; total: number }[];
  categoryBreakdown: Record<string, number>;
  systemStats: SystemStat[];
  goalCompletion: GoalCompletion[];
}

export function computeAnalytics(
  checkins: Checkin[],
  systems: System[],
  goals: Goal[],
): AnalyticsData {
  const today = getTodayKey();
  const streaks: Record<string, number> = {};

  for (const system of systems) {
    const systemCheckins = checkins
      .filter(c => c.systemId === system.id && c.status === "done")
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    let streak = 0;
    const checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const dateKey = checkDate.toISOString().split("T")[0];
      const found = systemCheckins.find(c => c.dateKey === dateKey);
      if (found) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    streaks[system.id] = streak;
  }

  const activeSystems = systems.filter(s => s.active);

  const last30Days: { date: string; done: number; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    const dayCheckins = checkins.filter(c => c.dateKey === dateKey);
    last30Days.push({
      date: dateKey,
      done: dayCheckins.filter(c => c.status === "done").length,
      total: activeSystems.length,
    });
  }

  const categoryBreakdown = goals.reduce((acc: Record<string, number>, g) => {
    acc[g.category] = (acc[g.category] || 0) + 1;
    return acc;
  }, {});

  const systemStats: SystemStat[] = systems.map(system => {
    const sc = checkins.filter(c => c.systemId === system.id);
    const done = sc.filter(c => c.status === "done").length;
    const missed = sc.filter(c => c.status === "missed").length;
    const total = sc.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      systemId: system.id,
      title: system.title,
      doneCount: done,
      missedCount: missed,
      totalCheckins: total,
      pct,
    };
  }).filter(s => s.totalCheckins > 0);

  const goalCompletion: GoalCompletion[] = goals.map(goal => {
    const linkedSystems = systems.filter(s => s.goalId === goal.id);
    if (linkedSystems.length === 0) return null;
    const pcts = linkedSystems.map(sys => {
      const sc = checkins.filter(c => c.systemId === sys.id);
      const done = sc.filter(c => c.status === "done").length;
      return sc.length > 0 ? (done / sc.length) * 100 : 0;
    });
    const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    return {
      goalId: goal.id,
      title: goal.title,
      systemCount: linkedSystems.length,
      avgPct,
    };
  }).filter(Boolean) as GoalCompletion[];

  return {
    totalGoals: goals.length,
    activeGoals: goals.filter(g => g.status === "active").length,
    completedGoals: goals.filter(g => g.status === "completed").length,
    totalSystems: systems.length,
    activeSystems: activeSystems.length,
    totalCheckins: checkins.length,
    streaks,
    last30Days,
    categoryBreakdown,
    systemStats,
    goalCompletion,
  };
}
