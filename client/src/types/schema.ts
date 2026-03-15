export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  identityStatement?: string | null;
  focusArea?: string | null;
  routineTime?: string | null;
  preferredTheme?: string | null;
  timezone?: string | null;
  onboardingCompleted?: boolean | null;
  createdAt?: string | null;
  reminderEnabled?: boolean | null;
  reminderTime?: string | null;
}

export interface GoalMilestone {
  month: string;
  target: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  measurableOutcome?: string | null;
  milestones?: GoalMilestone[] | null;
  category: string;
  priority: string;
  status: string;
  deadline?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface System {
  id: string;
  goalId?: string | null;
  userId: string;
  title: string;
  identityStatement?: string | null;
  targetOutcome?: string | null;
  whyItMatters?: string | null;
  triggerType?: string | null;
  triggerStatement?: string | null;
  minimumAction?: string | null;
  rewardPlan?: string | null;
  fallbackPlan?: string | null;
  frequency?: string | null;
  preferredTime?: string | null;
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Checkin {
  id: string;
  systemId: string;
  userId: string;
  dateKey: string;
  status: string;
  note?: string | null;
  moodBefore?: number | null;
  moodAfter?: number | null;
  difficulty?: number | null;
  tomorrowIntention?: string | null;
  createdAt?: string | null;
}

export interface JournalEntry {
  id: string;
  userId: string;
  goalId?: string | null;
  systemId?: string | null;
  dateKey: string;
  promptType?: string | null;
  content: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Template {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  identityStatement?: string | null;
  triggerStatement?: string | null;
  minimumAction?: string | null;
  rewardPlan?: string | null;
  fallbackPlan?: string | null;
  isPublic?: boolean | null;
}
