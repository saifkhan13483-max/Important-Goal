import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import {
  Users, Crown, Copy, Check, RefreshCw, UserPlus, Flame,
  TrendingUp, Zap, LogOut, Trash2, Shield, Plus, Hash,
  BarChart2, Target, ChevronRight, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getWorkspaceByOwner,
  getWorkspaceByMember,
  getWorkspaceByCode,
  createWorkspace,
  joinWorkspace,
  leaveWorkspace,
  removeMemberFromWorkspace,
  regenerateInviteCode,
} from "@/services/workspace.service";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import type { Workspace, WorkspaceMember, System, Checkin } from "@/types/schema";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function computeMemberStats(systems: System[], checkins: Checkin[]) {
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
      if (doneSet.has(key)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    if (streak > bestStreak) bestStreak = streak;
  }

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    const dayCheckins = checkins.filter((c) => c.dateKey === dateKey);
    const done = dayCheckins.filter((c) => c.status === "done").length;
    last7.push({ dateKey, done, total: activeSystems.length });
  }

  const last7Done = last7.reduce((acc, d) => acc + d.done, 0);
  const last7Total = last7.reduce((acc, d) => acc + d.total, 0);
  const weeklyRate = last7Total > 0 ? Math.round((last7Done / last7Total) * 100) : 0;

  return {
    activeSystems: activeSystems.length,
    totalCheckins,
    completionRate,
    bestStreak,
    weeklyRate,
    last7,
  };
}

