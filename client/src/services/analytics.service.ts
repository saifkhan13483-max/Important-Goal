import type { Checkin, System, Goal } from "@/types/schema";
import { startOfWeek, startOfMonth, format, subWeeks, subMonths, getDay } from "date-fns";

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

export interface DayOfWeekStat {
  day: string;
  shortDay: string;
  doneCount: number;
  totalCount: number;
  doneRate: number;
}

export interface MoodBucket {
  mood: number;
  label: string;
  completionPct: number;
  count: number;
}

export interface DifficultyBucket {
  difficulty: number;
  label: string;
  completionPct: number;
  count: number;
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
  /** % of last 30 days completed per system (0-100) */
  consistencyScores: Record<string, number>;
  /** Count of "done" days in last 7 days per system (0-7) */
  weeklyVotes: Record<string, number>;
  /** Current streak since last significant gap per system */
  comebackStreaks: Record<string, number>;
  /** Overall resilience score per system (0-100): rewards returning after a miss */
  resilienceScores: Record<string, number>;
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
  /** Day-of-week completion patterns (Mon–Sun) */
  dayOfWeekStats: DayOfWeekStat[];
  /** Mood (1-5) vs completion rate */
  moodBuckets: MoodBucket[];
  /** Difficulty (1-5) vs completion rate */
  difficultyBuckets: DifficultyBucket[];
  /** Whether there is enough mood/difficulty data to show correlations */
  hasMoodData: boolean;
  hasDifficultyData: boolean;
}

