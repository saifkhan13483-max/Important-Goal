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
import { Zap, Plus, Trash2, Pause, Play, MoreVertical, Target, Clock, Repeat, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System updated" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (system: System) => {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = system;
      return createSystem(userId, { ...rest, title: `${system.title} (copy)` });
    },
    onSuccess: (dup) => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System duplicated", description: "A copy has been created." });
      navigate(`/systems/${dup.id}`);
    },
  });

  const getGoalTitle = (goalId?: string | null) => {
    if (!goalId) return null;
    return goals.find(g => g.id === goalId)?.title;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Systems</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{systems.length} system{systems.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/systems/new">
            <Button data-testid="button-new-system">
              <Plus className="w-4 h-4 mr-2" />
              Build System
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : systems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No systems yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Systems are the engine of lasting change. Build your first one in minutes with our guided builder.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/systems/new">
                <Button data-testid="button-create-first-system">Build Your First System</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {systems.map(system => {
            const goalTitle = getGoalTitle(system.goalId);
            return (
              <Card key={system.id} className="hover-elevate" data-testid={`system-card-${system.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${system.active ? "bg-chart-3" : "bg-muted-foreground"}`} />
                      <Link href={`/systems/${system.id}`}>
                        <h3 className="font-semibold text-sm truncate hover:underline cursor-pointer" data-testid={`link-system-${system.id}`}>
                          {system.title}
                        </h3>
                      </Link>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="w-7 h-7 flex-shrink-0" data-testid={`button-system-menu-${system.id}`}>
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                        <DropdownMenuItem onClick={() => toggleActive.mutate({ id: system.id, active: !system.active })}>
                          {system.active ? <><Pause className="w-3.5 h-3.5 mr-2" />Pause</> : <><Play className="w-3.5 h-3.5 mr-2" />Reactivate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateMutation.mutate(system)}
                          disabled={duplicateMutation.isPending}
                          data-testid={`button-duplicate-system-${system.id}`}
                        >
                          <Copy className="w-3.5 h-3.5 mr-2" />Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteSystemItem(system)}
                          data-testid={`button-delete-system-${system.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {system.identityStatement && (
                    <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">"{system.identityStatement}"</p>
                  )}

                  {system.triggerStatement && (
                    <div className="bg-muted/40 rounded-md px-3 py-2 mb-3">
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Trigger</p>
                      <p className="text-xs text-foreground line-clamp-2">{system.triggerStatement}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${system.active ? "text-chart-3 border-chart-3/30" : "text-muted-foreground"}`}>
                      {system.active ? "Active" : "Paused"}
                    </Badge>
                    {system.frequency && (
                      <Badge variant="secondary" className="text-xs">
                        <Repeat className="w-3 h-3 mr-1" />
                        {frequencyLabels[system.frequency] || system.frequency}
                      </Badge>
                    )}
                    {system.preferredTime && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeLabels[system.preferredTime] || system.preferredTime}
                      </Badge>
                    )}
                    {goalTitle && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                        <Target className="w-3 h-3" />
                        <span className="truncate max-w-28">{goalTitle}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteSystemItem} onOpenChange={() => setDeleteSystemItem(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSystemItem?.title}"? All associated check-ins will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteSystemItem && deleteMutation.mutate(deleteSystemItem.id)}
              data-testid="button-confirm-delete-system"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
