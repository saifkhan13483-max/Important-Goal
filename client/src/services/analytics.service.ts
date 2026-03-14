import type { Checkin, System, Goal } from "@/types/schema";
import { startOfWeek, startOfMonth, format, subWeeks, subMonths } from "date-fns";

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

export interface PeriodDataPoint {
  label: string;
  Done: number;
  Total: number;
  "Completion %": number;
}

export interface AnalyticsData {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalSystems: number;
  activeSystems: number;
  totalCheckins: number;
  /** Current consecutive streak per system (days from today backwards) */
  streaks: Record<string, number>;
  /** Best-ever consecutive streak per system */
  bestStreaks: Record<string, number>;
  /** Top best-ever streak across all systems */
  topBestStreak: number;
  last30Days: { date: string; done: number; total: number }[];
  /** 14-day daily chart data */
  dailyChart: PeriodDataPoint[];
  /** 8-week weekly chart data */
  weeklyChart: PeriodDataPoint[];
  /** 6-month monthly chart data */
  monthlyChart: PeriodDataPoint[];
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
  const activeSystems = systems.filter(s => s.active);

  /* ── Current streaks ── */
  const streaks: Record<string, number> = {};
  const bestStreaks: Record<string, number> = {};

  for (const system of systems) {
    const doneCheckins = checkins
      .filter(c => c.systemId === system.id && c.status === "done")
      .map(c => c.dateKey)
      .sort((a, b) => b.localeCompare(a));

    const doneSet = new Set(doneCheckins);

    /* Current streak — count backwards from today */
    let current = 0;
    const cur = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = cur.toISOString().split("T")[0];
      if (doneSet.has(key)) {
        current++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    streaks[system.id] = current;

    /* Best-ever streak — scan the full sorted list */
    let best = 0;
    let run  = 0;
    let prev: string | null = null;
    for (const dateKey of Array.from(doneSet).sort()) {
      if (prev === null) {
        run = 1;
      } else {
        const prevDate: Date = new Date(prev as string);
        prevDate.setDate(prevDate.getDate() + 1);
        if (prevDate.toISOString().split("T")[0] === dateKey) {
          run++;
        } else {
          run = 1;
        }
      }
      if (run > best) best = run;
      prev = dateKey;
    }
    /* Also compare with current (streak may not have ended yet) */
    if (current > best) best = current;
    bestStreaks[system.id] = best;
  }

  const topBestStreak = Math.max(0, ...Object.values(bestStreaks));

  /* ── Last 30 days raw ── */
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

  /* ── Daily chart (last 14 days) ── */
  const dailyChart: PeriodDataPoint[] = last30Days.slice(-14).map(d => ({
    label: format(new Date(d.date), "MMM d"),
    Done: d.done,
    Total: d.total,
    "Completion %": d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
  }));

  /* ── Weekly chart (last 8 weeks) ── */
  const weeklyChart: PeriodDataPoint[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = startOfWeek(subWeeks(new Date(), w), { weekStartsOn: 1 });
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const label = format(weekStart, "MMM d");
    let done = 0;
    let total = 0;
    const cur = new Date(weekStart);
    while (cur <= weekEnd && cur <= new Date()) {
      const dk = cur.toISOString().split("T")[0];
      const dayC = checkins.filter(c => c.dateKey === dk);
      done  += dayC.filter(c => c.status === "done").length;
      total += activeSystems.length;
      cur.setDate(cur.getDate() + 1);
    }
    weeklyChart.push({
      label,
      Done: done,
      Total: total,
      "Completion %": total > 0 ? Math.round((done / total) * 100) : 0,
    });
  }

  /* ── Monthly chart (last 6 months) ── */
  const monthlyChart: PeriodDataPoint[] = [];
  for (let m = 5; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(new Date(), m));
    const label      = format(monthStart, "MMM yyyy");
    const monthStr   = format(monthStart, "yyyy-MM");
    const monthC     = checkins.filter(c => c.dateKey.startsWith(monthStr));
    const done       = monthC.filter(c => c.status === "done").length;
    /* Calculate how many "system-days" are in this month up to today */
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const cappedDays  = m === 0
      ? new Date().getDate()
      : daysInMonth;
    const total = activeSystems.length * cappedDays;
    monthlyChart.push({
      label,
      Done: done,
      Total: total,
      "Completion %": total > 0 ? Math.round((done / total) * 100) : 0,
    });
  }

  /* ── Category breakdown ── */
  const categoryBreakdown = goals.reduce((acc: Record<string, number>, g) => {
    acc[g.category] = (acc[g.category] || 0) + 1;
    return acc;
  }, {});

  /* ── Per-system stats ── */
  const systemStats: SystemStat[] = systems.map(system => {
    const sc      = checkins.filter(c => c.systemId === system.id);
    const done    = sc.filter(c => c.status === "done").length;
    const missed  = sc.filter(c => c.status === "missed").length;
    const total   = sc.length;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
    return { systemId: system.id, title: system.title, doneCount: done, missedCount: missed, totalCheckins: total, pct };
  }).filter(s => s.totalCheckins > 0);

  /* ── Per-goal completion ── */
  const goalCompletion: GoalCompletion[] = goals.map(goal => {
    const linked = systems.filter(s => s.goalId === goal.id);
    if (!linked.length) return null;
    const pcts   = linked.map(sys => {
      const sc   = checkins.filter(c => c.systemId === sys.id);
      const done = sc.filter(c => c.status === "done").length;
      return sc.length > 0 ? (done / sc.length) * 100 : 0;
    });
    return {
      goalId:      goal.id,
      title:       goal.title,
      systemCount: linked.length,
      avgPct:      Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
    };
  }).filter(Boolean) as GoalCompletion[];

  return {
    totalGoals:      goals.length,
    activeGoals:     goals.filter(g => g.status === "active").length,
    completedGoals:  goals.filter(g => g.status === "completed").length,
    totalSystems:    systems.length,
    activeSystems:   activeSystems.length,
    totalCheckins:   checkins.length,
    streaks,
    bestStreaks,
    topBestStreak,
    last30Days,
    dailyChart,
    weeklyChart,
    monthlyChart,
    categoryBreakdown,
    systemStats,
    goalCompletion,
  };
}
