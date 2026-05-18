export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "checkin" | "goal" | "system" | "journal" | "social" | "special";
  condition: (stats: AchievementStats) => boolean;
  xp: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export interface AchievementStats {
  totalCheckins: number;
  doneCheckins: number;
  bestStreak: number;
  currentStreak: number;
  totalGoals: number;
  completedGoals: number;
  totalSystems: number;
  activeSystems: number;
  totalJournalEntries: number;
  totalDaysActive: number;
  referralCount: number;
  hasAccountabilityPartner: boolean;
  consecutivePerfectDays: number;
  totalAchievements: number;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_checkin",
    title: "First Step",
    description: "Complete your very first check-in",
    icon: "✅",
    category: "checkin",
    tier: "bronze",
    xp: 50,
    condition: s => s.doneCheckins >= 1,
  },
  {
    id: "checkin_10",
    title: "Getting Consistent",
    description: "Complete 10 check-ins",
    icon: "🎯",
    category: "checkin",
    tier: "bronze",
    xp: 100,
    condition: s => s.doneCheckins >= 10,
  },
  {
    id: "checkin_50",
    title: "Habit Builder",
    description: "Complete 50 check-ins",
    icon: "🏗️",
    category: "checkin",
    tier: "silver",
    xp: 250,
    condition: s => s.doneCheckins >= 50,
  },
  {
    id: "checkin_100",
    title: "Centurion",
    description: "Complete 100 check-ins",
    icon: "💯",
    category: "checkin",
    tier: "gold",
    xp: 500,
    condition: s => s.doneCheckins >= 100,
  },
  {
    id: "checkin_500",
    title: "Relentless",
    description: "Complete 500 check-ins",
    icon: "⚡",
    category: "checkin",
    tier: "platinum",
    xp: 2000,
    condition: s => s.doneCheckins >= 500,
  },
  {
    id: "streak_3",
    title: "On a Roll",
    description: "Reach a 3-day streak",
    icon: "🔥",
    category: "streak",
    tier: "bronze",
    xp: 75,
    condition: s => s.bestStreak >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    description: "Reach a 7-day streak",
    icon: "🗓️",
    category: "streak",
    tier: "bronze",
    xp: 150,
    condition: s => s.bestStreak >= 7,
  },
  {
    id: "streak_14",
    title: "Two-Week Champion",
    description: "Reach a 14-day streak",
    icon: "🏆",
    category: "streak",
    tier: "silver",
    xp: 300,
    condition: s => s.bestStreak >= 14,
  },
  {
    id: "streak_30",
    title: "Monthly Master",
    description: "Reach a 30-day streak",
    icon: "🌟",
    category: "streak",
    tier: "gold",
    xp: 750,
    condition: s => s.bestStreak >= 30,
  },
  {
    id: "streak_100",
    title: "Legend",
    description: "Reach a 100-day streak",
    icon: "👑",
    category: "streak",
    tier: "platinum",
    xp: 3000,
    condition: s => s.bestStreak >= 100,
  },
  {
    id: "first_goal",
    title: "Dream Big",
    description: "Create your first goal",
    icon: "🎪",
    category: "goal",
    tier: "bronze",
    xp: 50,
    condition: s => s.totalGoals >= 1,
  },
  {
    id: "goal_completed",
    title: "Goal Crusher",
    description: "Complete your first goal",
    icon: "🎊",
    category: "goal",
    tier: "silver",
    xp: 400,
    condition: s => s.completedGoals >= 1,
  },
  {
    id: "first_system",
    title: "System Builder",
    description: "Create your first habit system",
    icon: "⚙️",
    category: "system",
    tier: "bronze",
    xp: 50,
    condition: s => s.totalSystems >= 1,
  },
  {
    id: "systems_3",
    title: "Multi-Tasker",
    description: "Run 3 active systems simultaneously",
    icon: "🔄",
    category: "system",
    tier: "silver",
    xp: 200,
    condition: s => s.activeSystems >= 3,
  },
  {
    id: "first_journal",
    title: "Reflective Mind",
    description: "Write your first journal entry",
    icon: "📝",
    category: "journal",
    tier: "bronze",
    xp: 50,
    condition: s => s.totalJournalEntries >= 1,
  },
  {
    id: "journal_10",
    title: "Deep Thinker",
    description: "Write 10 journal entries",
    icon: "🧠",
    category: "journal",
    tier: "silver",
    xp: 200,
    condition: s => s.totalJournalEntries >= 10,
  },
  {
    id: "journal_30",
    title: "Philosopher",
    description: "Write 30 journal entries",
    icon: "📚",
    category: "journal",
    tier: "gold",
    xp: 500,
    condition: s => s.totalJournalEntries >= 30,
  },
  {
    id: "accountability_partner",
    title: "Better Together",
    description: "Link up with an accountability partner",
    icon: "🤝",
    category: "social",
    tier: "silver",
    xp: 200,
    condition: s => s.hasAccountabilityPartner,
  },
  {
    id: "referral_1",
    title: "Spread the Word",
    description: "Refer your first friend to Strivo",
    icon: "📣",
    category: "social",
    tier: "silver",
    xp: 250,
    condition: s => s.referralCount >= 1,
  },
  {
    id: "referral_5",
    title: "Strivo Ambassador",
    description: "Refer 5 friends to Strivo",
    icon: "🚀",
    category: "social",
    tier: "gold",
    xp: 1000,
    condition: s => s.referralCount >= 5,
  },
  {
    id: "perfect_week",
    title: "Perfect Week",
    description: "Complete all check-ins every day for 7 consecutive days",
    icon: "💎",
    category: "special",
    tier: "gold",
    xp: 600,
    condition: s => s.consecutivePerfectDays >= 7,
  },
  {
    id: "active_30_days",
    title: "Committed",
    description: "Be active on Strivo for 30 days",
    icon: "🌱",
    category: "special",
    tier: "silver",
    xp: 300,
    condition: s => s.totalDaysActive >= 30,
  },
  {
    id: "collector",
    title: "Achievement Hunter",
    description: "Unlock 10 achievements",
    icon: "🎖️",
    category: "special",
    tier: "gold",
    xp: 500,
    condition: s => s.totalAchievements >= 10,
  },
];

export const TIER_COLORS: Record<Achievement["tier"], string> = {
  bronze: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  silver: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700",
  gold: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  platinum: "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
};

export const TIER_LABEL: Record<Achievement["tier"], string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export function computeAchievements(
  stats: AchievementStats,
  alreadyUnlocked: string[] = [],
): { unlocked: Achievement[]; newlyUnlocked: Achievement[] } {
  const unlocked: Achievement[] = [];
  const newlyUnlocked: Achievement[] = [];

  const statsWithCount = { ...stats, totalAchievements: alreadyUnlocked.length };

  for (const achievement of ALL_ACHIEVEMENTS) {
    if (achievement.condition(statsWithCount)) {
      unlocked.push(achievement);
      if (!alreadyUnlocked.includes(achievement.id)) {
        newlyUnlocked.push(achievement);
      }
    }
  }

  return { unlocked, newlyUnlocked };
}

export function computeTotalXP(unlockedIds: string[]): number {
  return ALL_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).reduce((sum, a) => sum + a.xp, 0);
}