export function computeAnalytics(
  checkins: Checkin[],
  systems: System[],
  goals: Goal[],
): AnalyticsData {
  const today = getTodayKey();
  const activeSystems = systems.filter(s => s.active !== false);

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

  /* ── Consistency scores (% of last 30 days done) ── */
  const consistencyScores: Record<string, number> = {};
  const weeklyVotes: Record<string, number> = {};
  const comebackStreaks: Record<string, number> = {};
  const resilienceScores: Record<string, number> = {};

  for (const system of systems) {
    const doneSet = new Set(
      checkins
        .filter(c => c.systemId === system.id && c.status === "done")
        .map(c => c.dateKey),
    );

    /* Consistency: % of last 30 days done */
    let doneLast30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (doneSet.has(d.toISOString().split("T")[0])) doneLast30++;
    }
    consistencyScores[system.id] = Math.round((doneLast30 / 30) * 100);

    /* Weekly votes: # done days in last 7 */
    let doneLast7 = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (doneSet.has(d.toISOString().split("T")[0])) doneLast7++;
    }
    weeklyVotes[system.id] = doneLast7;

    /* Comeback streak: consecutive done days counting from the most recent
       done day, allowing up to 1 gap in the past 60 days */
    let comebackRun = streaks[system.id]; // starts from current streak
    if (comebackRun === 0) {
      // Find the latest done day and count from there
      const sortedDone = Array.from(doneSet).sort((a, b) => b.localeCompare(a));
      if (sortedDone.length > 0) {
        let run = 1;
        for (let i = 1; i < sortedDone.length; i++) {
          const prev = new Date(sortedDone[i - 1]);
          prev.setDate(prev.getDate() - 1);
          if (prev.toISOString().split("T")[0] === sortedDone[i]) {
            run++;
          } else {
            break;
          }
        }
        comebackRun = run;
      }
    }
    comebackStreaks[system.id] = comebackRun;

    /* Resilience score: rewards consistency AND recovering after misses.
       Formula: (consistency % × 0.6) + (comeback streak normalized × 0.4)
       Comeback normalized: min(comebackRun, 14) / 14 × 100 */
    const comebackNorm = Math.min(comebackRun, 14) / 14 * 100;
    resilienceScores[system.id] = Math.round(
      consistencyScores[system.id] * 0.6 + comebackNorm * 0.4,
    );
  }

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

  /* ── Day-of-week completion patterns ── */
  const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Reorder to start Monday
  const MON_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon=1, Tue=2, ..., Sun=0

  const dowDone:  Record<number, number> = {};
  const dowTotal: Record<number, number> = {};
  for (let d = 0; d < 7; d++) { dowDone[d] = 0; dowTotal[d] = 0; }

  for (const c of checkins) {
    const d = getDay(new Date(c.dateKey + "T12:00:00")); // 0=Sun … 6=Sat
    dowTotal[d]++;
    if (c.status === "done") dowDone[d]++;
  }

  const dayOfWeekStats: DayOfWeekStat[] = MON_FIRST_ORDER.map(d => ({
    day: DOW_NAMES[d],
    shortDay: DOW_SHORT[d],
    doneCount: dowDone[d],
    totalCount: dowTotal[d],
    doneRate: dowTotal[d] > 0 ? Math.round((dowDone[d] / dowTotal[d]) * 100) : 0,
  }));

  /* ── Mood vs completion ── */
  const moodMap: Record<number, { done: number; total: number }> = {};
  for (let i = 1; i <= 5; i++) moodMap[i] = { done: 0, total: 0 };

  for (const c of checkins) {
    const mood = c.moodBefore;
    if (mood && mood >= 1 && mood <= 5) {
      moodMap[mood].total++;
      if (c.status === "done") moodMap[mood].done++;
    }
  }

  const moodLabels: Record<number, string> = { 1: "Very Low", 2: "Low", 3: "Neutral", 4: "Good", 5: "Great" };
  const moodBuckets: MoodBucket[] = [1, 2, 3, 4, 5].map(m => ({
    mood: m,
    label: moodLabels[m],
    completionPct: moodMap[m].total > 0 ? Math.round((moodMap[m].done / moodMap[m].total) * 100) : 0,
    count: moodMap[m].total,
  }));
  const hasMoodData = moodBuckets.some(b => b.count >= 2);

  /* ── Difficulty vs completion ── */
  const diffMap: Record<number, { done: number; total: number }> = {};
  for (let i = 1; i <= 5; i++) diffMap[i] = { done: 0, total: 0 };

  for (const c of checkins) {
    const diff = c.difficulty;
    if (diff && diff >= 1 && diff <= 5) {
      diffMap[diff].total++;
      if (c.status === "done") diffMap[diff].done++;
    }
  }

  const diffLabels: Record<number, string> = { 1: "Very Easy", 2: "Easy", 3: "Moderate", 4: "Hard", 5: "Very Hard" };
  const difficultyBuckets: DifficultyBucket[] = [1, 2, 3, 4, 5].map(d => ({
    difficulty: d,
    label: diffLabels[d],
    completionPct: diffMap[d].total > 0 ? Math.round((diffMap[d].done / diffMap[d].total) * 100) : 0,
    count: diffMap[d].total,
  }));
  const hasDifficultyData = difficultyBuckets.some(b => b.count >= 2);

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
    consistencyScores,
    weeklyVotes,
    comebackStreaks,
    resilienceScores,
    last30Days,
    dailyChart,
    weeklyChart,
    monthlyChart,
    categoryBreakdown,
    systemStats,
    goalCompletion,
    dayOfWeekStats,
    moodBuckets,
    difficultyBuckets,
    hasMoodData,
    hasDifficultyData,
  };
}

/** Compute a system health score (0-100) based on checkin history and system completeness */
export function computeSystemHealthScore(
  system: System,
  checkins: Checkin[],
  streak: number,
): { score: number; label: string; color: string } {
  const sc      = checkins.filter(c => c.systemId === system.id);
  const done    = sc.filter(c => c.status === "done").length;
  const total   = sc.length;
  const pct     = total > 0 ? (done / total) * 100 : 0;

  // Completeness: how many of the 5 key fields are filled
  const keyFields = [
    system.identityStatement,
    system.triggerStatement,
    system.minimumAction,
    system.rewardPlan,
    system.fallbackPlan,
  ];
  const filled      = keyFields.filter(f => f && f.trim().length > 0).length;
  const completeness = (filled / 5) * 100;

  // Streak bonus — up to 21 days for max bonus
  const streakBonus = Math.min(streak, 21) / 21 * 100;

  // Weighted score
  const rawScore = (pct * 0.5) + (completeness * 0.3) + (streakBonus * 0.2);
  const score    = Math.round(Math.min(100, rawScore));

  let label: string;
  let color: string;
  if (total === 0) {
    label = "New";
    color = "text-muted-foreground";
  } else if (score >= 75) {
    label = "Strong";
    color = "text-chart-3";
  } else if (score >= 50) {
    label = "Building";
    color = "text-chart-4";
  } else {
    label = "Needs attention";
    color = "text-destructive";
  }

  return { score, label, color };
}
