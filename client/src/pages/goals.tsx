import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppStore } from "@/store/auth.store";
import type { Goal, GoalMilestone } from "@/types/schema";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/services/goals.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Pencil, Trash2, Search, Calendar, Check, Archive, Loader2, MoreVertical, ChevronRight, Zap, Lightbulb, ArrowLeft, ArrowRight, Flag, CheckCircle2, Milestone } from "lucide-react";
import { format, isPast, isWithinInterval, addDays, startOfDay } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

const categories = ["fitness", "study", "career", "business", "relationship", "mindset", "health", "finance", "creativity", "other"];
const priorities = ["low", "medium", "high"];
const statuses = ["active", "completed", "archived", "paused"];

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().default("other"),
  priority: z.string().default("medium"),
  status: z.string().default("active"),
  deadline: z.string().optional(),
});

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

function DeadlineBadge({ deadline }: { deadline: string }) {
  const date = startOfDay(new Date(deadline));
  const now = new Date();
  const isOverdue = isPast(date) && !isWithinInterval(now, { start: date, end: new Date(date.getTime() + 86400000 - 1) });
  const isDueSoon = !isOverdue && isWithinInterval(date, { start: startOfDay(now), end: addDays(startOfDay(now), 7) });
  return (
    <span className={`text-xs flex items-center gap-1 ml-auto flex-shrink-0 ${isOverdue ? "text-destructive font-medium" : isDueSoon ? "text-chart-4 font-medium" : "text-muted-foreground"}`}>
      <Calendar className="w-3 h-3" />
      {isOverdue ? "Overdue · " : isDueSoon ? "Due soon · " : ""}
      {format(new Date(deadline), "MMM d, yyyy")}
    </span>
  );
}

const WIZARD_STEPS = [
  { label: "Target",     icon: Target   },
  { label: "Outcome",    icon: CheckCircle2 },
  { label: "Deadline",   icon: Flag     },
  { label: "Milestones", icon: Milestone },
];

function GoalForm({ goal, userId, onClose }: { goal?: Goal; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const isEdit = !!goal;
  const [step, setStep] = useState(isEdit ? 4 : 0);

  const [title, setTitle]                     = useState(goal?.title || "");
  const [category, setCategory]               = useState(goal?.category || "other");
  const [priority, setPriority]               = useState(goal?.priority || "medium");
  const [measurableOutcome, setMeasurableOutcome] = useState(goal?.measurableOutcome || "");
  const [deadline, setDeadline]               = useState(goal?.deadline || "");
  const [status, setStatus]                   = useState(goal?.status || "active");
  const [milestones, setMilestones]           = useState<GoalMilestone[]>(
    goal?.milestones?.length ? goal.milestones : [{ month: "Month 1", target: "" }]
  );

  const mutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      goal
        ? updateGoal(goal.id, data)
        : createGoal(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", userId] });
      toast({ title: goal ? "Goal updated!" : "Goal created!", description: goal ? "Changes saved." : "Ready to build a system." });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    mutation.mutate({
      title,
      category,
      priority,
      status,
      deadline: deadline || undefined,
      measurableOutcome: measurableOutcome || undefined,
      milestones: milestones.filter(m => m.target),
    });
  };

  const addMilestone = () => {
    if (milestones.length >= 4) return;
    setMilestones(ms => [...ms, { month: `Month ${ms.length + 1}`, target: "" }]);
  };

  const removeMilestone = (i: number) => {
    setMilestones(ms => ms.filter((_, idx) => idx !== i));
  };

  const updateMilestone = (i: number, field: keyof GoalMilestone, value: string) => {
    setMilestones(ms => ms.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  if (isEdit) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Goal Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Get fit and build strength" data-testid="input-goal-title" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
              <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deadline</label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} data-testid="input-goal-deadline" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Measurable Outcome <span className="text-muted-foreground">(optional)</span></label>
          <Input value={measurableOutcome} onChange={e => setMeasurableOutcome(e.target.value)} placeholder="e.g. Run 5km under 30 min" data-testid="input-measurable-outcome" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-goal">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step progress */}
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < step ? "bg-primary border-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Target */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-0.5">What's your goal?</h3>
            <p className="text-xs text-muted-foreground">Give your goal a clear, inspiring title.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Goal Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Run my first marathon" autoFocus data-testid="input-goal-title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setStep(1)} disabled={!title.trim()} data-testid="button-next-step">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* Step 1: Measurable Outcome */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-0.5">How will you know you've won?</h3>
            <p className="text-xs text-muted-foreground">Define a specific, measurable result. Numbers are best.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Measurable Outcome</label>
            <Input
              value={measurableOutcome}
              onChange={e => setMeasurableOutcome(e.target.value)}
              placeholder="e.g. Complete 5km run in under 30 minutes"
              autoFocus
              data-testid="input-measurable-outcome"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Lose 10 lbs", "Read 12 books", "Save $5,000"].map(ex => (
              <button key={ex} type="button" onClick={() => setMeasurableOutcome(ex)}
                className="text-xs px-2 py-1.5 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-left">
                {ex}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(2)} data-testid="button-next-step">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* Step 2: Deadline */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-0.5">When will you finish?</h3>
            <p className="text-xs text-muted-foreground">A deadline creates urgency. Pick a real date.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Date</label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} autoFocus data-testid="input-goal-deadline" />
          </div>
          {deadline && (
            <div className="p-3 rounded-lg bg-primary/8 border border-primary/20 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">
                You have <strong>{Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 86400000))} days</strong> to achieve this.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!deadline} data-testid="button-next-step">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* Step 3: Milestones */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-0.5">Break it into monthly wins</h3>
            <p className="text-xs text-muted-foreground">Add 2–4 checkpoints to track your progress along the way.</p>
          </div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={m.month}
                    onChange={e => updateMilestone(i, "month", e.target.value)}
                    placeholder="Month 1"
                    data-testid={`input-milestone-month-${i}`}
                  />
                  <Input
                    value={m.target}
                    onChange={e => updateMilestone(i, "target", e.target.value)}
                    placeholder="e.g. Run 2km without stopping"
                    data-testid={`input-milestone-target-${i}`}
                  />
                </div>
                {milestones.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMilestone(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {milestones.length < 4 && (
            <Button type="button" variant="outline" size="sm" onClick={addMilestone} className="w-full" data-testid="button-add-milestone">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Milestone
            </Button>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-goal">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Goal 🎯
            </Button>
          </DialogFooter>
        </div>
      )}
    </div>
  );
}

