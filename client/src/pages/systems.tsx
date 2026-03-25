import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAppStore } from "@/store/auth.store";
import type { System, Goal, Checkin } from "@/types/schema";
import { getSystems, updateSystem, deleteSystem, createSystem } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { getCheckins } from "@/services/checkins.service";
import { computeSystemHealthScore, computeAnalytics } from "@/services/analytics.service";
import { STATIC_TEMPLATES } from "@/services/templates.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Plus, Trash2, Pause, Play, MoreVertical, Target, Clock, Repeat, Copy,
  ArrowRight, Sparkles, ChevronRight, Activity, LayoutGrid, Brain, BookOpen,
  Dumbbell, Sunset, PenLine, Moon, Briefcase, Timer, Search, Flame,
  TrendingUp, CheckCircle2, X, Loader2, Lock,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { HabitStackBuilder } from "@/components/habit-stack-builder";
import { isAtSystemLimit, getPlanLimits, planDisplayName } from "@/lib/plan-limits";
import { subDays, format } from "date-fns";

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekends: "Weekends",
  weekly: "Weekly",
};

const timeLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  flexible: "Flexible",
  anytime: "Anytime",
};

const timeIcons: Record<string, string> = {
  morning: "🌅", afternoon: "☀️", evening: "🌙", flexible: "🕐", anytime: "🕐",
};

const CATEGORY_ICONS: Record<string, any> = {
  fitness: Dumbbell,
  reading: BookOpen,
  "deep-work": Brain,
  mindset: PenLine,
  meditation: Sunset,
  "content-creation": PenLine,
  "evening-reset": Moon,
  "job-search": Briefcase,
  "study-sprint": Timer,
};

