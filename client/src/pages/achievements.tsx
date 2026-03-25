import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { getSystems } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { getCheckins } from "@/services/checkins.service";
import { getJournals } from "@/services/journal.service";
import { updateUser } from "@/services/user.service";
import { addNotification } from "@/services/notifications.service";
import type { System, Goal, Checkin, JournalEntry } from "@/types/schema";
import { AchievementsPanel } from "@/components/achievements-panel";
import { computeAchievements, type AchievementStats } from "@/lib/achievements";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLogo } from "@/components/site-logo";
import { Separator } from "@/components/ui/separator";
import { Helmet } from "react-helmet-async";
import { AnimatedPage } from "@/components/animated-page";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export default function AchievementsPage() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const notifiedRef = useRef(false);

  const { data: systems = [], isLoading: loadingSystems } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const { data: checkins = [], isLoading: loadingCheckins } = useQuery<Checkin[]>({
    queryKey: ["checkins-all", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const { data: journals = [], isLoading: loadingJournals } = useQuery<JournalEntry[]>({
    queryKey: ["journals", userId],
    queryFn: () => getJournals(userId),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: async (newIds: string[]) => {
      await updateUser(userId, { unlockedAchievements: newIds });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const isLoading = loadingSystems || loadingGoals || loadingCheckins || loadingJournals;

  const stats: AchievementStats = useMemo(() => {
    const doneCheckins = checkins.filter(c => c.status === "done");
    const dateKeys = [...new Set(doneCheckins.map(c => c.dateKey))].sort();

    let bestStreak = 0;
    let currentStreak = 0;
    let s = 1;
    for (let i = 1; i < dateKeys.length; i++) {
      const prev = new Date(dateKeys[i - 1]);
      const curr = new Date(dateKeys[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        s++;
        if (s > bestStreak) bestStreak = s;
      } else {
        s = 1;
      }
    }
    if (s > bestStreak) bestStreak = s;
    if (dateKeys.length === 1) bestStreak = 1;

    const today = new Date().toISOString().slice(0, 10);
    const lastDay = dateKeys[dateKeys.length - 1];
    if (lastDay === today || lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      let cs = 1;
      for (let i = dateKeys.length - 2; i >= 0; i--) {
        const prev = new Date(dateKeys[i]);
        const curr = new Date(dateKeys[i + 1]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (diff === 1) cs++;
        else break;
      }
      currentStreak = cs;
    }

    let consecutivePerfectDays = 0;
    const uniqueDates = [...new Set(checkins.map(c => c.dateKey))].sort();
    const systemsPerDate = new Map<string, { done: number; total: number }>();
    for (const c of checkins) {
      const entry = systemsPerDate.get(c.dateKey) ?? { done: 0, total: 0 };
      entry.total++;
      if (c.status === "done") entry.done++;
      systemsPerDate.set(c.dateKey, entry);
    }
    let maxPerfect = 0;
    let curPerfect = 0;
    for (const dk of uniqueDates) {
      const entry = systemsPerDate.get(dk);
      if (entry && entry.total > 0 && entry.done === entry.total) {
        curPerfect++;
        if (curPerfect > maxPerfect) maxPerfect = curPerfect;
      } else {
        curPerfect = 0;
      }
    }
    consecutivePerfectDays = maxPerfect;

    const firstDate = user?.createdAt ? new Date(user.createdAt) : new Date();
    const daysSince = Math.floor((Date.now() - firstDate.getTime()) / 86400000);

    return {
      totalCheckins: checkins.length,
      doneCheckins: doneCheckins.length,
      bestStreak,
      currentStreak,
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.status === "completed").length,
      totalSystems: systems.length,
      activeSystems: systems.filter(s => s.active !== false).length,
      totalJournalEntries: journals.length,
      totalDaysActive: Math.min(daysSince, uniqueDates.length),
      referralCount: user?.referralCount ?? 0,
      hasAccountabilityPartner: !!(user?.accountabilityPartnerId),
      consecutivePerfectDays,
      totalAchievements: user?.unlockedAchievements?.length ?? 0,
    };
  }, [checkins, goals, systems, journals, user]);

  const unlockedIds = user?.unlockedAchievements ?? [];

  useEffect(() => {
    if (isLoading || !userId || notifiedRef.current) return;
    const { newlyUnlocked } = computeAchievements(stats, unlockedIds);
    if (newlyUnlocked.length === 0) return;

    notifiedRef.current = true;
    const newIds = [...unlockedIds, ...newlyUnlocked.map(a => a.id)];
    saveMutation.mutate(newIds);

    for (const a of newlyUnlocked) {
      addNotification(userId, {
        type: "achievement",
        title: `Achievement Unlocked: ${a.title}`,
        message: a.description,
        href: "/achievements",
      });
      toast({
        title: `🏆 Achievement Unlocked!`,
        description: `${a.icon} ${a.title} — ${a.description}`,
      });
    }
  }, [isLoading, stats, unlockedIds, userId]);

  return (
    <AnimatedPage>
      <div className="min-h-full bg-background">
        <Helmet>
          <title>Achievements | Strivo</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="border-b border-border bg-background/95 sticky top-0 z-10 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <SiteLogo className="h-6" />
            <Separator orientation="vertical" className="h-4" />
            <h1 className="text-sm font-semibold">Achievements</h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <AchievementsPanel stats={stats} unlockedIds={unlockedIds} />
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