function MemberStatsCard({
  member,
  isOwner,
  isMe,
  onRemove,
}: {
  member: WorkspaceMember;
  isOwner: boolean;
  isMe: boolean;
  onRemove?: () => void;
}) {
  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["systems", member.userId],
    queryFn: () => getSystems(member.userId),
  });
  const { data: checkins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", member.userId],
    queryFn: () => getCheckins(member.userId),
  });

  const stats = useMemo(() => computeMemberStats(systems, checkins), [systems, checkins]);

  return (
    <Card className="border-border/60 hover-elevate" data-testid={`member-card-${member.userId}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className={cn(
                "text-sm font-bold",
                member.role === "owner"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "bg-primary/10 text-primary",
              )}>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm truncate">{member.name}</p>
                {member.role === "owner" && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    Owner
                  </Badge>
                )}
                {isMe && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
          </div>
          {onRemove && !isOwner && !isMe && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              data-testid={`button-remove-member-${member.userId}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

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

        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Overall completion</span>
              <span className="text-xs font-semibold">{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">This week</span>
              <span className="text-xs font-semibold">{stats.weeklyRate}%</span>
            </div>
            <Progress
              value={stats.weeklyRate}
              className="h-1.5"
            />
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {stats.last7.map((day, i) => (
            <div
              key={i}
              title={day.dateKey}
              className={cn(
                "flex-1 h-5 rounded-sm",
                day.total === 0
                  ? "bg-muted/30"
                  : day.done === 0
                  ? "bg-destructive/20"
                  : day.done >= day.total
                  ? "bg-chart-3"
                  : "bg-amber-400/60",
              )}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">Last 7 days</p>
      </CardContent>
    </Card>
  );
}

function CreateWorkspacePanel({ onCreated }: { onCreated: () => void }) {
  const { user } = useAppStore();
  const [name, setName] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createWorkspace(user!.id, user!.email, user!.name, name.trim() || `${user!.name}'s Workspace`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", user!.id] });
      toast({ title: "Workspace created!", description: "Share your invite code with your team." });
      onCreated();
    },
    onError: () => toast({ title: "Failed to create workspace", variant: "destructive" }),
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

function JoinWorkspacePanel({ onJoined }: { onJoined: () => void }) {
  const { user } = useAppStore();
  const [code, setCode] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const ws = await getWorkspaceByCode(code.trim());
      if (!ws) throw new Error("Workspace not found. Check the invite code and try again.");
      if (ws.members.some((m) => m.userId === user!.id)) {
        throw new Error("You're already a member of this workspace.");
      }
      return joinWorkspace(ws.id, {
        userId: user!.id,
        email: user!.email,
        name: user!.name,
        role: "member",
        joinedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", user!.id] });
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
        Enter the 6-character invite code shared by your team owner to join their workspace.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Enter invite code (e.g. AB12CD)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          data-testid="input-invite-code"
          className="flex-1 uppercase tracking-widest font-mono text-center"
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

function WorkspaceView({ workspace, currentUserId }: { workspace: Workspace; currentUserId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [codeCopied, setCodeCopied] = useState(false);
  const [tab, setTab] = useState("members");

  const isOwner = workspace.ownerId === currentUserId;
  const currentMember = workspace.members.find((m) => m.userId === currentUserId);

  const copyCode = () => {
    navigator.clipboard.writeText(workspace.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const regenMutation = useMutation({
    mutationFn: () => regenerateInviteCode(workspace.id),
    onSuccess: (newCode) => {
      qc.invalidateQueries({ queryKey: ["workspace", currentUserId] });
      toast({ title: "Invite code refreshed", description: `New code: ${newCode}` });
    },
    onError: () => toast({ title: "Failed to refresh code", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMemberFromWorkspace(workspace.id, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", currentUserId] });
      toast({ title: "Member removed" });
    },
    onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveWorkspace(workspace.id, currentUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", currentUserId] });
      toast({ title: "Left workspace" });
    },
    onError: () => toast({ title: "Failed to leave workspace", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
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
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 self-start sm:self-auto"
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                data-testid="button-leave-workspace"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave workspace
              </Button>
            )}
          </div>

          {isOwner && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Invite code
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-2.5">
                    <span className="font-mono font-bold text-xl tracking-[0.3em] text-foreground" data-testid="text-invite-code">
                      {workspace.inviteCode}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    className="flex-shrink-0"
                    data-testid="button-copy-invite-code"
                    title="Copy invite code"
                  >
                    {codeCopied ? <Check className="w-4 h-4 text-chart-3" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => regenMutation.mutate()}
                    disabled={regenMutation.isPending}
                    className="flex-shrink-0"
                    data-testid="button-regen-invite-code"
                    title="Generate new code"
                  >
                    <RefreshCw className={cn("w-4 h-4", regenMutation.isPending && "animate-spin")} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with teammates. Regenerate it to revoke old invitations.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="members" className="gap-1.5" data-testid="tab-members">
            <Users className="w-3.5 h-3.5" />
            Members
          </TabsTrigger>
          <TabsTrigger value="coach" className="gap-1.5" data-testid="tab-coach">
            <BarChart2 className="w-3.5 h-3.5" />
            Coach Dashboard
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
              <MemberStatsCard
                key={member.userId}
                member={member}
                isOwner={member.role === "owner"}
                isMe={member.userId === currentUserId}
                onRemove={isOwner ? () => removeMutation.mutate(member.userId) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coach" className="mt-0">
          <CoachDashboard members={workspace.members} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoachDashboard({ members, currentUserId }: { members: WorkspaceMember[]; currentUserId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold">Team Overview</h3>
        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px]">
          Elite
        </Badge>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 grid grid-cols-5 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="col-span-2">Member</div>
          <div className="text-center">Systems</div>
          <div className="text-center">Streak</div>
          <div className="text-center">7-day rate</div>
        </div>
        {members.map((member) => (
          <CoachMemberRow
            key={member.userId}
            member={member}
            isMe={member.userId === currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

function CoachMemberRow({ member, isMe }: { member: WorkspaceMember; isMe: boolean }) {
  const { data: systems = [] } = useQuery<System[]>({
    queryKey: ["systems", member.userId],
    queryFn: () => getSystems(member.userId),
  });
  const { data: checkins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", member.userId],
    queryFn: () => getCheckins(member.userId),
  });

  const stats = useMemo(() => computeMemberStats(systems, checkins), [systems, checkins]);

  const rateColor =
    stats.weeklyRate >= 75
      ? "text-chart-3"
      : stats.weeklyRate >= 40
      ? "text-amber-500"
      : "text-destructive";

  return (
    <div
      className={cn(
        "px-4 py-3 grid grid-cols-5 gap-2 items-center border-t border-border/40 hover:bg-muted/20 transition-colors",
        isMe && "bg-primary/3",
      )}
      data-testid={`coach-row-${member.userId}`}
    >
      <div className="col-span-2 flex items-center gap-2 min-w-0">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarFallback className={cn(
            "text-[10px] font-bold",
            member.role === "owner"
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-primary/10 text-primary",
          )}>
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate leading-tight">
            {member.name}
            {isMe && <span className="text-muted-foreground text-[10px] ml-1">(you)</span>}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>

      <div className="text-center">
        <span className="text-sm font-semibold flex items-center justify-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          {stats.activeSystems}
        </span>
      </div>

      <div className="text-center">
        <span className={cn(
          "text-sm font-semibold flex items-center justify-center gap-1",
          stats.bestStreak > 0 ? "text-orange-500" : "text-muted-foreground",
        )}>
          <Flame className="w-3 h-3" />
          {stats.bestStreak}d
        </span>
      </div>

      <div className="text-center">
        <span className={cn("text-sm font-semibold tabular-nums", rateColor)}>
          {stats.weeklyRate}%
        </span>
        <div className="w-full bg-muted rounded-full h-1 mt-1">
          <div
            className={cn(
              "h-1 rounded-full transition-all",
              stats.weeklyRate >= 75 ? "bg-chart-3" : stats.weeklyRate >= 40 ? "bg-amber-400" : "bg-destructive",
            )}
            style={{ width: `${stats.weeklyRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { user } = useAppStore();
  const features = getPlanFeatures(user?.plan);
  const userId = user?.id ?? "";
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");

  const { data: workspace, isLoading } = useQuery<Workspace | null>({
    queryKey: ["workspace", userId],
    queryFn: async () => {
      const owned = await getWorkspaceByOwner(userId);
      if (owned) return owned;
      const member = await getWorkspaceByMember(userId);
      return member;
    },
    enabled: !!userId && features.teamWorkspace,
  });

  if (!features.teamWorkspace) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-full max-w-md">
          <PlanGate
            requiredPlan="elite"
            featureLabel="Team Workspace"
            description="Collaborate with your team, track everyone's progress in one place, and use the Coach Dashboard to keep your group accountable."
          />
        </div>
      </div>
    );
  }

  const hasWorkspace = !!workspace;
  const isOwner = workspace?.ownerId === userId;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Helmet>
        <title>Team Workspace | SystemForge</title>
      </Helmet>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">Team Workspace</h1>
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5" />
              Elite
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasWorkspace
              ? "Collaborate with your team and track collective progress."
              : "Create or join a workspace to get started."}
          </p>
        </div>

        {hasWorkspace && isOwner && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5">
            <Shield className="w-3 h-3 text-amber-500" />
            You own this workspace
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
          <Card
            className="border-amber-400/30 hover-elevate cursor-pointer"
            onClick={() => setMode("create")}
            data-testid="card-create-workspace"
          >
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

          <Card
            className="border-border/60 hover-elevate cursor-pointer"
            onClick={() => setMode("join")}
            data-testid="card-join-workspace"
          >
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
          <Button variant="ghost" size="sm" onClick={() => setMode("idle")} className="mb-4 text-xs gap-1">
            ← Back
          </Button>
          <CreateWorkspacePanel onCreated={() => setMode("idle")} />
        </div>
      )}

      {!isLoading && !hasWorkspace && mode === "join" && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMode("idle")} className="mb-4 text-xs gap-1">
            ← Back
          </Button>
          <JoinWorkspacePanel onJoined={() => setMode("idle")} />
        </div>
      )}

      {!isLoading && hasWorkspace && workspace && (
        <WorkspaceView workspace={workspace} currentUserId={userId} />
      )}
    </div>
  );
}
