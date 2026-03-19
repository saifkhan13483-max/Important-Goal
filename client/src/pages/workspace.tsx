import { useState, useMemo, useEffect } from "react";
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
    let streak = 0;
    const cur = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = cur.toISOString().split("T")[0];
      if (doneSet.has(key)) { streak++; cur.setDate(cur.getDate() - 1); } else break;
    }
    if (streak > bestStreak) bestStreak = streak;

    let cStreak = 0;
    const cur2 = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = cur2.toISOString().split("T")[0];
      if (doneSet.has(key)) { cStreak++; cur2.setDate(cur2.getDate() - 1); } else break;
    }
    if (cStreak > currentStreak) currentStreak = cStreak;
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
  const topStreak = Math.max(...allStats.map((s) => s.bestStreak));
  const avgWeekly = Math.round(allStats.reduce((a, s) => a + s.weeklyRate, 0) / allStats.length);

  const summaryItems = [
    { icon: Zap, label: "Total active systems", value: totalSystems, color: "text-primary", bg: "bg-primary/10" },
    { icon: TrendingUp, label: "Avg completion", value: `${avgCompletion}%`, color: "text-chart-3", bg: "bg-chart-3/10" },
    { icon: Flame, label: "Top streak", value: `${topStreak}d`, color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: Activity, label: "Avg this week", value: `${avgWeekly}%`, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {summaryItems.map(({ icon: Icon, label, value, color, bg }) => (
        <Card key={label} className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Member card — shows server-stored stats ── */
function MemberCard({
  member,
  isOwner,
  isMe,
  myStats,
  rank,
  onRemove,
}: {
  member: WorkspaceMember & { stats?: MemberStats };
  isOwner: boolean;
  isMe: boolean;
  myStats?: MemberStats;
  rank?: number;
  onRemove?: () => void;
}) {
  const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;

  const rankMedal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <Card className="border-border/60 hover-elevate" data-testid={`member-card-${member.userId}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={cn(
                  "text-sm font-bold",
                  isOwner ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
                )}>
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              {rankMedal && (
                <span className="absolute -top-1.5 -right-1.5 text-sm leading-none">{rankMedal}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm truncate">{member.name}</p>
                {isOwner && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" /> Owner
                  </Badge>
                )}
                {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
          </div>
          {onRemove && !isOwner && !isMe && (
            <Button
              variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove} data-testid={`button-remove-member-${member.userId}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {stats ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-base font-bold">{stats.activeSystems}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Systems</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span className="text-base font-bold">{stats.currentStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Streak</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-base font-bold">{stats.bestStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Best</p>
              </div>
            </div>
            <div className="space-y-2.5 mb-3">
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
                  <span className="text-xs font-semibold">{stats.weeklyRate}%</span>
                </div>
                <Progress value={stats.weeklyRate} className="h-1.5" />
              </div>
            </div>
            <div className="flex gap-1">
              {stats.last7.map((day, i) => (
                <div key={i} title={`${day.dateKey}: ${day.done}/${day.total}`} className={cn(
                  "flex-1 h-5 rounded-sm",
                  day.total === 0 ? "bg-muted/30" : day.done === 0 ? "bg-destructive/20" : day.done >= day.total ? "bg-chart-3" : "bg-amber-400/60",
                )} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">Last 7 days</p>
              {stats.syncedAt && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {formatRelativeTime(stats.syncedAt)}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Stats will appear once {isMe ? "you visit" : `${member.name.split(" ")[0]} visits`} the workspace.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Leaderboard tab ── */
type SortKey = "weeklyRate" | "currentStreak" | "completionRate";

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
  ];

  const medalEmoji = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground mr-1">Sort by:</p>
        {sortOptions.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={sortKey === key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setSortKey(key)}
            data-testid={`button-sort-${key}`}
          >
            <Icon className="w-3 h-3" /> {label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {ranked.map((member, index) => {
          const stats = member.resolvedStats;
          const isMe = member.userId === currentUserId;
          const isOwner = member.role === "owner";
          const value = stats?.[sortKey] ?? null;

          return (
            <div
              key={member.userId}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-colors",
                isMe ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card hover:bg-muted/20",
                index === 0 && stats ? "border-amber-400/40 bg-amber-500/5" : "",
              )}
              data-testid={`leaderboard-row-${member.userId}`}
            >
              <div className="w-8 text-center flex-shrink-0">
                {index < 3 && stats ? (
                  <span className="text-xl">{medalEmoji[index]}</span>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                )}
              </div>

              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className={cn(
                  "text-xs font-bold",
                  isOwner ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
                )}>
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  {isOwner && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
                </div>
                {stats ? (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-orange-400" />{stats.currentStreak}d streak
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-primary" />{stats.activeSystems} systems
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">No stats yet</p>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                {value !== null ? (
                  <>
                    <p className={cn(
                      "text-lg font-bold",
                      index === 0 ? "text-amber-500" : index === 1 ? "text-zinc-400" : index === 2 ? "text-amber-700 dark:text-amber-600" : "text-foreground",
                    )}>
                      {sortKey === "currentStreak" ? `${value}d` : `${value}%`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {sortKey === "weeklyRate" ? "this week" : sortKey === "currentStreak" ? "streak" : "overall"}
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

/* ── Coach dashboard table row ── */
type CoachSortKey = "name" | "currentStreak" | "weeklyRate";

function CoachRow({ member, isMe, myStats, highlight }: {
  member: WorkspaceMember & { stats?: MemberStats };
  isMe: boolean;
  myStats?: MemberStats;
  highlight?: boolean;
}) {
  const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;
  const weeklyRate = stats?.weeklyRate ?? null;
  const rateColor = weeklyRate === null ? "text-muted-foreground" : weeklyRate >= 75 ? "text-chart-3" : weeklyRate >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <div className={cn(
      "px-4 py-3 grid grid-cols-6 gap-2 items-center border-t border-border/40 hover:bg-muted/20 transition-colors",
      isMe && "bg-primary/3",
      highlight && "ring-1 ring-inset ring-amber-400/40 bg-amber-500/5",
    )} data-testid={`coach-row-${member.userId}`}>
      <div className="col-span-2 flex items-center gap-2 min-w-0">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarFallback className={cn("text-[10px] font-bold", member.role === "owner" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary")}>
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
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
            <span className={cn("text-sm font-semibold tabular-nums", rateColor)}>{weeklyRate}%</span>
            <div className="w-full bg-muted rounded-full h-1 mt-1">
              <div className={cn("h-1 rounded-full transition-all", weeklyRate >= 75 ? "bg-chart-3" : weeklyRate >= 40 ? "bg-amber-400" : "bg-destructive")}
                style={{ width: `${weeklyRate}%` }} />
            </div>
          </>
        ) : <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

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
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 grid grid-cols-6 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <button className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
            Member <SortIcon col="name" />
          </button>
          <div className="text-center">Systems</div>
          <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("currentStreak")}>
            Streak <SortIcon col="currentStreak" />
          </button>
          <div className="text-center">Best</div>
          <button className="flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("weeklyRate")}>
            7-day <SortIcon col="weeklyRate" />
          </button>
        </div>
        {sorted.map((member) => {
          const mStats = member.userId === currentUserId ? myStats : member.stats;
          const isTopPerformer = (mStats?.weeklyRate ?? 0) === topWeekly && topWeekly > 0;
          return (
            <CoachRow key={member.userId} member={member}
              isMe={member.userId === currentUserId}
              myStats={member.userId === currentUserId ? myStats : undefined}
              highlight={isTopPerformer}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Stats update when each member visits this page. Click column headers to sort.
      </p>
    </div>
  );
}

/* ── Workspace Settings panel (owner only) ── */
function WorkspaceSettings({
  workspace,
  onClose,
}: {
  workspace: Workspace;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState(workspace.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: () => renameWorkspace(workspace.id, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Workspace renamed" });
      onClose();
    },
    onError: () => toast({ title: "Failed to rename workspace", variant: "destructive" }),
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
    <div className="space-y-6">
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
          <div className="flex items-center gap-2">
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
    <div className="max-w-md mx-auto text-center py-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold mb-1">Create your workspace</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
        Build a shared space for your team. Invite members with a unique code and track everyone's progress.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Workspace name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="input-workspace-name"
          className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") mutation.mutate(); }}
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-white border-0"
          data-testid="button-create-workspace"
        >
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
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
    <div className="max-w-md mx-auto text-center py-8">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
        <Hash className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-1">Join a workspace</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
        Enter the 6-character invite code shared by your team owner.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter invite code (e.g. AB12CD)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          data-testid="input-invite-code"
          className="flex-1 uppercase tracking-widest font-mono text-center"
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim().length >= 4) mutation.mutate(); }}
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || code.trim().length < 4}
          data-testid="button-join-workspace"
        >
          {mutation.isPending ? "Joining…" : "Join"}
        </Button>
      </div>
    </div>
  );
}

/* ── Workspace view (after creation/join) ── */
function WorkspaceView({ workspace, currentUserId, myStats }: {
  workspace: Workspace & { members: (WorkspaceMember & { stats?: MemberStats })[] };
  currentUserId: string;
  myStats: MemberStats;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tab, setTab] = useState("members");
  const [showSettings, setShowSettings] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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

  const leaveMutation = useMutation({
    mutationFn: () => leaveWorkspace(workspace.id, currentUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace"] });
      toast({ title: "Left workspace" });
      setShowLeaveConfirm(false);
    },
    onError: () => toast({ title: "Failed to leave workspace", variant: "destructive" }),
  });

  const membersWithStats = workspace.members;
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

  return (
    <div className="space-y-6">
      {/* Workspace header card */}
      <Card className="border-amber-400/30 bg-amber-500/5">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="font-bold text-base">{workspace.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""} ·{" "}
                  {isOwner ? "You own this workspace" : `Owned by ${workspace.members.find(m => m.role === "owner")?.name ?? "Unknown"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {isOwner && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => setShowSettings(true)} data-testid="button-workspace-settings">
                  <Pencil className="w-3.5 h-3.5" /> Settings
                </Button>
              )}
              {!isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => setShowLeaveConfirm(true)}
                  data-testid="button-leave-workspace"
                >
                  <LogOut className="w-3.5 h-3.5" /> Leave
                </Button>
              )}
            </div>
          </div>

          {isOwner && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Invite code
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-2.5">
                    <span className="font-mono font-bold text-xl tracking-[0.3em] text-foreground" data-testid="text-invite-code">
                      {workspace.inviteCode}
                    </span>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} data-testid="button-copy-invite-code" title="Copy code">
                    {codeCopied ? <Check className="w-4 h-4 text-chart-3" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copyLink} data-testid="button-copy-invite-link" title="Copy shareable link">
                    {linkCopied ? <Check className="w-3.5 h-3.5 text-chart-3" /> : <Link2 className="w-3.5 h-3.5" />}
                    {linkCopied ? "Copied!" : "Copy link"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending} data-testid="button-regen-invite-code" title="Generate new code">
                    <RefreshCw className={cn("w-4 h-4", regenMutation.isPending && "animate-spin")} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share the code or link with teammates. Regenerate to revoke old invites.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Team summary stats */}
      <TeamSummary members={membersWithStats} currentUserId={currentUserId} myStats={myStats} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="members" className="gap-1.5" data-testid="tab-members">
            <Users className="w-3.5 h-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5" data-testid="tab-leaderboard">
            <Trophy className="w-3.5 h-3.5" /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="coach" className="gap-1.5" data-testid="tab-coach">
            <BarChart2 className="w-3.5 h-3.5" /> Coach View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0">
          {workspace.members.length === 1 && isOwner && (
            <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/60 mb-4">
              <UserPlus className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No team members yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Share the invite code or link above with your teammates. Once they join, their progress will appear here.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {membersSortedForCards.map((member, index) => (
              <MemberCard
                key={member.userId}
                member={member}
                isOwner={member.role === "owner"}
                isMe={member.userId === currentUserId}
                myStats={member.userId === currentUserId ? myStats : undefined}
                rank={index + 1}
                onRemove={isOwner && member.userId !== currentUserId ? () => setShowRemoveConfirm(member.userId) : undefined}
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
      </Tabs>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent data-testid="dialog-workspace-settings">
          <DialogHeader>
            <DialogTitle>Workspace settings</DialogTitle>
            <DialogDescription>Manage your workspace name and advanced options.</DialogDescription>
          </DialogHeader>
          <WorkspaceSettings workspace={workspace} onClose={() => setShowSettings(false)} />
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation dialog */}
      <Dialog open={!!showRemoveConfirm} onOpenChange={(open) => { if (!open) setShowRemoveConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberBeingRemoved?.name}</strong> from this workspace? They will lose access to the team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowRemoveConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => showRemoveConfirm && removeMutation.mutate(showRemoveConfirm)}
              data-testid="button-confirm-remove-member"
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave workspace confirmation dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave <strong>{workspace.name}</strong>? You'll need a new invite code to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
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

  const { data: workspace, isLoading } = useQuery<Workspace | null>({
    queryKey: ["my-workspace"],
    queryFn: () => getMyWorkspace(),
    enabled: !!userId && features.teamWorkspace,
    retry: false,
  });

  const hasWorkspace = !!workspace;
  const isOwner = workspace?.ownerId === userId;

  const myStats = useStatSync(userId, hasWorkspace, workspace?.id ?? "");

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
      <Helmet><title>Team Workspace | SystemForge</title></Helmet>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">Team Workspace</h1>
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" /> Elite
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasWorkspace ? "Collaborate with your team and track collective progress." : "Create or join a workspace to get started."}
          </p>
        </div>
        {hasWorkspace && isOwner && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
            <Shield className="w-3 h-3 text-amber-500" /> You own this workspace
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && !hasWorkspace && mode === "idle" && (
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto py-4">
          <Card className="border-amber-400/30 hover-elevate cursor-pointer" onClick={() => setMode("create")} data-testid="card-create-workspace">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-semibold mb-1">Create workspace</h3>
              <p className="text-xs text-muted-foreground">Set up a new team space and invite members with a code.</p>
              <Button className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1.5" size="sm">
                Get started <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/60 hover-elevate cursor-pointer" onClick={() => setMode("join")} data-testid="card-join-workspace">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Join workspace</h3>
              <p className="text-xs text-muted-foreground">Have an invite code? Join your teammate's workspace.</p>
              <Button variant="outline" className="mt-4 w-full gap-1.5" size="sm">
                Enter code <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !hasWorkspace && mode === "create" && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); clearJoinParam(); }} className="mb-4 text-xs gap-1">
            ← Back
          </Button>
          <CreatePanel onCreated={() => { setMode("idle"); clearJoinParam(); }} />
        </div>
      )}

      {!isLoading && !hasWorkspace && mode === "join" && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); clearJoinParam(); }} className="mb-4 text-xs gap-1">
            ← Back
          </Button>
          <JoinPanel
            defaultCode={joinCodeFromUrl}
            onJoined={() => { setMode("idle"); clearJoinParam(); }}
          />
        </div>
      )}

      {!isLoading && hasWorkspace && workspace && (
        <WorkspaceView
          workspace={workspace as any}
          currentUserId={userId}
          myStats={myStats}
        />
      )}
    </div>
  );
}
