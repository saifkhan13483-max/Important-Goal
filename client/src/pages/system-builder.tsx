import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import type { System, Goal, Template } from "@/types/schema";
import { getGoals } from "@/services/goals.service";
import { getSystem, createSystem, updateSystem } from "@/services/systems.service";
import { getPublicTemplates } from "@/services/templates.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2, Zap, Lightbulb, Target, Clock, Trophy, ShieldCheck, Eye, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "identity", title: "Identity", icon: Zap, desc: "Who do you become?" },
  { id: "outcome", title: "Outcome", icon: Target, desc: "What's the win?" },
  { id: "trigger", title: "Trigger", icon: Clock, desc: "What starts it?" },
  { id: "action", title: "Action", icon: Check, desc: "The minimum step" },
  { id: "reward", title: "Reward", icon: Trophy, desc: "Celebrate progress" },
  { id: "fallback", title: "Fallback", icon: ShieldCheck, desc: "Plan B" },
  { id: "review", title: "Review", icon: Eye, desc: "Confirm & save" },
];

const tips: Record<string, string> = {
  identity: "Start with identity, not outcome. 'I am a person who...' is more powerful than 'I want to...' — it shifts behavior at a deeper level.",
  outcome: "Be specific. Instead of 'get healthier', say 'lose 10kg by June' or 'complete a 5K race'. Clarity creates urgency.",
  trigger: "The best triggers are existing habits. 'After I brush my teeth' or 'after my morning coffee' — stack new actions onto existing routines.",
  action: "Make the minimum action embarrassingly small. 2 push-ups. 1 page. 1 sentence. The goal is to start — momentum builds automatically.",
  reward: "Rewards should be immediate, not distant. A small celebration after each check-in trains your brain to want to repeat the behavior.",
  fallback: "A fallback plan is your commitment that you'll do *something* even on the worst days. Even 1% effort beats zero.",
  review: "Review your system end-to-end. Does it feel realistic? Is the trigger reliable? Is the action truly minimum?",
};

const examples: Record<string, string[]> = {
  identity: ["I am someone who moves their body every single day.", "I am a consistent reader who learns something new daily.", "I am a person who shows up for their work, even on hard days."],
  trigger: ["After I brush my teeth each morning...", "At 9am, before I check any messages...", "After lunch, before returning to my desk..."],
  action: ["Do 5 push-ups — no more required.", "Read just one page of my book.", "Write 100 words, even if they're bad."],
  reward: ["Make my favourite coffee as a reward.", "Check off my tracker and feel the satisfaction.", "Share my progress with a friend."],
  fallback: ["If I miss morning, I'll do 10 squats before bed.", "If I can't read, I'll listen to 5 minutes of audiobook.", "If I can't write, I'll save 1 idea in my notes — ideas compound."],
};

type FormData = {
  title: string;
  goalId: string;
  identityStatement: string;
  targetOutcome: string;
  whyItMatters: string;
  triggerType: string;
  triggerStatement: string;
  minimumAction: string;
  rewardPlan: string;
  fallbackPlan: string;
  frequency: string;
  preferredTime: string;
};