export default function Goals() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | undefined>();
  const [deleteGoalItem, setDeleteGoalItem] = useState<Goal | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["goals", userId] });
      const previous = qc.getQueryData<Goal[]>(["goals", userId]);
      qc.setQueryData<Goal[]>(["goals", userId], old => (old ?? []).filter(g => g.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["goals", userId], ctx.previous);
      toast({ title: "Failed to delete goal", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Goal deleted" });
      setDeleteGoalItem(undefined);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["goals", userId] }),
  });

  const quickStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateGoal(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["goals", userId] });
      const previous = qc.getQueryData<Goal[]>(["goals", userId]);
      qc.setQueryData<Goal[]>(["goals", userId], old =>
        (old ?? []).map(g => g.id === id ? { ...g, status } : g)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["goals", userId], ctx.previous);
      toast({ title: "Failed to update goal status", variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["goals", userId] }),
  });

  const filtered = goals.filter(g => {
    const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase()) || (g.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || g.status === filterStatus;
    const matchCat = filterCategory === "all" || g.category === filterCategory;
    const matchPriority = filterPriority === "all" || g.priority === filterPriority;
    return matchSearch && matchStatus && matchCat && matchPriority;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Goals</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{goals.length} goal{goals.length !== 1 ? "s" : ""} total</p>
        </div>
        <Button onClick={() => { setEditGoal(undefined); setDialogOpen(true); }} data-testid="button-new-goal">
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Educational hint: goals vs systems — shown to new users */}
      {goals.length === 0 && !isLoading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20" data-testid="hint-goals-education">
          <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">Goals give you direction. Systems create progress.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A goal is the destination — "I want to get fit." A system is the vehicle — "After breakfast, I do 5 pushups."
              Start with a goal here, then build a system to make daily progress automatic.
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/systems/new">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                  <Zap className="w-3 h-3" />
                  Build a system
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-goals"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36" data-testid="select-filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36" data-testid="select-filter-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{search || filterStatus !== "all" || filterCategory !== "all" || filterPriority !== "all" ? "No matching goals" : "No goals yet"}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search || filterStatus !== "all" || filterCategory !== "all" || filterPriority !== "all" ? "Try adjusting your search or filters." : "Create your first goal to get started."}
            </p>
            {!search && filterStatus === "all" && filterCategory === "all" && filterPriority === "all" && (
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-goal-empty">Create Goal</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(goal => (
            <Card key={goal.id} className="hover-elevate group" data-testid={`goal-card-${goal.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link href={`/goals/${goal.id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                      {goal.title}
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </h3>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="w-7 h-7 flex-shrink-0" data-testid={`button-goal-menu-${goal.id}`}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditGoal(goal); setDialogOpen(true); }} data-testid={`button-edit-goal-${goal.id}`}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      {goal.status !== "completed" && (
                        <DropdownMenuItem onClick={() => quickStatus.mutate({ id: goal.id, status: "completed" })}>
                          <Check className="w-3.5 h-3.5 mr-2" />Mark complete
                        </DropdownMenuItem>
                      )}
                      {goal.status !== "archived" && (
                        <DropdownMenuItem onClick={() => quickStatus.mutate({ id: goal.id, status: "archived" })}>
                          <Archive className="w-3.5 h-3.5 mr-2" />Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteGoalItem(goal)}
                        className="text-destructive"
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {goal.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{goal.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs capitalize ${statusColors[goal.status] || ""}`}>{goal.status}</Badge>
                  <Badge variant="outline" className={`text-xs capitalize ${priorityColors[goal.priority] || ""}`}>{goal.priority}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{goal.category}</Badge>
                  {goal.deadline && <DeadlineBadge deadline={goal.deadline} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-goal-form">
          <DialogHeader>
            <DialogTitle>{editGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
          </DialogHeader>
          <GoalForm goal={editGoal} userId={userId} onClose={() => { setDialogOpen(false); setEditGoal(undefined); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGoalItem} onOpenChange={() => setDeleteGoalItem(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteGoalItem?.title}"? This will also delete all associated systems and check-ins. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteGoalItem && deleteMutation.mutate(deleteGoalItem.id)}
              data-testid="button-confirm-delete-goal"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