function MiniActivityDots({ checkins, systemId }: { checkins: Checkin[]; systemId: string }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const key = format(date, "yyyy-MM-dd");
    const checkin = checkins.find(c => c.systemId === systemId && c.dateKey === key);
    return { key, status: checkin?.status };
  });

  return (
    <div className="flex items-center gap-1" title="Last 7 days">
      {days.map(d => (
        <div
          key={d.key}
          className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            d.status === "done" ? "bg-chart-3" :
            d.status === "skipped" ? "bg-chart-4/60" :
            "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

function SystemCard({
  system,
  goalTitle,
  goalId,
  systemCheckins,
  streak,
  onToggleActive,
  onDuplicate,
  onDelete,
}: {
  system: System;
  goalTitle?: string | null;
  goalId?: string | null;
  systemCheckins: Checkin[];
  streak: number;
  onToggleActive: (id: string, active: boolean) => void;
  onDuplicate: (system: System) => void;
  onDelete: (system: System) => void;
}) {
  const isActive = system.active;
  const health = computeSystemHealthScore(system, systemCheckins, streak);
  const completionRate = useMemo(() => {
    const done = systemCheckins.filter(c => c.status === "done").length;
    const total = systemCheckins.length;
    return total > 0 ? Math.round((done / total) * 100) : null;
  }, [systemCheckins]);

  return (
    <Card
      className={cn(
        "hover-elevate transition-all border group",
        isActive ? "border-border/60" : "border-border/30 opacity-70",
      )}
      data-testid={`system-card-${system.id}`}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ring-2",
              isActive ? "bg-chart-3 ring-chart-3/30" : "bg-muted-foreground/40 ring-muted-foreground/10",
            )} />
            <div className="min-w-0 flex-1">
              <Link href={`/systems/${system.id}`}>
                <h3
                  className="font-semibold text-sm leading-snug hover:text-primary transition-colors cursor-pointer"
                  data-testid={`link-system-${system.id}`}
                >
                  {system.title}
                </h3>
              </Link>
              {!isActive && (
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Paused</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Quick toggle button */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity",
                isActive ? "hover:text-chart-4" : "hover:text-chart-3"
              )}
              onClick={() => onToggleActive(system.id, !isActive)}
              title={isActive ? "Pause system" : "Resume system"}
              data-testid={`button-quick-toggle-${system.id}`}
            >
              {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7"
                  data-testid={`button-system-menu-${system.id}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/systems/${system.id}`} data-testid={`button-view-system-${system.id}`}>
                    <ChevronRight className="w-3.5 h-3.5 mr-2" />View details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/systems/${system.id}/edit`} data-testid={`button-edit-system-${system.id}`}>
                    <PenLine className="w-3.5 h-3.5 mr-2" />Edit system
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onToggleActive(system.id, !isActive)}
                  data-testid={`button-toggle-system-${system.id}`}
                >
                  {isActive
                    ? <><Pause className="w-3.5 h-3.5 mr-2 text-chart-4" />Pause</>
                    : <><Play className="w-3.5 h-3.5 mr-2 text-chart-3" />Reactivate</>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicate(system)}
                  data-testid={`button-duplicate-system-${system.id}`}
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(system)}
                  data-testid={`button-delete-system-${system.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Identity statement */}
        {system.identityStatement && (
          <p className="text-xs text-primary/80 italic mb-3 line-clamp-1 border-l-2 border-primary/30 pl-2">
            "{system.identityStatement}"
          </p>
        )}

        {/* Trigger pill */}
        {system.triggerStatement && (
          <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3 border border-border/30">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">When</p>
            <p className="text-xs text-foreground line-clamp-2">{system.triggerStatement}</p>
          </div>
        )}

        {/* Minimum action */}
        {system.minimumAction && (
          <div className="bg-chart-3/5 rounded-lg px-3 py-2 mb-3 border border-chart-3/15">
            <p className="text-[10px] text-chart-3 font-semibold uppercase tracking-wide mb-0.5">Minimum action</p>
            <p className="text-xs text-foreground line-clamp-2">{system.minimumAction}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-chart-4">
              <Flame className="w-3.5 h-3.5" />
              <span>{streak} day streak</span>
            </div>
          )}
          {completionRate !== null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3" />
              <span>{completionRate}% done</span>
            </div>
          )}
          {systemCheckins.length > 0 && (
            <div className="ml-auto">
              <MiniActivityDots checkins={systemCheckins} systemId={system.id} />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isActive ? "text-chart-3 border-chart-3/30 bg-chart-3/5" : "text-muted-foreground border-muted-foreground/20",
            )}
          >
            {isActive ? "Active" : "Paused"}
          </Badge>
          {system.frequency && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Repeat className="w-3 h-3" />
              {frequencyLabels[system.frequency] || system.frequency}
            </Badge>
          )}
          {system.preferredTime && (
            <Badge variant="secondary" className="text-xs">
              {timeIcons[system.preferredTime] || "🕐"} {timeLabels[system.preferredTime] || system.preferredTime}
            </Badge>
          )}
          {systemCheckins.length > 0 && (
            <Badge
              variant="outline"
              className={cn("text-xs gap-1 ml-auto", health.color, "border-current/30 bg-current/5")}
              data-testid={`badge-health-${system.id}`}
              title={`System health: ${health.score}/100`}
            >
              <Activity className="w-3 h-3" />
              {health.label}
            </Badge>
          )}
        </div>

        {/* Linked goal */}
        {goalTitle && goalId && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Link href={`/goals/${goalId}`}>
              <span className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
                <Target className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{goalTitle}</span>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
              </span>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const TABS = [
  { value: "all",    label: "All"    },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

export default function SystemsPage() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const [, navigate] = useLocation();

  const { data: systems = [], isLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const { data: allCheckins = [] } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const streaks = useMemo(() => {
    if (!allCheckins.length || !systems.length) return {} as Record<string, number>;
    return computeAnalytics(allCheckins, systems, []).streaks;
  }, [allCheckins, systems]);

  const qc = useQueryClient();
  const { toast } = useToast();
  const [deleteSystemItem, setDeleteSystemItem] = useState<System | undefined>();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSystem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System deleted" });
      setDeleteSystemItem(undefined);
    },
    onError: () => toast({ title: "Failed to delete system", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateSystem(id, { active }),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: ["systems", userId] });
      const previous = qc.getQueryData<System[]>(["systems", userId]);
      qc.setQueryData<System[]>(["systems", userId], old =>
        (old ?? []).map(s => s.id === id ? { ...s, active } : s)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["systems", userId], ctx.previous);
      toast({ title: "Failed to update system", variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["systems", userId] }),
    onSuccess: (_, vars) => {
      toast({ title: vars.active ? "System reactivated!" : "System paused." });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (system: System) => {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = system;
      return createSystem(userId, { ...rest, title: `${system.title} (copy)` });
    },
    onSuccess: (dup) => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System duplicated" });
      navigate(`/systems/${dup.id}`);
    },
    onError: () => toast({ title: "Failed to duplicate system", variant: "destructive" }),
  });

  const plan = user?.plan;
  const systemLimit = getPlanLimits(plan).systems;
  const atSystemLimit = isAtSystemLimit(plan, systems.length);

  const activeSystems = systems.filter(s => s.active);
  const pausedSystems = systems.filter(s => !s.active);
  const totalCheckins = allCheckins.length;

  const getGoalTitle = (goalId?: string | null) =>
    goalId ? goals.find(g => g.id === goalId)?.title ?? null : null;

  const handleNewSystem = (e: React.MouseEvent) => {
    if (atSystemLimit) {
      e.preventDefault();
      toast({
        title: "System limit reached",
        description: `Your ${planDisplayName(plan)} plan allows up to ${systemLimit} systems. Upgrade to create more.`,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = (system: System) => {
    if (atSystemLimit) {
      toast({
        title: "System limit reached",
        description: `Your ${planDisplayName(plan)} plan allows up to ${systemLimit} systems. Upgrade to create more.`,
        variant: "destructive",
      });
      return;
    }
    duplicateMutation.mutate(system);
  };

  const filtered = useMemo(() => systems.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.identityStatement || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.minimumAction || "").toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" || (activeTab === "active" ? s.active : !s.active);
    return matchSearch && matchTab;
  }), [systems, search, activeTab]);

  const tabCounts = useMemo(() => ({
    all: systems.length,
    active: activeSystems.length,
    paused: pausedSystems.length,
  }), [systems, activeSystems, pausedSystems]);

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div className="relative overflow-hidden gradient-brand text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-white/80" />
                <p className="text-white/70 text-xs sm:text-sm font-medium">My Systems</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 leading-tight">Build daily habits</h1>
              <p className="text-white/80 text-xs sm:text-sm">Turn your goals into repeatable systems that run on autopilot.</p>
            </div>
            <Link href="/systems/new" onClick={handleNewSystem}>
              <Button
                className="flex-shrink-0 bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
                size="sm"
                data-testid="button-new-system"
                disabled={atSystemLimit}
              >
                {atSystemLimit ? <Lock className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                <span className="hidden sm:inline">{atSystemLimit ? `Limit (${systems.length}/${systemLimit})` : "Build System"}</span>
                <span className="sm:hidden">{atSystemLimit ? "Limit" : "Build"}</span>
              </Button>
            </Link>
          </div>

          {/* Stats */}
          {!isLoading && systems.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
              {[
                { label: "Total",     value: systems.length,          icon: Zap          },
                { label: "Active",    value: activeSystems.length,    icon: TrendingUp   },
                { label: "Check-ins", value: totalCheckins,           icon: CheckCircle2 },
              ].map(stat => (
                <div key={stat.label} className="bg-white/10 rounded-xl p-2.5 sm:p-3 backdrop-blur-sm border border-white/20">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <stat.icon className="w-3 h-3 text-white/70" />
                    <p className="text-white/70 text-[10px] sm:text-xs font-medium">{stat.label}</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-4">
        {/* System limit nudge */}
        {atSystemLimit && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border bg-destructive/5 border-destructive/30 text-destructive text-sm" data-testid="banner-system-limit">
            <span className="flex items-center gap-2 text-xs sm:text-sm">
              <Lock className="w-4 h-4 flex-shrink-0" />
              You've reached the {systemLimit}-system limit on the {planDisplayName(plan)} plan.
            </span>
            <Link href="/pricing">
              <button className="flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline whitespace-nowrap text-primary" data-testid="link-upgrade-plan">
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade
              </button>
            </Link>
          </div>
        )}

        {/* Empty state for new users */}
        {systems.length === 0 && !isLoading && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold mb-1">What's a system?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A system turns a goal into a daily action. Instead of "I want to get fit", a system says:
                  "After I make coffee, I do 5 pushups." Simple. Repeatable. Backed by science.
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Start with a proven system</p>
              <p className="text-xs text-muted-foreground mb-4">Pick a template that fits your goal — you can customise everything.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {["t1", "t2", "t3", "t10", "t11", "t12"].map(id => {
                  const t = STATIC_TEMPLATES.find(tmpl => tmpl.id === id);
                  if (!t) return null;
                  const Icon = CATEGORY_ICONS[t.category] ?? Sparkles;
                  return (
                    <Link key={t.id} href={`/systems/new?template=${t.id}`}>
                      <Card className="cursor-pointer hover-elevate border-border/60 h-full" data-testid={`template-card-${t.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-snug">{t.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{t.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-3 pl-12">
                            <span className="text-xs font-medium text-primary">Use template</span>
                            <ArrowRight className="w-3 h-3 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground flex-shrink-0">or build from scratch</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/systems/new">
                <Button variant="outline" className="gap-2" data-testid="button-create-first-system">
                  <Zap className="w-4 h-4" />
                  Build Your Own System
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="ghost" className="gap-2" data-testid="button-browse-templates">
                  <LayoutGrid className="w-4 h-4" />
                  Browse All Templates
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Systems list (non-empty state) */}
        {systems.length > 0 && (
          <>
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search systems..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9"
                data-testid="input-search-systems"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {TABS.map(tab => {
                const count = tabCounts[tab.value as keyof typeof tabCounts];
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    data-testid={`tab-${tab.value}`}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                      activeTab === tab.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        activeTab === tab.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">
                  {search || activeTab !== "all" ? "No matching systems" : "No systems yet"}
                </h3>
                <p className="text-muted-foreground text-sm mb-5 max-w-xs">
                  {search || activeTab !== "all" ? "Try adjusting your search or filter." : "Build your first system to turn a goal into a daily habit."}
                </p>
                {!search && activeTab === "all" && (
                  <Link href="/systems/new">
                    <Button data-testid="button-create-first-system-empty">
                      <Plus className="w-4 h-4 mr-2" />Build System
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {filtered.map(system => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    goalTitle={getGoalTitle(system.goalId)}
                    goalId={system.goalId}
                    systemCheckins={allCheckins.filter(c => c.systemId === system.id)}
                    streak={streaks[system.id] ?? 0}
                    onToggleActive={(id, active) => toggleActive.mutate({ id, active })}
                    onDuplicate={handleDuplicate}
                    onDelete={setDeleteSystemItem}
                  />
                ))}
              </div>
            )}

            {/* Nudge to build more */}
            {!atSystemLimit && activeSystems.length > 0 && activeSystems.length < 5 && !search && activeTab !== "paused" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <p className="text-sm font-medium">Ready to build another system?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Most successful users have 3–5 active systems.</p>
                </div>
                <Link href="/systems/new">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0 w-full sm:w-auto" data-testid="button-build-another">
                    Build another
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Upgrade nudge */}
            {atSystemLimit && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-primary" />
                    System limit reached
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your {planDisplayName(plan)} plan allows up to {systemLimit} systems. Upgrade to create unlimited systems.
                  </p>
                </div>
                <Link href="/pricing">
                  <Button size="sm" className="gap-1.5 flex-shrink-0 w-full sm:w-auto" data-testid="button-upgrade-systems">
                    <Sparkles className="w-3.5 h-3.5" />
                    Upgrade
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Habit Stacking section */}
      {systems.length >= 2 && (
        <div className="px-4 sm:px-6 pb-6 max-w-5xl mx-auto">
          <HabitStackBuilder systems={systems} userId={user?.id ?? ""} />
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteSystemItem} onOpenChange={() => setDeleteSystemItem(undefined)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteSystemItem?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This system and all its check-in history will be permanently deleted. Consider pausing it instead if you might come back to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              onClick={() => deleteSystemItem && deleteMutation.mutate(deleteSystemItem.id)}
              data-testid="button-confirm-delete-system"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
