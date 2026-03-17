import type { PlanTier } from "@/types/schema";

export interface PlanLimits {
  goals: number | null;
  systems: number | null;
}

const LIMITS: Record<PlanTier, PlanLimits> = {
  free:    { goals: 2,    systems: 3    },
  starter: { goals: 10,   systems: null },
  pro:     { goals: null, systems: null },
  elite:   { goals: null, systems: null },
};

export function getPlanLimits(plan?: PlanTier | null): PlanLimits {
  return LIMITS[plan ?? "free"];
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
