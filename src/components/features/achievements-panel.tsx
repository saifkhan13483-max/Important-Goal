import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Trophy, Lock, Star } from "lucide-react";
import {
  ALL_ACHIEVEMENTS,
  TIER_COLORS,
  TIER_LABEL,
  computeTotalXP,
  type AchievementStats,
} from "@/lib/achievements";

interface AchievementsPanelProps {
  stats: AchievementStats;
  unlockedIds: string[];
  compact?: boolean;
}

export function AchievementsPanel({ stats, unlockedIds, compact = false }: AchievementsPanelProps) {
  const categories = useMemo(() => {
    const cats = new Map<string, typeof ALL_ACHIEVEMENTS>();
    for (const a of ALL_ACHIEVEMENTS) {
      if (!cats.has(a.category)) cats.set(a.category, []);
      cats.get(a.category)!.push(a);
    }
    return cats;
  }, []);

  const totalXP = computeTotalXP(unlockedIds);
  const totalPossible = ALL_ACHIEVEMENTS.reduce((s, a) => s + a.xp, 0);
  const pct = Math.round((unlockedIds.length / ALL_ACHIEVEMENTS.length) * 100);

  const categoryLabels: Record<string, string> = {
    checkin: "Check-ins",
    streak: "Streaks",
    goal: "Goals",
    system: "Systems",
    journal: "Journal",
    social: "Social",
    special: "Special",
  };

  if (compact) {
    const recent = ALL_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).slice(0, 6);
    return (
      <div data-testid="achievements-compact">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold text-sm">{unlockedIds.length} / {ALL_ACHIEVEMENTS.length} Achievements</span>
          </div>
          <span className="text-xs text-muted-foreground">{totalXP} XP</span>
        </div>
        <Progress value={pct} className="h-1.5 mb-3" />
        <div className="flex flex-wrap gap-2">
          {recent.map(a => (
            <span key={a.id} title={`${a.title}: ${a.description}`} className="text-lg cursor-help">{a.icon}</span>
          ))}
          {unlockedIds.length === 0 && (
            <p className="text-xs text-muted-foreground">Complete check-ins to earn your first achievement!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="achievements-panel">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">{unlockedIds.length} of {ALL_ACHIEVEMENTS.length} unlocked</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-sm font-bold">{totalXP.toLocaleString()} XP</span>
              <span className="text-xs text-muted-foreground">/ {totalPossible.toLocaleString()}</span>
            </div>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">{pct}% complete</p>
        </CardContent>
      </Card>

      {[...categories.entries()].map(([cat, achievements]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-0.5">
            {categoryLabels[cat] ?? cat}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map(achievement => {
              const isUnlocked = unlockedIds.includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-xl border transition-all",
                    isUnlocked
                      ? TIER_COLORS[achievement.tier]
                      : "bg-muted/30 border-muted text-muted-foreground opacity-60",
                  )}
                  data-testid={`achievement-${achievement.id}`}
                >
                  <div className="text-2xl flex-shrink-0">
                    {isUnlocked ? achievement.icon : <Lock className="w-5 h-5 mt-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{achievement.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {TIER_LABEL[achievement.tier]}
                      </Badge>
                      {isUnlocked && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-700 dark:text-yellow-400">
                          +{achievement.xp} XP
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed">{achievement.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
