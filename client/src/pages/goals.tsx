import { useState, useMemo } from "react";
import { track } from "@/lib/track";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import type { Goal, GoalMilestone } from "@/types/schema";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/services/goals.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Plus, Pencil, Trash2, Search, Calendar, Check, Archive,
  Loader2, MoreVertical, ChevronRight, Zap, Lightbulb, ArrowLeft,
  ArrowRight, Flag, CheckCircle2, Milestone, Eye, Lock, Sparkles,
  TrendingUp, Filter, X, LayoutGrid, List, SlidersHorizontal,
} from "lucide-react";
import { format, isPast, isWithinInterval, addDays, startOfDay, differenceInDays } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { isAtGoalLimit, getPlanLimits } from "@/lib/plan-limits";
import type { PlanTier } from "@/types/schema";
import { cn } from "@/lib/utils";

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

const categoryIcons: Record<string, string> = {
  fitness: "🏃", study: "📚", career: "💼", business: "🚀",
  relationship: "❤️", mindset: "🧠", health: "💊", finance: "💰",
  creativity: "🎨", other: "⭐",
};

function DeadlineBadge({ deadline }: { deadline: string }) {
  const date = startOfDay(new Date(deadline));
  const now = new Date();
  const isOverdue = isPast(date) && !isWithinInterval(now, { start: date, end: new Date(date.getTime() + 86400000 - 1) });
  const isDueSoon = !isOverdue && isWithinInterval(date, { start: startOfDay(now), end: addDays(startOfDay(now), 7) });
  return (
    <span className={`text-xs flex items-center gap-1 flex-shrink-0 ${isOverdue ? "text-destructive font-medium" : isDueSoon ? "text-chart-4 font-medium" : "text-muted-foreground"}`}>
      <Calendar className="w-3 h-3" />
      {isOverdue ? "Overdue · " : isDueSoon ? "Due soon · " : ""}
      {format(new Date(deadline), "MMM d, yyyy")}
    </span>
  );
}

const WIZARD_STEPS = [
  { label: "Target",     icon: Target      },
  { label: "Outcome",    icon: CheckCircle2},
  { label: "Deadline",   icon: Flag        },
  { label: "Milestones", icon: Milestone   },
  { label: "Preview",    icon: Eye         },
];

const CATEGORY_EXAMPLES: Record<string, { target: string; outcome: string; milestones: string[] }> = {
  fitness:      { target: "Run a 5K in under 30 minutes", outcome: "Complete a timed 5K run in 28 min or less", milestones: ["Run 2km without stopping", "Run 3km in 22 min", "Complete a 5K at any pace"] },
  career:       { target: "Get promoted to a senior role", outcome: "Receive an official promotion with a 20% salary increase", milestones: ["Complete 3 high-impact projects", "Request feedback from manager", "Lead a team initiative"] },
  study:        { target: "Complete a Python programming course and build 2 projects", outcome: "Score 90%+ on final exam and have 2 deployed GitHub projects", milestones: ["Complete Python basics module", "Build first project", "Deploy both projects publicly"] },
  relationship: { target: "Deepen connection with my partner through daily rituals", outcome: "30 straight days of dedicated quality time together", milestones: ["Establish a weekly date night", "Create a daily check-in habit", "Plan a shared experience"] },
  business:     { target: "Launch a side business and make my first sale", outcome: "Generate $500 in revenue in 90 days", milestones: ["Validate the idea with 5 potential customers", "Launch a landing page", "Make first paid sale"] },
  mindset:      { target: "Build a daily meditation practice", outcome: "Meditate 20 minutes daily for 60 consecutive days", milestones: ["Meditate 5 min daily for 2 weeks", "Increase to 10 min for 2 weeks", "Reach 20 min sessions"] },
  health:       { target: "Reduce stress and improve sleep quality", outcome: "Average 7.5 hours of sleep tracked over 30 days", milestones: ["Set a consistent bedtime for 2 weeks", "Remove screens 1hr before bed", "Track sleep quality for a full month"] },
  finance:      { target: "Build a 3-month emergency fund", outcome: "Save $5,000 in a dedicated savings account", milestones: ["Save first $1,000", "Save $2,500", "Reach $5,000 goal"] },
  creativity:   { target: "Complete a creative project from start to finish", outcome: "Publish or share a finished creative work publicly", milestones: ["Outline the project", "Complete a first draft", "Revise and prepare for sharing"] },
  other:        { target: "Achieve a meaningful personal goal", outcome: "Have a clear, measurable result you can point to", milestones: ["Complete phase 1", "Reach the halfway point", "Cross the finish line"] },
};