export default function SystemBuilderPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/systems/:id/edit");
  const isEdit = match && params?.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    title: "", goalId: "", identityStatement: "", targetOutcome: "",
    whyItMatters: "", triggerType: "time", triggerStatement: "",
    minimumAction: "", rewardPlan: "", fallbackPlan: "",
    frequency: "daily", preferredTime: "morning",
  });

  const searchStr = useSearch();
  const templateIdFromQuery = useMemo(() => new URLSearchParams(searchStr).get("template") ?? "", [searchStr]);

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["public-templates"],
    queryFn: () => getPublicTemplates(),
    staleTime: 1000 * 60 * 10,
  });

  const { data: editSystem } = useQuery<System | null>({
    queryKey: ["system", params?.id],
    queryFn: () => getSystem(params!.id),
    enabled: !!isEdit,
  });

  const [templateApplied, setTemplateApplied] = useState(false);

  useEffect(() => {
    if (editSystem) {
      setForm({
        title: editSystem.title || "",
        goalId: editSystem.goalId || "",
        identityStatement: editSystem.identityStatement || "",
        targetOutcome: editSystem.targetOutcome || "",
        whyItMatters: editSystem.whyItMatters || "",
        triggerType: editSystem.triggerType || "time",
        triggerStatement: editSystem.triggerStatement || "",
        minimumAction: editSystem.minimumAction || "",
        rewardPlan: editSystem.rewardPlan || "",
        fallbackPlan: editSystem.fallbackPlan || "",
        frequency: editSystem.frequency || "daily",
        preferredTime: editSystem.preferredTime || "morning",
      });
    }
  }, [editSystem]);

  useEffect(() => {
    if (!isEdit && templateIdFromQuery && templates.length > 0 && !templateApplied) {
      const t = templates.find(tmpl => tmpl.id === templateIdFromQuery);
      if (t) {
        setForm(prev => ({
          ...prev,
          title: prev.title || t.title,
          identityStatement: t.identityStatement || "",
          triggerStatement: t.triggerStatement || "",
          minimumAction: t.minimumAction || "",
          rewardPlan: t.rewardPlan || "",
          fallbackPlan: t.fallbackPlan || "",
        }));
        setTemplateApplied(true);
        toast({ title: `Template applied: ${t.title}`, description: "Customize the fields to make it your own." });
      }
    }
  }, [templateIdFromQuery, templates, isEdit, templateApplied, toast]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? updateSystem(params!.id, data)
        : createSystem(userId, { ...data, active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems", userId] });
      toast({ title: isEdit ? "System updated!" : "System created!", description: "Your system is ready to use." });
      navigate("/systems");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const applyTemplate = (t: Template) => {
    setForm(prev => ({
      ...prev,
      identityStatement: t.identityStatement || "",
      triggerStatement: t.triggerStatement || "",
      minimumAction: t.minimumAction || "",
      rewardPlan: t.rewardPlan || "",
      fallbackPlan: t.fallbackPlan || "",
      title: prev.title || t.title,
    }));
    toast({ title: "Template applied!", description: "Customize the fields to make it your own." });
  };

  const update = (field: keyof FormData, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const validationError = (): string | null => {
    if (step === 0 && form.title.trim().length < 2) return 'Please give your system a title (at least 2 characters).';
    if (step === 1 && form.identityStatement.trim().length > 0 && !form.identityStatement.toLowerCase().includes('i am') && !form.identityStatement.toLowerCase().includes("i'm")) {
      return 'Try framing your identity statement starting with "I am..." — this is more powerful.';
    }
    if (step === 2 && form.triggerStatement.trim().length > 0 && form.triggerStatement.trim().split(' ').length < 3) {
      return 'Be more specific — a good trigger describes exactly when and where.';
    }
    if (step === 3 && form.minimumAction.trim().length < 5) return 'Describe a specific minimum action (at least 5 characters).';
    return null;
  };

  const canProceed = () => {
    if (step === 0) return form.title.trim().length >= 2;
    if (step === 3) return form.minimumAction.trim().length >= 5;
    return true;
  };

  const currentStep = STEPS[step];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/systems")} data-testid="button-back-systems">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{isEdit ? "Edit System" : "Build a System"}</h1>
          <p className="text-muted-foreground text-sm">Step {step + 1} of {STEPS.length}: {currentStep.desc}</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => i < step + 1 && setStep(i)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {step === 0 && !isEdit && templates.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
              Start from a template
            </p>
            <div className="flex flex-wrap gap-2">
              {templates.slice(0, 6).map(t => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(t)}
                  data-testid={`button-template-${t.id}`}
                >
                  {t.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <CurrentIcon className="w-4 h-4 text-primary" />
            </div>
            {currentStep.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 p-3 rounded-md bg-muted/50">
            <Lightbulb className="w-4 h-4 text-chart-4 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{tips[currentStep.id]}</p>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>System Title *</Label>
                <Input
                  placeholder="e.g. Morning Movement Habit"
                  value={form.title}
                  onChange={e => update("title", e.target.value)}
                  data-testid="input-system-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Linked Goal <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={form.goalId} onValueChange={v => update("goalId", v)}>
                  <SelectTrigger data-testid="select-linked-goal">
                    <SelectValue placeholder="Select a goal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No goal linked</SelectItem>
                    {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => update("frequency", v)}>
                    <SelectTrigger data-testid="select-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["daily", "weekdays", "weekends", "weekly"].map(f => (
                        <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Select value={form.preferredTime} onValueChange={v => update("preferredTime", v)}>
                    <SelectTrigger data-testid="select-preferred-time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["morning", "afternoon", "evening", "flexible"].map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Identity Statement</Label>
                <Textarea
                  placeholder="I am someone who..."
                  value={form.identityStatement}
                  onChange={e => update("identityStatement", e.target.value)}
                  rows={3}
                  data-testid="input-identity"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Outcome</Label>
                <Input
                  placeholder="What does success look like in 90 days?"
                  value={form.targetOutcome}
                  onChange={e => update("targetOutcome", e.target.value)}
                  data-testid="input-target-outcome"
                />
              </div>
              <div className="space-y-2">
                <Label>Why It Matters</Label>
                <Textarea
                  placeholder="Why is this important to you?"
                  value={form.whyItMatters}
                  onChange={e => update("whyItMatters", e.target.value)}
                  rows={2}
                  data-testid="input-why-matters"
                />
              </div>
              <ExamplesPanel examples={examples.identity} onSelect={v => update("identityStatement", v)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={form.triggerType} onValueChange={v => update("triggerType", v)}>
                  <SelectTrigger data-testid="select-trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time-based</SelectItem>
                    <SelectItem value="action">Action-based</SelectItem>
                    <SelectItem value="location">Location-based</SelectItem>
                    <SelectItem value="feeling">Feeling-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trigger Statement</Label>
                <Textarea
                  placeholder="After I [existing habit], I will..."
                  value={form.triggerStatement}
                  onChange={e => update("triggerStatement", e.target.value)}
                  rows={3}
                  data-testid="input-trigger"
                />
              </div>
              <ExamplesPanel examples={examples.trigger} onSelect={v => update("triggerStatement", v)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Minimum Action *</Label>
                <Textarea
                  placeholder="The smallest possible action that counts as 'done'"
                  value={form.minimumAction}
                  onChange={e => update("minimumAction", e.target.value)}
                  rows={3}
                  data-testid="input-minimum-action"
                />
                <p className="text-xs text-muted-foreground">Make it so small that you can't say no. You can always do more.</p>
              </div>
              <ExamplesPanel examples={examples.action} onSelect={v => update("minimumAction", v)} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reward Plan</Label>
                <Textarea
                  placeholder="What's your immediate reward after completing this?"
                  value={form.rewardPlan}
                  onChange={e => update("rewardPlan", e.target.value)}
                  rows={3}
                  data-testid="input-reward"
                />
              </div>
              <ExamplesPanel examples={examples.reward} onSelect={v => update("rewardPlan", v)} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fallback Plan</Label>
                <Textarea
                  placeholder="If I miss my trigger, I will still..."
                  value={form.fallbackPlan}
                  onChange={e => update("fallbackPlan", e.target.value)}
                  rows={3}
                  data-testid="input-fallback"
                />
                <p className="text-xs text-muted-foreground">A fallback is your safety net. It keeps your streak alive on hard days.</p>
              </div>
              <ExamplesPanel examples={examples.fallback} onSelect={v => update("fallbackPlan", v)} />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm mb-4">Your System Preview</h3>
              {[
                { label: "System", value: form.title, color: "text-foreground" },
                { label: "Identity", value: form.identityStatement, color: "text-primary" },
                { label: "Trigger", value: form.triggerStatement, color: "text-chart-2" },
                { label: "Action", value: form.minimumAction, color: "text-chart-3" },
                { label: "Reward", value: form.rewardPlan, color: "text-chart-4" },
                { label: "Fallback", value: form.fallbackPlan, color: "text-chart-5" },
              ].map(item => item.value ? (
                <div key={item.label} className="flex gap-3 items-start p-3 rounded-md bg-muted/50">
                  <span className={`text-xs font-bold uppercase tracking-wide ${item.color} mt-0.5 w-16 flex-shrink-0`}>{item.label}</span>
                  <p className="text-sm leading-relaxed">{item.value}</p>
                </div>
              ) : null)}
            </div>
          )}
        </CardContent>
      </Card>

      {validationError() && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2" data-testid="text-validation-hint">
          💡 {validationError()}
        </p>
      )}

      <div className="flex justify-between gap-2">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} data-testid="button-step-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate("/systems")} data-testid="button-cancel-builder">
            Cancel
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} data-testid="button-step-next">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-system">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEdit ? "Save Changes" : "Create System"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ExamplesPanel({ examples, onSelect }: { examples: string[]; onSelect: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Examples — click to use:</p>
      <div className="space-y-1.5">
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onSelect(ex)}
            className="w-full text-left text-xs p-2.5 rounded-md bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            data-testid={`button-example-${i}`}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
