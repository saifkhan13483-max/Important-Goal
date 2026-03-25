export type PlanTier = "free" | "starter" | "pro" | "elite";

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
  futureAudioUrl?: string | null;
  futureAudioPlayOnFirstVisit?: boolean | null;
  futureAudioPlayAfterMissed?: boolean | null;
  futureAudioAutoplay?: boolean | null;
  futureAudioMuted?: boolean | null;
  futureAudioLabel?: string | null;
  plan?: PlanTier | null;
  planUpdatedAt?: string | null;
  stripeCustomerId?: string | null;
  workspaceId?: string | null;
  streakFreezes?: number | null;
  streakFreezeUsedDate?: string | null;
  publicProfile?: boolean | null;
  publicProfileSlug?: string | null;
  accountabilityPartnerId?: string | null;
  accountabilityPartnerEmail?: string | null;
  accountabilityPartnerName?: string | null;
  referralCode?: string | null;
  referredBy?: string | null;
  referralCount?: number | null;
  weeklyReportEnabled?: boolean | null;
  language?: string | null;
  unlockedAchievements?: string[] | null;
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
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'archived' | 'paused';
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
  stackOrder?: number | null;
  stackGroupId?: string | null;
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
  photoUrl?: string | null;
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
  mood?: number | null;
  isFavorite?: boolean | null;
  tags?: string[] | null;
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
  isPremium?: boolean | null;
}

export interface CommunityTemplate {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  category: string;
  description?: string | null;
  identityStatement?: string | null;
  triggerStatement?: string | null;
  minimumAction?: string | null;
  rewardPlan?: string | null;
  fallbackPlan?: string | null;
  upvotes: number;
  usedCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface MemberStats {
  activeSystems: number;
  bestStreak: number;
  currentStreak: number;
  completionRate: number;
  weeklyRate: number;
  last7: Array<{ dateKey: string; done: number; total: number }>;
  syncedAt?: string;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  inviteCode: string;
  memberIds: string[];
  members: WorkspaceMember[];
  memberStats: Record<string, MemberStats>;
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: "achievement" | "streak" | "partner" | "referral" | "system" | "weekly_report";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  href?: string | null;
}

export interface PublicProfileData {
  userId: string;
  name: string;
  identityStatement?: string | null;
  focusArea?: string | null;
  activeSystems: number;
  bestStreak: number;
  totalCheckins: number;
  joinedAt?: string | null;
  achievements: string[];
}
