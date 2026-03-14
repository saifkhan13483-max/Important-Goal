import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Goal, System } from "@/types/schema";
import { getGoal, updateGoal, deleteGoal } from "@/services/goals.service";
import { getSystemsByGoal, deleteSystem, updateSystem } from "@/services/systems.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Target, Zap, Calendar, Pencil, Trash2, Check,
  Archive, Plus, Play, Pause, MoreVertical, Clock, Repeat,
} from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const categories = ["fitness", "study", "career", "business", "relationship", "mindset", "health", "finance", "creativity", "other"];
const priorities = ["low", "medium", "high"];
const statuses = ["active", "completed", "archived", "paused"];

const priorityColors: Record<string, string> = {
  low: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  medium: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  archived: "bg-muted text-muted-foreground",
  paused: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const editSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().default("other"),
  priority: z.string().default("medium"),
  status: z.string().default("active"),
  deadline: z.string().optional(),
});

function GoalEditForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      priority: goal.priority,
      status: goal.status,
      deadline: goal.deadline || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof editSchema>) => updateGoal(goal.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal", goal.id] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal updated!" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl><Input placeholder="Goal title" {...field} data-testid="input-edit-goal-title" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
            <FormControl><Textarea placeholder="What does success look like?" rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-edit-goal-category">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="deadline" render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-goal-edit">
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const date = new Date(deadline);
  const now = new Date();
  const isOverdue = isPast(date) && !isWithinInterval(now, { start: date, end: date });
  const isDueSoon = isWithinInterval(date, { start: now, end: addDays(now, 7) });

  return (
    <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive" : isDueSoon ? "text-chart-4" : "text-muted-foreground"}`}>
      <Calendar className="w-3 h-3" />
      {isOverdue ? "Overdue · " : isDueSoon ? "Due soon · " : ""}
      {format(date, "MMM d, yyyy")}
    </span>
  );
}

function SystemCard({ system, goalId }: { system: System; goalId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleActive = useMutation({
    mutationFn: () => updateSystem(system.id, { active: !system.active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal-systems", goalId] });
      toast({ title: system.active ? "System paused" : "System activated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteSystem(system.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal-systems", goalId] });
      toast({ title: "System deleted" });
      setConfirmDelete(false);
    },
  });

  return (
    <>
      <Card className="hover-elevate" data-testid={`system-card-${system.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">{system.title}</p>
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${system.active ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-muted text-muted-foreground"}`}
                >
                  {system.active ? "Active" : "Paused"}
                </Badge>
              </div>
              {system.triggerStatement && (
                <p className="text-xs text-muted-foreground line-clamp-2">{system.triggerStatement}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {system.frequency && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {system.frequency}
                  </span>
                )}
                {system.preferredTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {system.preferredTime}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="w-7 h-7 flex-shrink-0">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/systems/${system.id}/edit`} data-testid={`button-edit-system-${system.id}`}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleActive.mutate()}>
                  {system.active ? <Pause className="w-3.5 h-3.5 mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />}
                  {system.active ? "Pause" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
              onClick={() => deleteMut.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function GoalDetail() {
  const [, params] = useRoute("/goals/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const goalId = params?.id ?? "";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: goal, isLoading: goalLoading } = useQuery<Goal | null>({
    queryKey: ["goal", goalId],
    queryFn: () => getGoal(goalId),
    enabled: !!goalId,
  });

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["goal-systems", goalId],
    queryFn: () => getSystemsByGoal(goalId),
    enabled: !!goalId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGoal(goalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal deleted" });
      navigate("/goals");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const quickStatus = useMutation({
    mutationFn: (status: string) => updateGoal(goalId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal", goalId] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal updated!" });
    },
  });

  if (goalLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-24">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Goal not found</h2>
        <p className="text-muted-foreground text-sm mb-6">This goal may have been deleted.</p>
        <Link href="/goals">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Goals
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/goals">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2" data-testid="button-back-to-goals">
            <ArrowLeft className="w-4 h-4" />
            Goals
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            data-testid="button-edit-goal-detail"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="w-8 h-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {goal.status !== "completed" && (
                <DropdownMenuItem onClick={() => quickStatus.mutate("completed")} data-testid="button-complete-goal">
                  <Check className="w-3.5 h-3.5 mr-2" />Mark as complete
                </DropdownMenuItem>
              )}
              {goal.status !== "archived" && (
                <DropdownMenuItem onClick={() => quickStatus.mutate("archived")}>
                  <Archive className="w-3.5 h-3.5 mr-2" />Archive goal
                </DropdownMenuItem>
              )}
              {(goal.status === "completed" || goal.status === "archived") && (
                <DropdownMenuItem onClick={() => quickStatus.mutate("active")}>
                  <Play className="w-3.5 h-3.5 mr-2" />Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive"
                data-testid="button-delete-goal-detail"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />Delete goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Goal header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-snug mb-2" data-testid="text-goal-title">
                {goal.title}
              </h1>
              {goal.description && (
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{goal.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-xs capitalize ${statusColors[goal.status] || ""}`}>
                  {goal.status}
                </Badge>
                <Badge variant="outline" className={`text-xs capitalize ${priorityColors[goal.priority] || ""}`}>
                  {goal.priority} priority
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize">
                  {goal.category}
                </Badge>
                {goal.deadline && <DeadlineBadge deadline={goal.deadline} />}
              </div>
            </div>
          </div>
          {goal.createdAt && (
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
              Created {format(new Date(goal.createdAt), "MMMM d, yyyy")}
              {goal.updatedAt && goal.updatedAt !== goal.createdAt && (
                <> · Updated {format(new Date(goal.updatedAt), "MMMM d, yyyy")}</>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Systems section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Systems
              <Badge variant="secondary" className="text-xs">{systems.length}</Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily systems attached to this goal</p>
          </div>
          <Link href={`/systems/new?goalId=${goalId}`}>
            <Button size="sm" data-testid="button-add-system-to-goal">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add System
            </Button>
          </Link>
        </div>

        {systemsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : systems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">No systems yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Build a system to define how you'll achieve this goal every day.
              </p>
              <Link href={`/systems/new?goalId=${goalId}`}>
                <Button size="sm" data-testid="button-create-first-system">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create System
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {systems.map(s => (
              <SystemCard key={s.id} system={s} goalId={goalId} />
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <GoalEditForm goal={goal} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goal.title}"? This will also remove all associated systems. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteMutation.mutate()}
              data-testid="button-confirm-delete-goal-detail"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
