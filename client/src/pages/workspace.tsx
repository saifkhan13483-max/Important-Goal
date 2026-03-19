import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useAppStore } from "@/store/auth.store";
import { getPlanFeatures } from "@/lib/plan-limits";
import { PlanGate } from "@/components/plan-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Crown, Copy, Check, RefreshCw, UserPlus, Flame,
  Zap, LogOut, Trash2, Shield, Plus, Hash,
  BarChart2, Target, ChevronRight, Clock, Link2,
  Pencil, Trophy, TrendingUp, Activity, ArrowUpDown,
  ChevronUp, ChevronDown, Star, AlertTriangle,
  Eye, EyeOff, Handshake, Bell, CheckCircle2,
  TrendingDown, Minus, Wifi, WifiOff, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyWorkspace,
  createWorkspace,
  joinWorkspaceByCode,
  leaveWorkspace,
  removeMemberFromWorkspace,
  regenerateInviteCode,
  renameWorkspace,
  deleteWorkspace,
  syncMemberStats,
  transferOwnership,
  type MemberStats,
} from "@/services/workspace.service";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import type { Workspace, WorkspaceMember, System, Checkin } from "@/types/schema";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isRecent(iso?: string): boolean {
  if (!iso) return false;
  const diff = Date.now() - new Date(iso).getTime();
  return diff < 5 * 60 * 1000;
}

function computeStats(systems: System[], checkins: Checkin[]): MemberStats {
  const activeSystems = systems.filter((s) => s.active);
  const today = new Date().toISOString().split("T")[0];
  const totalCheckins = checkins.length;
  const doneCheckins = checkins.filter((c) => c.status === "done").length;
  const completionRate = totalCheckins > 0 ? Math.round((doneCheckins / totalCheckins) * 100) : 0;

  let bestStreak = 0;
  let currentStreak = 0;

  for (const system of activeSystems) {
    const doneSet = new Set(
      checkins.filter((c) => c.systemId === system.id && c.status === "done").map((c) => c.dateKey),
    );

    let cStreak = 0;
    const cur = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = cur.toISOString().split("T")[0];
      if (doneSet.has(key)) { cStreak++; cur.setDate(cur.getDate() - 1); } else break;
    }
    if (cStreak > currentStreak) currentStreak = cStreak;

    let systemBest = 0;
    let runStreak = 0;
    const allDates = Array.from(doneSet).sort();
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        runStreak = 1;
      } else {
        const prev = new Date(allDates[i - 1]);
        const curr = new Date(allDates[i]);
        const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (dayDiff === 1) {
          runStreak++;
        } else {
          runStreak = 1;
        }
      }
      if (runStreak > systemBest) systemBest = runStreak;
    }
    if (systemBest > bestStreak) bestStreak = systemBest;
  }

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    const dayCheckins = checkins.filter((c) => c.dateKey === dateKey);
    last7.push({ dateKey, done: dayCheckins.filter((c) => c.status === "done").length, total: activeSystems.length });
  }

  const last7Done = last7.reduce((a, d) => a + d.done, 0);
  const last7Total = last7.reduce((a, d) => a + d.total, 0);
  const weeklyRate = last7Total > 0 ? Math.round((last7Done / last7Total) * 100) : 0;

  return { activeSystems: activeSystems.length, bestStreak, currentStreak, completionRate, weeklyRate, last7 };
}

function useStatSync(userId: string, inWorkspace: boolean, workspaceId: string) {
  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId && inWorkspace,
  });
  const { data: checkins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId && inWorkspace,
  });

  const stats = useMemo(() => computeStats(systems, checkins), [systems, checkins]);

  useEffect(() => {
    if (!inWorkspace || !workspaceId || (!systems.length && !checkins.length)) return;
    syncMemberStats(workspaceId, stats).catch(() => {});
  }, [inWorkspace, workspaceId, JSON.stringify(stats)]);

  return stats;
}

function getTrendIcon(weekly: number | null | undefined) {
  if (weekly === null || weekly === undefined) return null;
  if (weekly >= 75) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (weekly >= 40) return <Minus className="w-3 h-3 text-amber-500" />;
  return <TrendingDown className="w-3 h-3 text-destructive" />;
}

