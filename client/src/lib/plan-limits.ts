import type { PlanTier } from "@/types/schema";

export interface PlanLimits {
  goals: number | null;
  systems: number | null;
}

export interface PlanFeatures {
  aiCoach: boolean;
  aiCoachUnlimited: boolean;
  aiCoachDailyLimit: number | null;
  advancedAnalytics: boolean;
  betterAnalytics: boolean;
  aiAnalyticsInsights: boolean;
  moodCorrelation: boolean;
  fullTemplates: boolean;
  premiumTemplates: boolean;
  customTemplates: boolean;
  advancedJournaling: boolean;
  aiJournalPrompt: boolean;
  exportReports: boolean;
  csvPdfExport: boolean;
  darkMode: boolean;
  futureSelfAudio: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  teamWorkspace: boolean;
  coachDashboard: boolean;
}

const LIMITS: Record<PlanTier, PlanLimits> = {
  free:    { goals: 2,    systems: 3    },
  starter: { goals: 10,   systems: null },
  pro:     { goals: null, systems: null },
  elite:   { goals: null, systems: null },
};

const FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    aiCoach: false,
    aiCoachUnlimited: false,
    aiCoachDailyLimit: 0,
    advancedAnalytics: false,
    betterAnalytics: false,
    aiAnalyticsInsights: false,
    moodCorrelation: false,
    fullTemplates: false,
    premiumTemplates: false,
    customTemplates: false,
    advancedJournaling: false,
    aiJournalPrompt: false,
    exportReports: false,
    csvPdfExport: false,
    darkMode: false,
    futureSelfAudio: false,
    prioritySupport: false,
    dedicatedSupport: false,
    teamWorkspace: false,
    coachDashboard: false,
  },
  starter: {
    aiCoach: false,
    aiCoachUnlimited: false,
    aiCoachDailyLimit: 0,
    advancedAnalytics: false,
    betterAnalytics: true,
    aiAnalyticsInsights: false,
    moodCorrelation: false,
    fullTemplates: true,
    premiumTemplates: false,
    customTemplates: false,
    advancedJournaling: true,
    aiJournalPrompt: false,
    exportReports: true,
    csvPdfExport: false,
    darkMode: true,
    futureSelfAudio: true,
    prioritySupport: false,
    dedicatedSupport: false,
    teamWorkspace: false,
    coachDashboard: false,
  },
  pro: {
    aiCoach: true,
    aiCoachUnlimited: false,
    aiCoachDailyLimit: 10,
    advancedAnalytics: true,
    betterAnalytics: true,
    aiAnalyticsInsights: true,
    moodCorrelation: true,
    fullTemplates: true,
    premiumTemplates: true,
    customTemplates: false,
    advancedJournaling: true,
    aiJournalPrompt: true,
    exportReports: true,
    csvPdfExport: true,
    darkMode: true,
    futureSelfAudio: true,
    prioritySupport: true,
    dedicatedSupport: false,
    teamWorkspace: false,
    coachDashboard: false,
  },
  elite: {
    aiCoach: true,
    aiCoachUnlimited: true,
    aiCoachDailyLimit: null,
    advancedAnalytics: true,
    betterAnalytics: true,
    aiAnalyticsInsights: true,
    moodCorrelation: true,
    fullTemplates: true,
    premiumTemplates: true,
    customTemplates: true,
    advancedJournaling: true,
    aiJournalPrompt: true,
    exportReports: true,
    csvPdfExport: true,
    darkMode: true,
    futureSelfAudio: true,
    prioritySupport: true,
    dedicatedSupport: true,
    teamWorkspace: true,
    coachDashboard: true,
  },
};

export function getPlanLimits(plan?: PlanTier | null): PlanLimits {
  return LIMITS[plan ?? "free"];
}

export function getPlanFeatures(plan?: PlanTier | null): PlanFeatures {
  return FEATURES[plan ?? "free"];
}

export function isAtGoalLimit(plan: PlanTier | null | undefined, activeGoalCount: number): boolean {
  const limit = getPlanLimits(plan).goals;
  return limit !== null && activeGoalCount >= limit;
}

export function isAtSystemLimit(plan: PlanTier | null | undefined, activeSystemCount: number): boolean {
  const limit = getPlanLimits(plan).systems;
  return limit !== null && activeSystemCount >= limit;
}

export function goalLimitLabel(plan?: PlanTier | null): string {
  const limit = getPlanLimits(plan).goals;
  return limit === null ? "Unlimited" : String(limit);
}

export function systemLimitLabel(plan?: PlanTier | null): string {
  const limit = getPlanLimits(plan).systems;
  return limit === null ? "Unlimited" : String(limit);
}

const PLAN_ORDER: PlanTier[] = ["free", "starter", "pro", "elite"];
export function planRank(plan?: PlanTier | null): number {
  return PLAN_ORDER.indexOf(plan ?? "free");
}

export function planDisplayName(plan?: PlanTier | null): string {
  const names: Record<PlanTier, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    elite: "Elite",
  };
  return names[plan ?? "free"];
}
