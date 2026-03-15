import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAppStore } from "@/store/auth.store";
import type { System, Goal } from "@/types/schema";
import { getSystems, updateSystem, deleteSystem, createSystem } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Plus, Trash2, Pause, Play, MoreVertical, Target, Clock, Repeat, Copy,
  ArrowRight, Sparkles, ChevronRight,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

function SystemCard({
  system,
  goalTitle,
  onToggleActive,
  onDuplicate,
  onDelete,
}: {
  system: System;
  goalTitle?: string | null;
  onToggleActive: (id: string, active: boolean) => void;
  onDuplicate: (system: System) => void;
  onDelete: (system: System) => void;
}) {
  const isActive = system.active;

  return (
    <Card
      className={cn(
        "hover-elevate transition-all border",
        isActive ? "border-border/60" : "border-border/30 opacity-75",
      )}
      data-testid={`system-card-${system.id}`}
    >
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {/* Status indicator */}
            <div className={cn(
              "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ring-2",
              isActive
                ? "bg-chart-3 ring-chart-3/30"
                : "bg-muted-foreground/40 ring-muted-foreground/10",
            )} />
            <div className="min-w-0">
              <Link href={`/systems/${system.id}`}>
                <h3
                  className="font-semibold text-sm leading-snug hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                  data-testid={`link-system-${system.id}`}
                >
                  {system.title}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h3>
              </Link>
              {!isActive && (
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Paused</span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 flex-shrink-0"
                data-testid={`button-system-menu-${system.id}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/systems/${system.id}`} data-testid={`button-view-system-${system.id}`}>
                  View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/systems/${system.id}/edit`} data-testid={`button-edit-system-${system.id}`}>
                  Edit system
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggleActive(system.id, !system.active)}
                data-testid={`button-toggle-system-${system.id}`}
              >
                {system.active
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

        {/* Identity statement */}
        {system.identityStatement && (
          <p className="text-xs text-primary/80 italic mb-3 line-clamp-2 border-l-2 border-primary/30 pl-2">
            "{system.identityStatement}"
          </p>
        )}

        {/* Trigger */}
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

        {/* Badges footer */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
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
            <Badge variant="secondary" className="text-xs gap-1">
              <Clock className="w-3 h-3" />
              {timeLabels[system.preferredTime] || system.preferredTime}
            </Badge>
          )}
          {goalTitle && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
              <Target className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[100px]">{goalTitle}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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

  const qc = useQueryClient();
  const { toast } = useToast();
  const [deleteSystemItem, setDeleteSystemItem] = useState<System | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSystem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System deleted" });
      setDeleteSystemItem(undefined);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateSystem(id, { active }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
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
  });

  const getGoalTitle = (goalId?: string | null) => {
    if (!goalId) return null;
    return goals.find(g => g.id === goalId)?.title;
  };

  const activeSystems = systems.filter(s => s.active);
  const pausedSystems = systems.filter(s => !s.active);

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            My Systems
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {systems.length === 0
              ? "Turn your goals into daily habits"
              : `${activeSystems.length} active · ${pausedSystems.length} paused`}
          </p>
        </div>
        <Link href="/systems/new">
          <Button className="gap-2" data-testid="button-new-system">
            <Plus className="w-4 h-4" />
            Build System
          </Button>
        </Link>
      </div>

      {/* What is a system? — shown only for new users */}
      {systems.length === 0 && !isLoading && (
        <div className="rounded-xl border border-primary/20 bg-primary/4 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">What's a system?</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A system turns a goal into a daily action. Instead of "I want to get fit", a system says:
                "After I make coffee, I do 5 pushups." Simple. Repeatable. Backed by science.
                Our guided builder walks you through every step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : systems.length === 0 ? (
        <Card className="border-primary/20 bg-primary/3">
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No systems yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Build your first system in minutes. Answer 7 simple questions and we'll create your personalized daily habit.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/systems/new">
                <Button className="gap-2" data-testid="button-create-first-system">
                  <Zap className="w-4 h-4" />
                  Build Your First System
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="outline" className="gap-2" data-testid="button-browse-templates">
                  Browse Templates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active systems */}
          {activeSystems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-chart-3" />
                <h2 className="text-sm font-semibold text-foreground">Active Systems</h2>
                <span className="text-xs text-muted-foreground">({activeSystems.length})</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {activeSystems.map(system => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    goalTitle={getGoalTitle(system.goalId)}
                    onToggleActive={(id, active) => toggleActive.mutate({ id, active })}
                    onDuplicate={duplicateMutation.mutate}
                    onDelete={setDeleteSystemItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paused systems */}
          {pausedSystems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <h2 className="text-sm font-semibold text-muted-foreground">Paused Systems</h2>
                <span className="text-xs text-muted-foreground">({pausedSystems.length})</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {pausedSystems.map(system => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    goalTitle={getGoalTitle(system.goalId)}
                    onToggleActive={(id, active) => toggleActive.mutate({ id, active })}
                    onDuplicate={duplicateMutation.mutate}
                    onDelete={setDeleteSystemItem}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nudge to build more */}
      {systems.length > 0 && activeSystems.length < 5 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
          <div>
            <p className="text-sm font-medium">Ready to build another system?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Most successful users have 3–5 active systems.</p>
          </div>
          <Link href="/systems/new">
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" data-testid="button-build-another">
              Build another
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteSystemItem} onOpenChange={() => setDeleteSystemItem(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteSystemItem?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This system and all its check-in history will be permanently deleted. Consider pausing it instead if you might want to come back to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteSystemItem && deleteMutation.mutate(deleteSystemItem.id)}
              data-testid="button-confirm-delete-system"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
