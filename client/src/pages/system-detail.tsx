import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { System, Goal } from "@/types/schema";
import { getSystem, updateSystem, deleteSystem, createSystem } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Zap, Target, Clock, CheckSquare, Trophy, ShieldCheck, Brain, Heart, Repeat,
  MoreVertical, Pencil, Pause, Play, Copy, Trash2, ExternalLink,
} from "lucide-react";
import { useState } from "react";

const frequencyLabels: Record<string, string> = {
  daily: "Daily", weekdays: "Weekdays", weekends: "Weekends", weekly: "Weekly",
};

const timeLabels: Record<string, string> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening", flexible: "Flexible",
};

type FieldRowProps = { icon: React.ElementType; label: string; value?: string | null; color?: string };

function FieldRow({ icon: Icon, label, value, color = "text-muted-foreground" }: FieldRowProps) {
  if (!value) return null;
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-muted/40 items-start">
      <div className={`mt-0.5 flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p className="text-sm leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

export default function SystemDetailPage() {
  const [, params] = useRoute("/systems/:id");
  const id = params?.id ?? "";
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: system, isLoading } = useQuery<System | null>({
    queryKey: ["system", id],
    queryFn: () => getSystem(id),
    enabled: !!id,
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const linkedGoal = system?.goalId ? goals.find(g => g.id === system.goalId) : null;

  const toggleActive = useMutation({
    mutationFn: ({ active }: { active: boolean }) => updateSystem(id, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system", id] });
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: system?.active ? "System paused" : "System reactivated" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => {
      if (!system) throw new Error("No system");
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = system;
      return createSystem(userId, { ...rest, title: `${system.title} (copy)` });
    },
    onSuccess: (dup) => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System duplicated", description: "A copy has been created." });
      navigate(`/systems/${dup.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSystem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: "System deleted" });
      navigate("/systems");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-semibold text-lg mb-2">System not found</h2>
        <p className="text-muted-foreground text-sm mb-6">This system may have been deleted.</p>
        <Button onClick={() => navigate("/systems")} variant="outline">Back to Systems</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/systems")} data-testid="button-back-systems">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{system.title}</h1>
            <Badge
              variant="outline"
              className={system.active ? "text-chart-3 border-chart-3/30" : "text-muted-foreground"}
              data-testid="badge-system-status"
            >
              {system.active ? "Active" : "Paused"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            {system.frequency && (
              <span className="flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                {frequencyLabels[system.frequency] || system.frequency}
              </span>
            )}
            {system.preferredTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLabels[system.preferredTime] || system.preferredTime}
              </span>
            )}
            {linkedGoal && (
              <Link href={`/goals/${linkedGoal.id}`}>
                <span className="flex items-center gap-1 text-primary hover:underline cursor-pointer">
                  <Target className="w-3 h-3" />
                  {linkedGoal.title}
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/checkins">
            <Button size="sm" variant="outline" data-testid="button-check-in">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              Check In
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="w-8 h-8" data-testid="button-system-actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/systems/${id}/edit`} data-testid="button-edit-system">
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit system
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleActive.mutate({ active: !system.active })}
                data-testid="button-toggle-active"
              >
                {system.active
                  ? <><Pause className="w-3.5 h-3.5 mr-2" />Pause</>
                  : <><Play className="w-3.5 h-3.5 mr-2" />Reactivate</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
                data-testid="button-duplicate-system"
              >
                <Copy className="w-3.5 h-3.5 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDelete(true)}
                data-testid="button-delete-system"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">System Blueprint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FieldRow icon={Brain} label="Identity Statement" value={system.identityStatement} color="text-primary" />
          <FieldRow icon={Target} label="Target Outcome" value={system.targetOutcome} color="text-chart-2" />
          <FieldRow icon={Heart} label="Why It Matters" value={system.whyItMatters} color="text-chart-5" />
          <FieldRow icon={Zap} label="Trigger" value={system.triggerStatement} color="text-chart-3" />
          <FieldRow icon={CheckSquare} label="Minimum Action" value={system.minimumAction} color="text-chart-4" />
          <FieldRow icon={Trophy} label="Reward Plan" value={system.rewardPlan} color="text-chart-4" />
          <FieldRow icon={ShieldCheck} label="Fallback Plan" value={system.fallbackPlan} color="text-muted-foreground" />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href={`/systems/${id}/edit`} className="flex-1">
          <Button variant="outline" className="w-full" data-testid="button-edit-system-bottom">
            <Pencil className="w-4 h-4 mr-2" />
            Edit System
          </Button>
        </Link>
        <Link href="/checkins" className="flex-1">
          <Button className="w-full" data-testid="button-check-in-bottom">
            <CheckSquare className="w-4 h-4 mr-2" />
            Log Today's Check-In
          </Button>
        </Link>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{system.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
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