function getPerformanceLabel(weekly: number | null | undefined): { label: string; color: string; bg: string } {
  if (weekly === null || weekly === undefined) return { label: "No data", color: "text-muted-foreground", bg: "bg-muted/40" };
  if (weekly >= 80) return { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" };
  if (weekly >= 60) return { label: "Good", color: "text-emerald-500", bg: "bg-emerald-500/10" };
  if (weekly >= 40) return { label: "Fair", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" };
  if (weekly >= 20) return { label: "Struggling", color: "text-orange-500", bg: "bg-orange-500/10" };
  return { label: "Needs help", color: "text-destructive", bg: "bg-destructive/10" };
}

/* ── Team summary aggregate stats ── */
function TeamSummary({
  members,
  currentUserId,
  myStats,
}: {
  members: (WorkspaceMember & { stats?: MemberStats })[];
  currentUserId: string;
  myStats: MemberStats;
}) {
  const allStats = members.map((m) =>
    m.userId === currentUserId ? myStats : m.stats,
  ).filter(Boolean) as MemberStats[];

  if (allStats.length === 0) return null;

  const totalSystems = allStats.reduce((a, s) => a + s.activeSystems, 0);
  const avgCompletion = Math.round(allStats.reduce((a, s) => a + s.completionRate, 0) / allStats.length);
  const topStreak = Math.max(...allStats.map((s) => s.currentStreak));
  const avgWeekly = Math.round(allStats.reduce((a, s) => a + s.weeklyRate, 0) / allStats.length);
  const totalBestStreak = Math.max(...allStats.map((s) => s.bestStreak));

  const summaryItems = [
    { icon: Zap, label: "Active systems", value: totalSystems, color: "text-primary", bg: "bg-primary/10" },
    { icon: TrendingUp, label: "Avg completion", value: `${avgCompletion}%`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Flame, label: "Top streak now", value: `${topStreak}d`, color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: Activity, label: "Avg this week", value: `${avgWeekly}%`, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Star, label: "All-time best", value: `${totalBestStreak}d`, color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Users, label: "Members synced", value: `${allStats.length}/${members.length}`, color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
      {summaryItems.map(({ icon: Icon, label, value, color, bg }) => (
        <Card key={label} className="border-border/50">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2", bg)}>
              <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", color)} />
            </div>
            <p className="text-lg sm:text-xl font-bold leading-none">{value}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Member card ── */
function MemberCard({
  member,
  isOwner,
  isMe,
  myStats,
  rank,
  onRemove,
  onTransferOwnership,
  canManage,
}: {
  member: WorkspaceMember & { stats?: MemberStats };
  isOwner: boolean;
  isMe: boolean;
  myStats?: MemberStats;
  rank?: number;
  onRemove?: () => void;
  onTransferOwnership?: () => void;
  canManage?: boolean;
}) {
  const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;
  const rankMedal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  const online = isRecent(stats?.syncedAt);
  const perf = getPerformanceLabel(stats?.weeklyRate);

  return (
    <Card className={cn(
      "border-border/60 transition-all hover:shadow-md hover:-translate-y-0.5",
      isMe && "border-primary/30 ring-1 ring-primary/10",
    )} data-testid={`member-card-${member.userId}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={cn(
                  "text-sm font-bold",
                  isOwner ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
                )}>
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              {rankMedal ? (
                <span className="absolute -top-1.5 -right-1.5 text-sm leading-none">{rankMedal}</span>
              ) : (
                <span className={cn(
                  "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                  online ? "bg-emerald-500" : "bg-muted-foreground/30",
                )} title={online ? "Active recently" : "Inactive"} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm truncate">{member.name}</p>
                {isOwner && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0 flex-shrink-0">
                    <Crown className="w-2.5 h-2.5 mr-0.5" /> Owner
                  </Badge>
                )}
                {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">You</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
          </div>
          {canManage && !isOwner && !isMe && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {onTransferOwnership && (
                <Button
                  variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-amber-500"
                  onClick={onTransferOwnership} title="Transfer ownership"
                  data-testid={`button-transfer-owner-${member.userId}`}
                >
                  <Handshake className="w-3.5 h-3.5" />
                </Button>
              )}
              {onRemove && (
                <Button
                  variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                  onClick={onRemove} data-testid={`button-remove-member-${member.userId}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {stats ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-base font-bold">{stats.activeSystems}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Systems</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span className="text-base font-bold">{stats.currentStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Streak</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-base font-bold">{stats.bestStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Best</p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Overall</span>
                  <span className="text-xs font-semibold">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">This week</span>
                  <span className={cn(
                    "text-xs font-semibold",
                    stats.weeklyRate >= 75 ? "text-emerald-600 dark:text-emerald-400" : stats.weeklyRate >= 40 ? "text-amber-600 dark:text-amber-400" : "text-destructive",
                  )}>{stats.weeklyRate}%</span>
                </div>
                <Progress value={stats.weeklyRate} className="h-1.5" />
              </div>
            </div>

            <div className="flex gap-1 mb-1">
              {stats.last7.map((day, i) => (
                <div
                  key={i}
                  title={`${day.dateKey}: ${day.done}/${day.total}`}
                  className={cn(
                    "flex-1 h-5 rounded-sm",
                    day.total === 0 ? "bg-muted/30" : day.done === 0 ? "bg-destructive/20" : day.done >= day.total ? "bg-emerald-500/70" : "bg-amber-400/60",
                  )}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">Last 7 days</p>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", perf.bg, perf.color)}>
                  {perf.label}
                </span>
                {stats.syncedAt && (
                  <p className={cn(
                    "text-[10px] flex items-center gap-0.5",
                    online ? "text-emerald-500" : "text-muted-foreground",
                  )}>
                    <Clock className="w-2.5 h-2.5" /> {formatRelativeTime(stats.syncedAt)}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-5 rounded-xl bg-muted/20 border border-dashed border-border/50">
            <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Stats appear once {isMe ? "you visit" : `${member.name.split(" ")[0]} visits`} the workspace.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Leaderboard tab ── */
type SortKey = "weeklyRate" | "currentStreak" | "completionRate" | "bestStreak";

function Leaderboard({
  members,
  currentUserId,
  myStats,
}: {
  members: (WorkspaceMember & { stats?: MemberStats })[];
  currentUserId: string;
  myStats: MemberStats;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("weeklyRate");

  const ranked = useMemo(() => {
    return members
      .map((m) => ({
        ...m,
        resolvedStats: m.userId === currentUserId ? myStats : m.stats,
      }))
      .sort((a, b) => {
        const av = a.resolvedStats?.[sortKey] ?? -1;
        const bv = b.resolvedStats?.[sortKey] ?? -1;
        return bv - av;
      });
  }, [members, currentUserId, myStats, sortKey]);

  const sortOptions: { key: SortKey; label: string; icon: typeof Activity }[] = [
    { key: "weeklyRate", label: "This week", icon: Activity },
    { key: "currentStreak", label: "Streak", icon: Flame },
    { key: "completionRate", label: "Overall", icon: TrendingUp },
    { key: "bestStreak", label: "Best streak", icon: Star },
  ];

  const medalEmoji = ["🥇", "🥈", "🥉"];
  const topValue = ranked[0]?.resolvedStats?.[sortKey] ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground mr-1 hidden sm:block">Rank by:</p>
        {sortOptions.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={sortKey === key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setSortKey(key)}
            data-testid={`button-sort-${key}`}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden xs:inline sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {ranked.map((member, index) => {
          const stats = member.resolvedStats;
          const isMe = member.userId === currentUserId;
          const isOwner = member.role === "owner";
          const value = stats?.[sortKey] ?? null;
          const online = isRecent(stats?.syncedAt);
          const relativeWidth = topValue > 0 && value !== null ? Math.round((value / topValue) * 100) : 0;

          return (
            <div
              key={member.userId}
              className={cn(
                "flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-colors",
                isMe ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card hover:bg-muted/20",
                index === 0 && stats ? "border-amber-400/40 bg-amber-500/5" : "",
              )}
              data-testid={`leaderboard-row-${member.userId}`}
            >
              <div className="w-7 sm:w-8 text-center flex-shrink-0">
                {index < 3 && stats ? (
                  <span className="text-xl">{medalEmoji[index]}</span>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                )}
              </div>

              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                  <AvatarFallback className={cn(
                    "text-xs font-bold",
                    isOwner ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
                  )}>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-background",
                  online ? "bg-emerald-500" : "bg-muted-foreground/30",
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  {isOwner && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">You</Badge>}
                </div>
                {stats ? (
                  <>
                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-orange-400" />{stats.currentStreak}d
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-primary" />{stats.activeSystems} sys
                      </span>
                      <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-amber-400" />best {stats.bestStreak}d
                      </span>
                    </div>
                    {topValue > 0 && value !== null && (
                      <div className="mt-1.5 hidden sm:block">
                        <div className="w-full bg-muted rounded-full h-1">
                          <div
                            className={cn("h-1 rounded-full transition-all", index === 0 ? "bg-amber-400" : "bg-primary/40")}
                            style={{ width: `${relativeWidth}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">No stats yet</p>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                {value !== null ? (
                  <>
                    <p className={cn(
                      "text-base sm:text-lg font-bold tabular-nums",
                      index === 0 ? "text-amber-500" : index === 1 ? "text-zinc-400" : index === 2 ? "text-amber-700 dark:text-amber-600" : "text-foreground",
                    )}>
                      {sortKey === "currentStreak" || sortKey === "bestStreak" ? `${value}d` : `${value}%`}
                    </p>
                    <p className="text-[10px] text-muted-foreground hidden sm:block">
                      {sortKey === "weeklyRate" ? "this week" : sortKey === "currentStreak" ? "streak" : sortKey === "bestStreak" ? "best ever" : "overall"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ranked.every((m) => !m.resolvedStats) && (
        <div className="text-center py-10 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">The leaderboard will fill up as members sync their stats.</p>
        </div>
      )}
    </div>
  );
}

/* ── Coach dashboard ── */
type CoachSortKey = "name" | "currentStreak" | "weeklyRate" | "completionRate" | "bestStreak";

function CoachDashboard({
  members,
  currentUserId,
  myStats,
}: {
  members: (WorkspaceMember & { stats?: MemberStats })[];
  currentUserId: string;
  myStats: MemberStats;
}) {
  const [sortKey, setSortKey] = useState<CoachSortKey>("weeklyRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      const aStats = a.userId === currentUserId ? myStats : a.stats;
      const bStats = b.userId === currentUserId ? myStats : b.stats;
      if (sortKey === "name") {
        return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const av = aStats?.[sortKey] ?? -1;
      const bv = bStats?.[sortKey] ?? -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [members, sortKey, sortDir, currentUserId, myStats]);

  const topWeekly = Math.max(...members.map((m) => {
    const s = m.userId === currentUserId ? myStats : m.stats;
    return s?.weeklyRate ?? 0;
  }));

  const needsAttention = members.filter((m) => {
    const s = m.userId === currentUserId ? myStats : m.stats;
    return s && s.weeklyRate < 40;
  });

  function handleSort(key: CoachSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const SortIcon = ({ col }: { col: CoachSortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold">Team Overview</h3>
        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px]">Elite</Badge>
      </div>

      {needsAttention.length > 0 && (
        <Card className="border-amber-400/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {needsAttention.length} member{needsAttention.length !== 1 ? "s" : ""} may need support
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {needsAttention.map((m) => {
                const s = m.userId === currentUserId ? myStats : m.stats;
                return (
                  <div key={m.userId} className="flex items-center gap-1.5 bg-background border border-amber-400/30 rounded-lg px-2.5 py-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{m.name.split(" ")[0]}</span>
                    <span className="text-[10px] text-amber-600 font-semibold">{s?.weeklyRate ?? 0}% this week</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 grid grid-cols-7 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <button className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
            Member <SortIcon col="name" />
          </button>
          <div className="text-center">Systems</div>
          <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("currentStreak")}>
            Streak <SortIcon col="currentStreak" />
          </button>
          <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("bestStreak")}>
            Best <SortIcon col="bestStreak" />
          </button>
          <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("weeklyRate")}>
            7-day <SortIcon col="weeklyRate" />
          </button>
          <div className="text-center">Status</div>
        </div>
        {sorted.map((member) => {
          const mStats = member.userId === currentUserId ? myStats : member.stats;
          const isTopPerformer = (mStats?.weeklyRate ?? 0) === topWeekly && topWeekly > 0;
          const isMe = member.userId === currentUserId;
          const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;
          const weeklyRate = stats?.weeklyRate ?? null;
          const perf = getPerformanceLabel(weeklyRate);
          const rateColor = weeklyRate === null ? "text-muted-foreground" : weeklyRate >= 75 ? "text-emerald-600 dark:text-emerald-400" : weeklyRate >= 40 ? "text-amber-500" : "text-destructive";
          const online = isRecent(stats?.syncedAt);

          return (
            <div
              key={member.userId}
              className={cn(
                "px-4 py-3 grid grid-cols-7 gap-2 items-center border-t border-border/40 hover:bg-muted/20 transition-colors",
                isMe && "bg-primary/[0.03]",
                isTopPerformer && "bg-emerald-500/[0.03]",
              )}
              data-testid={`coach-row-${member.userId}`}
            >
              <div className="col-span-2 flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className={cn("text-[10px] font-bold", member.role === "owner" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary")}>
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(
                    "absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-background",
                    online ? "bg-emerald-500" : "bg-muted-foreground/30",
                  )} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {member.name}{isMe && <span className="text-muted-foreground text-[10px] ml-1">(you)</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />{stats?.activeSystems ?? "—"}
                </span>
              </div>
              <div className="text-center">
                <span className={cn("text-sm font-semibold flex items-center justify-center gap-1", stats?.currentStreak ? "text-orange-500" : "text-muted-foreground")}>
                  <Flame className="w-3 h-3" />{stats?.currentStreak != null ? `${stats.currentStreak}d` : "—"}
                </span>
              </div>
              <div className="text-center">
                <span className={cn("text-sm font-semibold flex items-center justify-center gap-1", stats?.bestStreak ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                  <Star className="w-3 h-3" />{stats?.bestStreak != null ? `${stats.bestStreak}d` : "—"}
                </span>
              </div>
              <div className="text-center">
                {weeklyRate !== null ? (
                  <>
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(weeklyRate)}
                      <span className={cn("text-sm font-semibold tabular-nums", rateColor)}>{weeklyRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 mt-1">
                      <div className={cn("h-1 rounded-full transition-all", weeklyRate >= 75 ? "bg-emerald-500" : weeklyRate >= 40 ? "bg-amber-400" : "bg-destructive")}
                        style={{ width: `${weeklyRate}%` }} />
                    </div>
                  </>
                ) : <span className="text-sm text-muted-foreground">—</span>}
              </div>
              <div className="text-center">
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", perf.bg, perf.color)}>{perf.label}</span>
                {stats?.syncedAt && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">{formatRelativeTime(stats.syncedAt)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {sorted.map((member) => {
          const isMe = member.userId === currentUserId;
          const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;
          const weeklyRate = stats?.weeklyRate ?? null;
          const perf = getPerformanceLabel(weeklyRate);
          const online = isRecent(stats?.syncedAt);
          const isTopPerformer = (stats?.weeklyRate ?? 0) === topWeekly && topWeekly > 0;

          return (
            <Card
              key={member.userId}
              className={cn(
                "border-border/50 transition-colors",
                isMe && "border-primary/20 bg-primary/[0.02]",
                isTopPerformer && "border-emerald-400/30 bg-emerald-500/[0.02]",
              )}
              data-testid={`coach-card-mobile-${member.userId}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={cn("text-xs font-bold", member.role === "owner" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary")}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-background",
                        online ? "bg-emerald-500" : "bg-muted-foreground/30",
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-sm font-semibold truncate">{member.name}</p>
                        {isMe && <Badge variant="secondary" className="text-[10px] px-1 py-0">You</Badge>}
                        {member.role === "owner" && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", perf.bg, perf.color)}>
                    {perf.label}
                  </span>
                </div>

                {stats ? (
                  <>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <div className="text-center">
                        <p className="text-xs font-bold flex items-center justify-center gap-0.5"><Zap className="w-3 h-3 text-primary" />{stats.activeSystems}</p>
                        <p className="text-[10px] text-muted-foreground">Systems</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-orange-500 flex items-center justify-center gap-0.5"><Flame className="w-3 h-3" />{stats.currentStreak}d</p>
                        <p className="text-[10px] text-muted-foreground">Streak</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-amber-500 flex items-center justify-center gap-0.5"><Star className="w-3 h-3" />{stats.bestStreak}d</p>
                        <p className="text-[10px] text-muted-foreground">Best</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {getTrendIcon(weeklyRate)}
                          <p className={cn("text-xs font-bold", weeklyRate !== null && weeklyRate >= 75 ? "text-emerald-500" : weeklyRate !== null && weeklyRate >= 40 ? "text-amber-500" : "text-destructive")}>
                            {weeklyRate !== null ? `${weeklyRate}%` : "—"}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">This week</p>
                      </div>
                    </div>
                    {weeklyRate !== null && (
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={cn("h-1.5 rounded-full transition-all", weeklyRate >= 75 ? "bg-emerald-500" : weeklyRate >= 40 ? "bg-amber-400" : "bg-destructive")}
                          style={{ width: `${weeklyRate}%` }}
                        />
                      </div>
                    )}
                    {stats.syncedAt && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> Last synced {formatRelativeTime(stats.syncedAt)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No stats yet — waiting for first sync</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Stats update when each member visits this page. {` `}
        <span className="hidden md:inline">Click column headers to sort.</span>
      </p>
    </div>
  );
}

/* ── Activity tab ── */
function ActivityFeed({
  members,
  currentUserId,
  myStats,
}: {
  members: (WorkspaceMember & { stats?: MemberStats })[];
  currentUserId: string;
  myStats: MemberStats;
}) {
  const membersWithTime = useMemo(() => {
    return members
      .map((m) => {
        const stats = m.userId === currentUserId ? myStats : m.stats;
        return { ...m, resolvedStats: stats };
      })
      .filter((m) => m.resolvedStats?.syncedAt)
      .sort((a, b) => {
        const at = new Date(a.resolvedStats!.syncedAt!).getTime();
        const bt = new Date(b.resolvedStats!.syncedAt!).getTime();
        return bt - at;
      });
  }, [members, currentUserId, myStats]);

  const neverSynced = members.filter((m) => {
    const stats = m.userId === currentUserId ? myStats : m.stats;
    return !stats?.syncedAt;
  });

  if (membersWithTime.length === 0 && neverSynced.length === members.length) {
    return (
      <div className="text-center py-12">
        <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          Activity will appear here once team members visit the workspace and sync their stats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {membersWithTime.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Recent sync activity
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{membersWithTime.length}</Badge>
          </h3>
          <div className="space-y-2">
            {membersWithTime.map((member) => {
              const stats = member.resolvedStats!;
              const isMe = member.userId === currentUserId;
              const online = isRecent(stats.syncedAt);
              const perf = getPerformanceLabel(stats.weeklyRate);

              return (
                <div
                  key={member.userId}
                  className={cn(
                    "flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-border/50 bg-card hover:bg-muted/20 transition-colors",
                    isMe && "border-primary/20 bg-primary/[0.02]",
                  )}
                  data-testid={`activity-row-${member.userId}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className={cn(
                        "text-xs font-bold",
                        member.role === "owner" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
                      )}>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                      online ? "bg-emerald-500" : "bg-muted-foreground/30",
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium">{member.name}</p>
                      {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
                      {member.role === "owner" && <Crown className="w-3 h-3 text-amber-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="hidden sm:inline">{stats.activeSystems} systems · </span>
                      <span className="text-orange-500 font-medium">{stats.currentStreak}d streak</span>
                      <span className="hidden sm:inline"> · {stats.weeklyRate}% this week</span>
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", perf.bg, perf.color)}>
                      {perf.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(stats.syncedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {neverSynced.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            Not yet synced
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{neverSynced.length}</Badge>
          </h3>
          <div className="space-y-2">
            {neverSynced.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-dashed border-border/50 opacity-60"
              >
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <p className="text-[10px] text-muted-foreground flex-shrink-0">Waiting for first sync</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Workspace Settings panel (owner only) ── */
function WorkspaceSettings({
  workspace,
  members,
  currentUserId,
  onClose,
}: {
  workspace: Workspace;
  members: WorkspaceMember[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState(workspace.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const nonOwnerMembers = members.filter((m) => m.userId !== currentUserId);

  const renameMutation = useMutation({
    mutationFn: () => renameWorkspace(workspace.id, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Workspace renamed" });
    },
    onError: () => toast({ title: "Failed to rename workspace", variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: () => transferOwnership(workspace.id, currentUserId, transferTarget),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Ownership transferred", description: "You are now a regular member." });
      onClose();
    },
    onError: () => toast({ title: "Failed to transfer ownership", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspace.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Workspace deleted" });
      onClose();
    },
    onError: () => toast({ title: "Failed to delete workspace", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium mb-2 block">Workspace name</label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Team name"
            data-testid="input-workspace-rename"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim() && newName.trim() !== workspace.name) {
                renameMutation.mutate();
              }
            }}
          />
          <Button
            onClick={() => renameMutation.mutate()}
            disabled={renameMutation.isPending || !newName.trim() || newName.trim() === workspace.name}
            data-testid="button-save-workspace-name"
          >
            {renameMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {nonOwnerMembers.length > 0 && (
        <>
          <Separator />
          <div>
            <label className="text-sm font-medium mb-1 block">
              <span className="flex items-center gap-1.5">
                <Handshake className="w-4 h-4 text-amber-500" /> Transfer ownership
              </span>
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Hand ownership to another member. You'll become a regular member.
            </p>
            {!showTransferConfirm ? (
              <div className="flex gap-2">
                <select
                  className="flex-1 text-sm border border-border rounded-md px-3 py-2 bg-background"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  data-testid="select-transfer-owner"
                >
                  <option value="">Select a member…</option>
                  {nonOwnerMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.name}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={!transferTarget}
                  onClick={() => setShowTransferConfirm(true)}
                  data-testid="button-transfer-owner-prompt"
                >
                  Transfer
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-amber-600 font-medium">
                  Transfer to {nonOwnerMembers.find((m) => m.userId === transferTarget)?.name}?
                </p>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white border-0"
                  onClick={() => transferMutation.mutate()}
                  disabled={transferMutation.isPending}
                  data-testid="button-confirm-transfer-owner"
                >
                  {transferMutation.isPending ? "Transferring…" : "Yes, transfer"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowTransferConfirm(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <h4 className="text-sm font-semibold text-destructive mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> Danger zone
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Deleting the workspace will remove all members and cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="button-delete-workspace-prompt"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete workspace
          </Button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-destructive font-medium">Are you sure?</p>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-workspace"
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Create panel ── */
function CreatePanel({ onCreated }: { onCreated: () => void }) {
  const { user } = useAppStore();
  const [name, setName] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createWorkspace(user!.id, user!.email, user!.name, name.trim() || `${user!.name}'s Team`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Workspace created!", description: "Share your invite code with your team." });
      onCreated();
    },
    onError: (err: any) => toast({ title: err?.message ?? "Failed to create workspace", variant: "destructive" }),
  });

  return (
    <div className="max-w-md mx-auto text-center py-6 sm:py-8 px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold mb-1">Create your workspace</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
        Build a shared space for your team. Invite members with a unique code and track everyone's progress together.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder={`${user?.name ?? "My"}'s Team`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="input-workspace-name"
          className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") mutation.mutate(); }}
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-white border-0 flex-shrink-0"
          data-testid="button-create-workspace"
        >
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Leave blank to use your name</p>
    </div>
  );
}

/* ── Join panel ── */
function JoinPanel({ onJoined, defaultCode = "" }: { onJoined: () => void; defaultCode?: string }) {
  const { user } = useAppStore();
  const [code, setCode] = useState(defaultCode.toUpperCase());
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => joinWorkspaceByCode(code.trim(), user!.email, user!.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Joined workspace!", description: "You can now see your team's progress." });
      onJoined();
    },
    onError: (err: any) => toast({ title: err?.message ?? "Failed to join workspace", variant: "destructive" }),
  });

  return (
    <div className="max-w-md mx-auto text-center py-6 sm:py-8 px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
        <Hash className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-1">Join a workspace</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
        Enter the 6-character invite code shared by your team owner.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="AB12CD"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          data-testid="input-invite-code"
          className="flex-1 uppercase tracking-[0.4em] font-mono text-center text-lg"
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim().length >= 4) mutation.mutate(); }}
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || code.trim().length < 4}
          data-testid="button-join-workspace"
          className="flex-shrink-0"
        >
          {mutation.isPending ? "Joining…" : "Join"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Enter the 6-character code from your team owner</p>
    </div>
  );
}

/* ── Workspace view (after creation/join) ── */
function WorkspaceView({ workspace, currentUserId, myStats, onRefresh, isRefreshing }: {
  workspace: Workspace & { members: (WorkspaceMember & { stats?: MemberStats })[] };
  currentUserId: string;
  myStats: MemberStats;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [tab, setTab] = useState("members");
  const [showSettings, setShowSettings] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const isOwner = workspace.ownerId === currentUserId;

  const copyCode = () => {
    navigator.clipboard.writeText(workspace.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast({ title: "Invite code copied!" });
  };

  const copyLink = () => {
    const url = `${window.location.origin}/workspace?join=${workspace.inviteCode}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: "Invite link copied!", description: "Share it with your teammates." });
  };

  const regenMutation = useMutation({
    mutationFn: () => regenerateInviteCode(workspace.id),
    onSuccess: (newCode) => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Invite code refreshed", description: `New code: ${newCode}` });
    },
    onError: () => toast({ title: "Failed to refresh code", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMemberFromWorkspace(workspace.id, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Member removed" });
      setShowRemoveConfirm(null);
    },
    onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: (newOwnerId: string) => transferOwnership(workspace.id, currentUserId, newOwnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Ownership transferred" });
      setTransferTarget(null);
    },
    onError: () => toast({ title: "Failed to transfer ownership", variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveWorkspace(workspace.id, currentUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Left workspace" });
      setShowLeaveConfirm(false);
    },
    onError: () => toast({ title: "Failed to leave workspace", variant: "destructive" }),
  });

  const membersWithStats = workspace.members as (WorkspaceMember & { stats?: MemberStats })[];
  const membersSortedForCards = useMemo(() => {
    return [...membersWithStats].sort((a, b) => {
      const aStats = a.userId === currentUserId ? myStats : a.stats;
      const bStats = b.userId === currentUserId ? myStats : b.stats;
      return (bStats?.weeklyRate ?? -1) - (aStats?.weeklyRate ?? -1);
    });
  }, [membersWithStats, currentUserId, myStats]);

  const memberBeingRemoved = showRemoveConfirm
    ? workspace.members.find((m) => m.userId === showRemoveConfirm)
    : null;

  const transferTargetMember = transferTarget
    ? workspace.members.find((m) => m.userId === transferTarget)
    : null;

  const syncedCount = membersWithStats.filter((m) => {
    const s = m.userId === currentUserId ? myStats : m.stats;
    return s?.syncedAt;
  }).length;

  const onlineCount = membersWithStats.filter((m) => {
    const s = m.userId === currentUserId ? myStats : m.stats;
    return isRecent(s?.syncedAt);
  }).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Workspace header card */}
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-500/5 via-background to-background overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base sm:text-lg truncate">{workspace.name}</h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""} ·{" "}
                    {isOwner ? "You own this" : `Owned by ${workspace.members.find(m => m.role === "owner")?.name ?? "Unknown"}`}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={cn(
                      "inline-flex items-center gap-1",
                      onlineCount > 0 ? "text-emerald-500" : "text-muted-foreground",
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        onlineCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30",
                      )} />
                      {onlineCount > 0 ? `${onlineCount} active` : "No one active"}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{syncedCount}/{workspace.members.length} synced</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-start">
              <Button
                variant="outline" size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={onRefresh}
                disabled={isRefreshing}
                data-testid="button-refresh-workspace"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden xs:inline">Refresh</span>
              </Button>
              {isOwner && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
                  onClick={() => setShowSettings(true)} data-testid="button-workspace-settings">
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Settings</span>
                </Button>
              )}
              {!isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 h-8 text-xs"
                  onClick={() => setShowLeaveConfirm(true)}
                  data-testid="button-leave-workspace"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Leave</span>
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Invite code section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> {isOwner ? "Invite code" : "Share workspace"}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5">
                <span
                  className={cn(
                    "font-mono font-bold text-lg sm:text-xl tracking-[0.3em] transition-all",
                    !codeVisible && !isOwner ? "blur-sm select-none" : "text-foreground",
                  )}
                  data-testid="text-invite-code"
                >
                  {workspace.inviteCode}
                </span>
              </div>
              {!isOwner && (
                <Button
                  variant="outline" size="icon"
                  className="w-9 h-9"
                  onClick={() => setCodeVisible((v) => !v)}
                  title={codeVisible ? "Hide code" : "Reveal code"}
                  data-testid="button-toggle-code-visibility"
                >
                  {codeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="outline" size="icon" className="w-9 h-9" onClick={copyCode} data-testid="button-copy-invite-code" title="Copy code">
                {codeCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={copyLink} data-testid="button-copy-invite-link" title="Copy shareable link">
                {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
                {linkCopied ? "Copied!" : "Copy link"}
              </Button>
              {isOwner && (
                <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending} data-testid="button-regen-invite-code" title="Generate new code">
                  <RefreshCw className={cn("w-4 h-4", regenMutation.isPending && "animate-spin")} />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isOwner
                ? "Share the code or link with teammates. Regenerate to revoke old invites."
                : "Reveal and share the invite code or link to bring in more teammates."
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Team summary stats */}
      <TeamSummary members={membersWithStats} currentUserId={currentUserId} myStats={myStats} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto pb-1 -mx-0.5 px-0.5">
          <TabsList className="mb-4 w-full sm:w-auto inline-flex min-w-max">
            <TabsTrigger value="members" className="gap-1.5 flex-1 sm:flex-none" data-testid="tab-members">
              <Users className="w-3.5 h-3.5" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5 flex-1 sm:flex-none" data-testid="tab-leaderboard">
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="coach" className="gap-1.5 flex-1 sm:flex-none" data-testid="tab-coach">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Coach</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 flex-1 sm:flex-none" data-testid="tab-activity">
              <Activity className="w-3.5 h-3.5" />
              <span>Activity</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="members" className="mt-0">
          {workspace.members.length === 1 && isOwner && (
            <div className="text-center py-8 sm:py-10 px-4 rounded-2xl border border-dashed border-border/60 mb-4">
              <UserPlus className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No team members yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Share the invite code or link above with your teammates. Once they join, their progress will appear here.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {membersSortedForCards.map((member, index) => (
              <MemberCard
                key={member.userId}
                member={member}
                isOwner={member.role === "owner"}
                isMe={member.userId === currentUserId}
                myStats={member.userId === currentUserId ? myStats : undefined}
                rank={index + 1}
                canManage={isOwner}
                onRemove={isOwner && member.userId !== currentUserId ? () => setShowRemoveConfirm(member.userId) : undefined}
                onTransferOwnership={isOwner && member.userId !== currentUserId ? () => setTransferTarget(member.userId) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0">
          <Leaderboard members={membersWithStats} currentUserId={currentUserId} myStats={myStats} />
        </TabsContent>

        <TabsContent value="coach" className="mt-0">
          <CoachDashboard members={membersWithStats} currentUserId={currentUserId} myStats={myStats} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <ActivityFeed members={membersWithStats} currentUserId={currentUserId} myStats={myStats} />
        </TabsContent>
      </Tabs>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent data-testid="dialog-workspace-settings" className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Workspace settings</DialogTitle>
            <DialogDescription>Manage your workspace name, ownership, and advanced options.</DialogDescription>
          </DialogHeader>
          <WorkspaceSettings
            workspace={workspace}
            members={workspace.members}
            currentUserId={currentUserId}
            onClose={() => setShowSettings(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation dialog */}
      <Dialog open={!!showRemoveConfirm} onOpenChange={(open) => { if (!open) setShowRemoveConfirm(null); }}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberBeingRemoved?.name}</strong> from this workspace? They will lose access to the team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row sm:flex-row">
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setShowRemoveConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1 sm:flex-none"
              disabled={removeMutation.isPending}
              onClick={() => showRemoveConfirm && removeMutation.mutate(showRemoveConfirm)}
              data-testid="button-confirm-remove-member"
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership confirmation dialog */}
      <Dialog open={!!transferTarget} onOpenChange={(open) => { if (!open) setTransferTarget(null); }}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              Are you sure you want to transfer ownership to <strong>{transferTargetMember?.name}</strong>? You will become a regular member and lose admin controls.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row sm:flex-row">
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setTransferTarget(null)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white border-0 flex-1 sm:flex-none"
              disabled={transferMutation.isPending}
              onClick={() => transferTarget && transferMutation.mutate(transferTarget)}
              data-testid="button-confirm-transfer-owner"
            >
              {transferMutation.isPending ? "Transferring…" : "Transfer ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave workspace confirmation dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Leave workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave <strong>{workspace.name}</strong>? You'll need a new invite code to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row sm:flex-row">
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1 sm:flex-none"
              disabled={leaveMutation.isPending}
              onClick={() => leaveMutation.mutate()}
              data-testid="button-confirm-leave-workspace"
            >
              {leaveMutation.isPending ? "Leaving…" : "Leave workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Main page ── */
export default function WorkspacePage() {
  const { user } = useAppStore();
  const features = getPlanFeatures(user?.plan);
  const userId = user?.id ?? "";
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(search);
  const joinCodeFromUrl = params.get("join") ?? "";

  const [mode, setMode] = useState<"idle" | "create" | "join">(() =>
    joinCodeFromUrl ? "join" : "idle"
  );

  const qc = useQueryClient();

  const { data: workspace, isLoading, isFetching } = useQuery<Workspace | null>({
    queryKey: ["my-workspace"],
    queryFn: () => getMyWorkspace(),
    enabled: !!userId && features.teamWorkspace,
    retry: false,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const hasWorkspace = !!workspace;
  const isOwner = workspace?.ownerId === userId;

  const myStats = useStatSync(userId, hasWorkspace, workspace?.id ?? "");

  const handleRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["my-workspace"] });
  }, [qc]);

  function clearJoinParam() {
    if (joinCodeFromUrl) {
      setLocation("/workspace", { replace: true });
    }
  }

  if (!features.teamWorkspace) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-full max-w-md">
          <PlanGate requiredPlan="elite" featureLabel="Team Workspace"
            description="Collaborate with your team, track everyone's progress, and use the Coach Dashboard to keep your group accountable." />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Helmet><title>Team Workspace | Strivo</title></Helmet>

      {/* Page header */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">Team Workspace</h1>
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" /> Elite
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasWorkspace ? "Collaborate with your team and track collective progress." : "Create or join a workspace to get started."}
          </p>
        </div>
        {hasWorkspace && isOwner && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 sm:px-3 py-1.5 flex-shrink-0">
            <Shield className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">You own this workspace</span>
            <span className="sm:hidden">Owner</span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin w-7 h-7 rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      )}

      {/* Idle state — choose create or join */}
      {!isLoading && !hasWorkspace && mode === "idle" && (
        <div className="max-w-xl mx-auto py-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold mb-1">Get started with Team Workspace</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create your own team space or join one with an invite code.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <Card
              className="border-amber-400/30 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              onClick={() => setMode("create")}
              data-testid="card-create-workspace"
            >
              <CardContent className="p-5 sm:p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-semibold mb-1">Create workspace</h3>
                <p className="text-xs text-muted-foreground mb-4">Set up a new team space and invite members with a code.</p>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1.5" size="sm">
                  Get started <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
            <Card
              className="border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              onClick={() => setMode("join")}
              data-testid="card-join-workspace"
            >
              <CardContent className="p-5 sm:p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Join workspace</h3>
                <p className="text-xs text-muted-foreground mb-4">Have an invite code? Join your teammate's workspace.</p>
                <Button variant="outline" className="w-full gap-1.5" size="sm">
                  Enter code <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create panel */}
      {!isLoading && !hasWorkspace && mode === "create" && (
        <div>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setMode("idle"); clearJoinParam(); }}
            className="mb-4 text-xs gap-1 -ml-1"
          >
            ← Back
          </Button>
          <CreatePanel onCreated={() => { setMode("idle"); clearJoinParam(); }} />
        </div>
      )}

      {/* Join panel */}
      {!isLoading && !hasWorkspace && mode === "join" && (
        <div>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setMode("idle"); clearJoinParam(); }}
            className="mb-4 text-xs gap-1 -ml-1"
          >
            ← Back
          </Button>
          <JoinPanel
            defaultCode={joinCodeFromUrl}
            onJoined={() => { setMode("idle"); clearJoinParam(); }}
          />
        </div>
      )}

      {/* Active workspace view */}
      {!isLoading && hasWorkspace && workspace && (
        <WorkspaceView
          workspace={workspace as any}
          currentUserId={userId}
          myStats={myStats}
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />
      )}
    </div>
  );
}