function ExampleHint({ label, value, onUse }: { label: string; value: string; onUse: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onUse(value)}
      className="text-left text-xs px-3 py-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground leading-snug"
      data-testid={`example-hint-${label}`}
    >
      <span className="font-semibold text-primary mr-1">e.g.</span>{value}
    </button>
  );
}

function GoalForm({ goal, userId, onClose }: { goal?: Goal; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const isEdit = !!goal;
  const [step, setStep] = useState(isEdit ? 4 : 0);

  const [title, setTitle]                     = useState(goal?.title || "");
  const [category, setCategory]               = useState(goal?.category || "other");
  const [priority, setPriority]               = useState<Goal['priority']>(goal?.priority || "medium");
  const [measurableOutcome, setMeasurableOutcome] = useState(goal?.measurableOutcome || "");
  const [deadline, setDeadline]               = useState(goal?.deadline || "");
  const [status, setStatus]                   = useState<Goal['status']>(goal?.status || "active");
  const [milestones, setMilestones]           = useState<GoalMilestone[]>(
    goal?.milestones?.length ? goal.milestones : [{ month: "Month 1", target: "" }]
  );

  const mutation = useMutation({
    mutationFn: (data: Partial<Goal> & Pick<Goal, "title" | "status" | "category" | "priority">) =>
      goal
        ? updateGoal(goal.id, data)
        : createGoal(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", userId] });
      if (!goal) track("goal_created", { category });
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
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{categoryIcons[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={v => setPriority(v as Goal['priority'])}>
              <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
              <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={v => setStatus(v as Goal['status'])}>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Milestones <span className="text-muted-foreground">(optional)</span></label>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input value={m.month} onChange={e => updateMilestone(i, "month", e.target.value)} placeholder="Month 1" data-testid={`input-milestone-month-${i}`} />
                  <Input value={m.target} onChange={e => updateMilestone(i, "target", e.target.value)} placeholder="Target" data-testid={`input-milestone-target-${i}`} />
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
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-goal" className="w-full sm:w-auto">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step progress */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < step ? "bg-primary border-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] hidden sm:block ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Target */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-0.5">What exactly do you want to achieve?</h3>
            <p className="text-xs text-muted-foreground">Be specific — vague goals stay wishes. A clear target becomes a system.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Goal Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Run my first marathon" autoFocus data-testid="input-goal-title" />
            {!title.trim() && (
              <ExampleHint label="target" value={CATEGORY_EXAMPLES[category]?.target ?? CATEGORY_EXAMPLES.other.target} onUse={v => setTitle(v)} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{categoryIcons[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={v => setPriority(v as Goal['priority'])}>
                <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={() => setStep(1)} disabled={!title.trim()} data-testid="button-next-step" className="w-full sm:w-auto">
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
          {!measurableOutcome.trim() && (
            <ExampleHint label="outcome" value={CATEGORY_EXAMPLES[category]?.outcome ?? CATEGORY_EXAMPLES.other.outcome} onUse={v => setMeasurableOutcome(v)} />
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setStep(0)} className="w-full sm:w-auto"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(2)} data-testid="button-next-step" className="w-full sm:w-auto">
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
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="w-full sm:w-auto"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} disabled={!deadline} data-testid="button-next-step" className="w-full sm:w-auto">
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
          {(CATEGORY_EXAMPLES[category]?.milestones ?? []).length > 0 && milestones.every(m => !m.target.trim()) && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Suggestions for {category}:</p>
              {(CATEGORY_EXAMPLES[category]?.milestones ?? CATEGORY_EXAMPLES.other.milestones).map((ex, i) => (
                <button key={i} type="button"
                  onClick={() => setMilestones(ms => ms.map((m, idx) => idx === i ? { ...m, target: ex } : m))}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground"
                  data-testid={`milestone-suggestion-${i}`}
                >
                  <span className="font-semibold text-primary mr-1">Month {i + 1}:</span>{ex}
                </button>
              ))}
            </div>
          )}
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
                    placeholder="e.g. Run 2km"
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
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="w-full sm:w-auto"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(4)} data-testid="button-next-step" className="w-full sm:w-auto">
              Preview <Eye className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* Step 4: Structure Preview */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base mb-0.5">Your Goal Structure</h3>
            <p className="text-xs text-muted-foreground">Review your goal before saving. This is the blueprint for your system.</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3" data-testid="goal-structure-preview">
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{categoryIcons[category] || "⭐"}</span>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Target</p>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs capitalize">{category}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{priority} priority</Badge>
                </div>
              </div>
            </div>
            {measurableOutcome && (
              <div className="flex items-start gap-2 pt-2 border-t border-primary/10">
                <CheckCircle2 className="w-4 h-4 text-chart-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Measurable Outcome</p>
                  <p className="text-sm text-foreground">{measurableOutcome}</p>
                </div>
              </div>
            )}
            {deadline && (
              <div className="flex items-start gap-2 pt-2 border-t border-primary/10">
                <Flag className="w-4 h-4 text-chart-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Deadline</p>
                  <p className="text-sm text-foreground">{format(new Date(deadline), "MMMM d, yyyy")} · <span className="text-muted-foreground">{Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 86400000))} days away</span></p>
                </div>
              </div>
            )}
            {milestones.filter(m => m.target).length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-primary/10">
                <Milestone className="w-4 h-4 text-chart-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Monthly Milestones</p>
                  <div className="space-y-1">
                    {milestones.filter(m => m.target).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-xs font-medium text-primary w-16 flex-shrink-0">{m.month}</span>
                        <span className="text-foreground">{m.target}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-chart-3/8 border border-chart-3/20">
            <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0" />
            <p className="text-xs text-chart-3 font-medium">A goal with a system is a plan. Now build a daily system to make it automatic.</p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setStep(3)} className="w-full sm:w-auto"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-save-goal" className="w-full sm:w-auto">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Goal 🎯
            </Button>
          </DialogFooter>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onStatusChange }: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onStatusChange: (id: string, status: Goal['status']) => void;
}) {
  const totalMilestones = goal.milestones?.filter(m => m.target)?.length ?? 0;
  const daysLeft = goal.deadline
    ? differenceInDays(new Date(goal.deadline), new Date())
    : null;

  return (
    <Card
      className={cn(
        "hover-elevate group transition-all duration-200 border",
        goal.status === "completed" && "opacity-80",
        goal.status === "archived" && "opacity-60",
      )}
      data-testid={`goal-card-${goal.id}`}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0 mt-0.5">{categoryIcons[goal.category] || "⭐"}</span>
            <Link href={`/goals/${goal.id}`} className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-sm leading-snug group-hover:text-primary transition-colors cursor-pointer",
                goal.status === "completed" && "line-through text-muted-foreground"
              )}>
                {goal.title}
              </h3>
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="w-7 h-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-goal-menu-${goal.id}`}>
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(goal)} data-testid={`button-edit-goal-${goal.id}`}>
                <Pencil className="w-3.5 h-3.5 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {goal.status !== "active" && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, "active")}>
                  <TrendingUp className="w-3.5 h-3.5 mr-2" />Set Active
                </DropdownMenuItem>
              )}
              {goal.status !== "completed" && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, "completed")}>
                  <Check className="w-3.5 h-3.5 mr-2" />Mark Complete
                </DropdownMenuItem>
              )}
              {goal.status !== "paused" && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, "paused")}>
                  <Archive className="w-3.5 h-3.5 mr-2" />Pause
                </DropdownMenuItem>
              )}
              {goal.status !== "archived" && (
                <DropdownMenuItem onClick={() => onStatusChange(goal.id, "archived")}>
                  <Archive className="w-3.5 h-3.5 mr-2" />Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(goal)}
                className="text-destructive focus:text-destructive"
                data-testid={`button-delete-goal-${goal.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Measurable outcome */}
        {goal.measurableOutcome && (
          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5 leading-relaxed">
            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-chart-3" />
            <span className="line-clamp-2">{goal.measurableOutcome}</span>
          </p>
        )}

        {/* Status badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <Badge variant="outline" className={cn("text-xs capitalize", statusColors[goal.status] || "")}>{goal.status}</Badge>
          <Badge variant="outline" className={cn("text-xs capitalize", priorityColors[goal.priority] || "")}>{goal.priority}</Badge>
          <Badge variant="secondary" className="text-xs capitalize">{goal.category}</Badge>
        </div>

        {/* Footer: deadline + milestones */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {goal.deadline ? (
            <DeadlineBadge deadline={goal.deadline} />
          ) : (
            <span className="text-xs text-muted-foreground/50">No deadline</span>
          )}
          {totalMilestones > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Milestone className="w-3 h-3" />
              {totalMilestones} milestone{totalMilestones !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Days remaining bar for active goals */}
        {goal.status === "active" && goal.deadline && daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{daysLeft} days left</span>
              <Link href={`/goals/${goal.id}`}>
                <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <Progress value={Math.max(5, 100 - (daysLeft / 90) * 100)} className="h-1.5" />
          </div>
        )}
        {goal.status === "completed" && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-chart-3" />
            <span className="text-xs text-chart-3 font-medium">Completed</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_TABS = [
  { value: "all",       label: "All"       },
  { value: "active",    label: "Active"    },
  { value: "completed", label: "Completed" },
  { value: "paused",    label: "Paused"    },
  { value: "archived",  label: "Archived"  },
];

export default function Goals() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const plan = (user?.plan ?? "free") as PlanTier;
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | undefined>();
  const [deleteGoalItem, setDeleteGoalItem] = useState<Goal | undefined>();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");
  const goalLimit = getPlanLimits(plan).goals;
  const atGoalLimit = isAtGoalLimit(plan, activeGoals.length);

  const handleNewGoal = () => {
    if (atGoalLimit) { setUpgradeOpen(true); return; }
    setEditGoal(undefined);
    setDialogOpen(true);
  };

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
    mutationFn: ({ id, status }: { id: string; status: Goal['status'] }) => updateGoal(id, { status }),
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
    onSuccess: () => toast({ title: "Goal updated" }),
  });

  const hasExtraFilters = filterCategory !== "all" || filterPriority !== "all";

  const filtered = useMemo(() => goals.filter(g => {
    const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase()) || (g.measurableOutcome || "").toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" || g.status === activeTab;
    const matchCat = filterCategory === "all" || g.category === filterCategory;
    const matchPriority = filterPriority === "all" || g.priority === filterPriority;
    return matchSearch && matchTab && matchCat && matchPriority;
  }), [goals, search, activeTab, filterCategory, filterPriority]);

  const tabCounts = useMemo(() => ({
    all: goals.length,
    active: goals.filter(g => g.status === "active").length,
    completed: goals.filter(g => g.status === "completed").length,
    paused: goals.filter(g => g.status === "paused").length,
    archived: goals.filter(g => g.status === "archived").length,
  }), [goals]);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden gradient-brand text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-white/80" />
                <p className="text-white/70 text-xs sm:text-sm font-medium">My Goals</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 leading-tight">Track what matters</h1>
              <p className="text-white/80 text-xs sm:text-sm">Set clear targets, define outcomes, and build systems to win.</p>
            </div>
            <Button
              onClick={handleNewGoal}
              data-testid="button-new-goal"
              className="flex-shrink-0 bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
              size="sm"
            >
              {atGoalLimit ? <Lock className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              <span className="hidden sm:inline">New Goal</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* Stats row */}
          {!isLoading && goals.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
              {[
                { label: "Total",     value: goals.length,          icon: Target       },
                { label: "Active",    value: activeGoals.length,    icon: TrendingUp   },
                { label: "Completed", value: completedGoals.length, icon: CheckCircle2 },
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
        {/* Plan limit banner */}
        {goalLimit !== null && (
          <div className={cn(
            "flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm",
            atGoalLimit ? "bg-destructive/5 border-destructive/30 text-destructive" : "bg-muted/40 border-border text-muted-foreground"
          )} data-testid="banner-goal-limit">
            <span className="flex items-center gap-2 text-xs sm:text-sm">
              {atGoalLimit ? <Lock className="w-4 h-4 flex-shrink-0" /> : <Target className="w-4 h-4 flex-shrink-0" />}
              {atGoalLimit
                ? `You've reached the ${goalLimit}-goal limit on the Free plan.`
                : `${activeGoals.length} / ${goalLimit} active goals used on the Free plan.`}
            </span>
            <Link href="/pricing">
              <button className="flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline whitespace-nowrap text-primary" data-testid="link-upgrade-plan">
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade
              </button>
            </Link>
          </div>
        )}

        {/* Educational hint for new users */}
        {goals.length === 0 && !isLoading && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20" data-testid="hint-goals-education">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Goals give you direction. Systems create progress.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A goal is the destination — "I want to get fit." A system is the vehicle — "After breakfast, I do 5 pushups."
                Start with a goal here, then build a system to make daily progress automatic.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={handleNewGoal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Target className="w-3 h-3" />
                  Create your first goal
                </button>
                <Link href="/systems/new">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:opacity-90 transition-opacity border border-border">
                    <Zap className="w-3 h-3" />
                    Build a system
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Search + filter row */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search goals..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9"
                data-testid="input-search-goals"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters || hasExtraFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(f => !f)}
              className="flex-shrink-0"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-background" data-testid="select-filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{categoryIcons[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="bg-background" data-testid="select-filter-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasExtraFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-2 sm:col-span-1 text-muted-foreground"
                  onClick={() => { setFilterCategory("all"); setFilterPriority("all"); }}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {STATUS_TABS.map(tab => {
            const count = tabCounts[tab.value as keyof typeof tabCounts] ?? 0;
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

        {/* Goals grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-2">
              {search || activeTab !== "all" || hasExtraFilters ? "No matching goals" : "No goals yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-5 max-w-xs">
              {search || activeTab !== "all" || hasExtraFilters
                ? "Try adjusting your search or filters."
                : "Create your first goal to get started on your journey."}
            </p>
            {!search && activeTab === "all" && !hasExtraFilters && (
              <Button onClick={handleNewGoal} data-testid="button-create-first-goal-empty">
                <Plus className="w-4 h-4 mr-2" />Create Goal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {filtered.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={g => { setEditGoal(g); setDialogOpen(true); }}
                onDelete={g => setDeleteGoalItem(g)}
                onStatusChange={(id, status) => quickStatus.mutate({ id, status })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto" data-testid="dialog-goal-form">
          <DialogHeader>
            <DialogTitle>{editGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
          </DialogHeader>
          <GoalForm goal={editGoal} userId={userId} onClose={() => { setDialogOpen(false); setEditGoal(undefined); }} />
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)] text-center" data-testid="dialog-goal-limit">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Goal Limit Reached
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              The <span className="font-semibold text-foreground">Free plan</span> allows up to{" "}
              <span className="font-semibold text-foreground">{goalLimit} active goals</span>.
              Upgrade to create unlimited goals and unlock all features.
            </p>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5 text-left">
              <p className="font-semibold text-foreground mb-1">Upgrade benefits</p>
              <p>✓ Unlimited active goals</p>
              <p>✓ Unlimited systems &amp; habits</p>
              <p>✓ AI Coach, insights &amp; reflections</p>
              <p>✓ Priority support</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Link href="/pricing">
              <Button className="w-full gap-2" onClick={() => setUpgradeOpen(false)} data-testid="button-upgrade-from-limit">
                <Sparkles className="w-4 h-4" />
                View Upgrade Plans
              </Button>
            </Link>
            <Button variant="ghost" className="w-full" onClick={() => setUpgradeOpen(false)}>
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGoalItem} onOpenChange={() => setDeleteGoalItem(undefined)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{deleteGoalItem?.title}</strong>"? This will also delete all associated systems and check-ins. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              onClick={() => deleteGoalItem && deleteMutation.mutate(deleteGoalItem.id)}
              data-testid="button-confirm-delete-goal"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
