import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useAppStore } from "@/store/auth.store";
import { getPlanFeatures } from "@/lib/plan-limits";
import { PlanGate } from "@/components/plan-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Crown, Copy, Check, RefreshCw, UserPlus, Flame,
  Zap, LogOut, Trash2, Shield, Plus, Hash,
  BarChart2, Target, ChevronRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyWorkspace,
  createWorkspace,
  joinWorkspaceByCode,
  leaveWorkspace,
  removeMemberFromWorkspace,
  regenerateInviteCode,
  syncMemberStats,
  type MemberStats,
} from "@/services/workspace.service";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import type { Workspace, WorkspaceMember, System, Checkin } from "@/types/schema";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function computeStats(systems: System[], checkins: Checkin[]): MemberStats {
  const activeSystems = systems.filter((s) => s.active);
  const today = new Date().toISOString().split("T")[0];
  const totalCheckins = checkins.length;
  const doneCheckins = checkins.filter((c) => c.status === "done").length;
  const completionRate = totalCheckins > 0 ? Math.round((doneCheckins / totalCheckins) * 100) : 0;

  let bestStreak = 0;
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

  return { activeSystems: activeSystems.length, bestStreak, completionRate, weeklyRate, last7 };
}

/* ── Sync the current user's stats to the server ── */
function useStatSync(userId: string, inWorkspace: boolean) {
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
    if (!inWorkspace || !systems.length && !checkins.length) return;
    syncMemberStats(stats).catch(() => {});
  }, [inWorkspace, JSON.stringify(stats)]);

  return stats;
}

/* ── Member card — shows server-stored stats ── */
function MemberCard({
  member,
  isOwner,
  isMe,
  myStats,
  onRemove,
}: {
  member: WorkspaceMember & { stats?: MemberStats };
  isOwner: boolean;
  isMe: boolean;
  myStats?: MemberStats;
  onRemove?: () => void;
}) {
  const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;

  return (
    <Card className="border-border/60 hover-elevate" data-testid={`member-card-${member.userId}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className={cn(
                "text-sm font-bold",
                isOwner ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary",
              )}>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
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
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-lg font-bold">{stats.activeSystems}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Active systems</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span className="text-lg font-bold">{stats.bestStreak}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Best streak</p>
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
                <div key={i} title={day.dateKey} className={cn(
                  "flex-1 h-5 rounded-sm",
                  day.total === 0 ? "bg-muted/30" : day.done === 0 ? "bg-destructive/20" : day.done >= day.total ? "bg-chart-3" : "bg-amber-400/60",
                )} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">Last 7 days</p>
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

/* ── Coach dashboard table row ── */
function CoachRow({ member, isMe, myStats }: {
  member: WorkspaceMember & { stats?: MemberStats };
  isMe: boolean;
  myStats?: MemberStats;
}) {
  const stats: MemberStats | undefined = isMe ? myStats : (member as any).stats;
  const weeklyRate = stats?.weeklyRate ?? null;
  const rateColor = weeklyRate === null ? "text-muted-foreground" : weeklyRate >= 75 ? "text-chart-3" : weeklyRate >= 40 ? "text-amber-500" : "text-destructive";

  return (
    <div className={cn(
      "px-4 py-3 grid grid-cols-5 gap-2 items-center border-t border-border/40 hover:bg-muted/20 transition-colors",
      isMe && "bg-primary/3",
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
        <span className={cn("text-sm font-semibold flex items-center justify-center gap-1", stats?.bestStreak ? "text-orange-500" : "text-muted-foreground")}>
          <Flame className="w-3 h-3" />{stats?.bestStreak != null ? `${stats.bestStreak}d` : "—"}
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
        <Input placeholder="Workspace name (optional)" value={name} onChange={(e) => setName(e.target.value)}
          data-testid="input-workspace-name" className="flex-1" />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-white border-0" data-testid="button-create-workspace">
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}

/* ── Join panel ── */
function JoinPanel({ onJoined }: { onJoined: () => void }) {
  const { user } = useAppStore();
  const [code, setCode] = useState("");
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
        <Input placeholder="Enter invite code (e.g. AB12CD)" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6}
          data-testid="input-invite-code"
          className="flex-1 uppercase tracking-widest font-mono text-center" />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || code.trim().length < 4}
          data-testid="button-join-workspace">
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
  const [tab, setTab] = useState("members");
  const isOwner = workspace.ownerId === currentUserId;

  const copyCode = () => {
    navigator.clipboard.writeText(workspace.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-workspace"] }); toast({ title: "Member removed" }); },
    onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveWorkspace(workspace.id, currentUserId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-workspace"] }); toast({ title: "Left workspace" }); },
    onError: () => toast({ title: "Failed to leave workspace", variant: "destructive" }),
  });

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
            {!isOwner && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 self-start sm:self-auto"
                onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} data-testid="button-leave-workspace">
                <LogOut className="w-3.5 h-3.5" /> Leave workspace
              </Button>
            )}
          </div>

          {isOwner && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Invite code
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-2.5">
                    <span className="font-mono font-bold text-xl tracking-[0.3em] text-foreground" data-testid="text-invite-code">
                      {workspace.inviteCode}
                    </span>
                  </div>
                  <Button variant="outline" size="icon" onClick={copyCode} data-testid="button-copy-invite-code" title="Copy">
                    {codeCopied ? <Check className="w-4 h-4 text-chart-3" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending} data-testid="button-regen-invite-code" title="New code">
                    <RefreshCw className={cn("w-4 h-4", regenMutation.isPending && "animate-spin")} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with teammates. Regenerate to revoke old invites.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="members" className="gap-1.5" data-testid="tab-members">
            <Users className="w-3.5 h-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="coach" className="gap-1.5" data-testid="tab-coach">
            <BarChart2 className="w-3.5 h-3.5" /> Coach Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0">
          {workspace.members.length === 1 && isOwner && (
            <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/60">
              <UserPlus className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No team members yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Share the invite code above with your teammates. Once they join, their progress will appear here.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.members.map((member) => (
              <MemberCard
                key={member.userId} member={member}
                isOwner={member.role === "owner"} isMe={member.userId === currentUserId}
                myStats={member.userId === currentUserId ? myStats : undefined}
                onRemove={isOwner ? () => removeMutation.mutate(member.userId) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coach" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold">Team Overview</h3>
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px]">Elite</Badge>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5 grid grid-cols-5 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-2">Member</div>
                <div className="text-center">Systems</div>
                <div className="text-center">Streak</div>
                <div className="text-center">7-day</div>
              </div>
              {workspace.members.map((member) => (
                <CoachRow key={member.userId} member={member}
                  isMe={member.userId === currentUserId}
                  myStats={member.userId === currentUserId ? myStats : undefined}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Stats update when each member visits this page.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Main page ── */
export default function WorkspacePage() {
  const { user } = useAppStore();
  const features = getPlanFeatures(user?.plan);
  const userId = user?.id ?? "";
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");

  const { data: workspace, isLoading } = useQuery<Workspace | null>({
    queryKey: ["my-workspace"],
    queryFn: () => getMyWorkspace(),
    enabled: !!userId && features.teamWorkspace,
    retry: false,
  });

  const hasWorkspace = !!workspace;
  const isOwner = workspace?.ownerId === userId;

  const myStats = useStatSync(userId, hasWorkspace);

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
          <Button variant="ghost" size="sm" onClick={() => setMode("idle")} className="mb-4 text-xs gap-1">← Back</Button>
          <CreatePanel onCreated={() => setMode("idle")} />
        </div>
      )}

      {!isLoading && !hasWorkspace && mode === "join" && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMode("idle")} className="mb-4 text-xs gap-1">← Back</Button>
          <JoinPanel onJoined={() => setMode("idle")} />
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
