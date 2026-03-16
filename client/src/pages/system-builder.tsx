import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute, useSearch } from "wouter";
import { useAppStore } from "@/store/auth.store";
import type { System, Goal, Template } from "@/types/schema";
import { getGoals } from "@/services/goals.service";
import { getSystem, createSystem, updateSystem } from "@/services/systems.service";
import { getPublicTemplates } from "@/services/templates.service";
import { suggestSystemField } from "@/services/ai.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Zap, Lightbulb, Target,
  Clock, Trophy, ShieldCheck, Eye, LayoutTemplate, Brain, Heart, Repeat, Sparkles, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS_FULL = [
  {
    id: "identity",
    title: "Who do you want to become?",
    shortTitle: "Identity",
    icon: Brain,
    desc: "Start with the type of person you're becoming — not just what you want to do.",
    why: "Research shows that identity-based habits stick longer than outcome-based ones. When you see yourself as 'someone who exercises', you're far more likely to keep going.",
  },
  {
    id: "outcome",
    title: "What does success look like?",
    shortTitle: "Your Goal",
    icon: Target,
    desc: "Be specific about what you're aiming for and why it matters to you.",
    why: "Vague goals fade. Specific goals with a clear 'why' create urgency and meaning. Linking your system to a bigger goal keeps you focused when motivation dips.",
  },
  {
    id: "trigger",
    title: "When will this habit happen?",
    shortTitle: "Trigger",
    icon: Zap,
    desc: "Choose the exact moment or situation that will cue your habit every day.",
    why: "The best habits are anchored to existing routines. When you say 'after I brush my teeth', your brain connects the new habit to something you already do — zero friction.",
  },
  {
    id: "action",
    title: "What is the smallest version of this habit?",
    shortTitle: "Minimum Action",
    icon: Check,
    desc: "Define the smallest possible action that still counts as 'done' for today.",
    why: "Making habits embarrassingly small removes the mental barrier to starting. You can always do more — but the goal is to never say no to starting.",
  },
  {
    id: "reward",
    title: "How will you celebrate right away?",
    shortTitle: "Reward",
    icon: Trophy,
    desc: "Plan an immediate reward for completing your habit — even a tiny one.",
    why: "Immediate rewards wire your brain to associate the habit with pleasure. This creates a genuine want to repeat it, not just willpower.",
  },
  {
    id: "fallback",
    title: "If you miss a day, what's your backup plan?",
    shortTitle: "Backup Plan",
    icon: ShieldCheck,
    desc: "Plan an even smaller version of the habit for hard days — so you never fully break the chain.",
    why: "The fallback plan is your safety net. It keeps your streak alive on your worst days. One pushup beats zero pushups. Always.",
  },
  {
    id: "review",
    title: "Your system is ready — let's review it",
    shortTitle: "Review",
    icon: Eye,
    desc: "Look over everything you've built. Does it feel realistic? That's the goal.",
    why: "",
  },
];

const STEPS_QUICK = [
  {
    id: "identity",
    title: "Who do you want to become?",
    shortTitle: "Identity",
    icon: Brain,
    desc: "Name your system and the person you're becoming.",
    why: "Identity-based habits stick. 'I am someone who exercises' outlasts 'I want to get fit.'",
  },
  {
    id: "trigger",
    title: "After what moment will you do this?",
    shortTitle: "Trigger",
    icon: Zap,
    desc: "Anchor your habit to something that already happens every day.",
    why: "The best triggers are existing habits — they create automatic cues with zero friction.",
  },
  {
    id: "action",
    title: "What's the tiniest action that counts?",
    shortTitle: "Action",
    icon: Check,
    desc: "Pick something so small you'd do it sick, tired, or on your worst day.",
    why: "Embarrassingly small actions are nearly impossible to skip. You can always do more — but never skip starting.",
  },
];

const tips: Record<string, string> = {
  identity: "Try starting with 'I am someone who...' — this small shift is surprisingly powerful. It makes the habit part of who you are, not just something you're trying to do.",
  outcome: "Be specific. 'Get fit' is vague. 'Be able to do 20 pushups in a row by June' is a target you can work toward. Attach it to one of your goals for extra accountability.",
  trigger: "The best triggers are existing habits. 'After I brush my teeth' or 'after my morning coffee' — stack new actions onto existing routines for near-zero friction.",
  action: "Make it embarrassingly small. 2 push-ups. 1 page. 1 sentence. The goal is to never say no to starting — you can always do more once you've begun.",
  reward: "Your reward should be immediate, not 'I'll buy myself something next month'. A small celebration after each check-in trains your brain to want to repeat the habit.",
  fallback: "A fallback keeps your streak alive on the worst days. Even 1% effort beats zero. Think of it as your rainy-day plan — your commitment to yourself that something is always better than nothing.",
  review: "Review your system end-to-end. Does the trigger feel reliable? Is the minimum action truly small enough that you'd do it sick, tired, or unmotivated? That's the test.",
};

const examples: Record<string, string[]> = {
  identity: [
    "I am someone who moves their body every single day.",
    "I am a consistent reader who learns something new daily.",
    "I am a person who shows up for their work, even on hard days.",
  ],
  trigger: [
    "After I brush my teeth each morning…",
    "At 9am, before I check any messages…",
    "After lunch, before returning to my desk…",
  ],
  action: [
    "Do 5 push-ups — no more required.",
    "Read just one page of my book.",
    "Write 100 words, even if they're bad.",
  ],
  reward: [
    "Make my favourite coffee as a reward.",
    "Check off my tracker and feel the satisfaction.",
    "Share my progress with a friend.",
  ],
  fallback: [
    "If I miss morning, I'll do 10 squats before bed.",
    "If I can't read, I'll listen to 5 minutes of audiobook.",
    "If I can't write, I'll save 1 idea in my notes.",
  ],
};

const stepVariants = {
  enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: (d: number) => ({
    x: d > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" as const },
  }),
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

function ExamplesPanel({ examples: exs, onSelect }: { examples: string[]; onSelect: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Example — click to use
      </p>
      <div className="flex flex-wrap gap-2">
        {exs.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onSelect(ex)}
            className="text-xs text-left px-3 py-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all leading-relaxed"
            data-testid={`example-chip-${ex.slice(0, 20).replace(/\s/g, "-")}`}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function TriggerWarning({ value }: { value: string }) {
  const lower = value.toLowerCase().trim();
  if (!lower) return null;

  const vaguePatterns = [
    { test: /\bmorning\b(?!\s+coffee|\s+run|\s+shower|\s+commute|\s+walk|\s+routine|\s+workout)/i, message: 'Too vague. Try "After I make my morning coffee" or "At 7:00 AM after brushing."' },
    { test: /^(at night|tonight|evening|later|soon|someday|sometime)$/i, message: 'Too vague. Try "After dinner, before I sit on the couch" or "At 9 PM after washing up."' },
    { test: /when\s+i\s+(feel|get|am)\s+(motivated|inspired|in the mood|ready|free)/i, message: 'A good system works without motivation. Choose a moment that already happens — like "after coffee" or "before lunch."' },
    { test: /whenever|anytime|as soon as i can|if i remember/i, message: 'Flexible triggers rarely fire. Pick a specific, reliable moment that happens every day.' },
    { test: /^(daily|every day|each day)$/i, message: 'More specific helps. Try "After I brush my teeth" or "At 8 AM after breakfast."' },
  ];

  for (const p of vaguePatterns) {
    if (p.test.test(lower)) {
      return (
        <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mt-2">
          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{p.message}</p>
        </div>
      );
    }
  }
  return null;
}

export default function SystemBuilderPage() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/systems/:id/edit");
  const isEdit = match && params?.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [quickMode, setQuickMode] = useState(!isEdit);
  const STEPS = quickMode ? STEPS_QUICK : STEPS_FULL;

  const [form, setForm] = useState<FormData>({
    title: "",
    goalId: "",
    identityStatement: "",
    targetOutcome: "",
    whyItMatters: "",
    triggerType: "time",
    triggerStatement: "",
    minimumAction: "",
    rewardPlan: "",
    fallbackPlan: "",
    frequency: "daily",
    preferredTime: "morning",
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
      if (isEdit) {
        toast({ title: "System updated!", description: "Your changes have been saved." });
        navigate("/systems");
      } else if (quickMode) {
        toast({ title: "System activated!", description: "Your system is live. Complete your first check-in now." });
        navigate("/checkins");
      } else {
        toast({ title: "System created!", description: "Your system is ready to use." });
        navigate("/checkins");
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const applyTemplate = (t: Template) => {
    setForm(prev => ({
      ...prev,
      title: prev.title || t.title,
      identityStatement: t.identityStatement || "",
      triggerStatement: t.triggerStatement || "",
      minimumAction: t.minimumAction || "",
      rewardPlan: t.rewardPlan || "",
      fallbackPlan: t.fallbackPlan || "",
    }));
    toast({ title: "Template applied!", description: "Customize the fields to make it your own." });
  };

  const update = (field: keyof FormData, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const [aiSuggesting, setAiSuggesting] = useState<string | null>(null);

  const handleAiSuggest = async (field: "trigger" | "minimumAction" | "fallbackPlan") => {
    if (aiSuggesting) return;
    setAiSuggesting(field);
    try {
      const suggestion = await suggestSystemField(field, {
        title: form.title,
        identityStatement: form.identityStatement,
        triggerStatement: form.triggerStatement,
        minimumAction: form.minimumAction,
      });
      if (suggestion) update(field, suggestion);
      toast({ title: "AI suggestion applied!", description: "Feel free to edit it to make it your own." });
    } catch (err: any) {
      toast({ title: "AI suggestion failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setAiSuggesting(null);
    }
  };

  const currentStepId = STEPS[step]?.id;

  const validationError = (): string | null => {
    if (currentStepId === "identity" && form.title.trim().length < 2)
      return "Give your system a short name — at least 2 characters. Example: 'Morning Movement'.";
    if (currentStepId === "identity" && form.identityStatement.trim().length > 0
      && !form.identityStatement.toLowerCase().includes("i am")
      && !form.identityStatement.toLowerCase().includes("i'm"))
      return 'Try framing this starting with "I am…" — it makes it feel more personal and powerful.';
    if (currentStepId === "trigger" && form.triggerStatement.trim().length > 0
      && form.triggerStatement.trim().split(" ").length < 3)
      return "Be more specific — describe exactly when and where this habit will happen.";
    if (currentStepId === "action" && form.minimumAction.trim().length < 5)
      return "Describe your minimum action in a little more detail (at least 5 characters).";
    return null;
  };

  const canProceed = () => {
    if (currentStepId === "identity") return form.title.trim().length >= 2;
    if (currentStepId === "action") return form.minimumAction.trim().length >= 5;
    return true;
  };

  const currentStep = STEPS[step];
  const CurrentIcon = currentStep.icon;
  const pct = Math.round(((step) / (STEPS.length - 1)) * 100);

  const previewFields = [
    { label: "Who I'm becoming",  value: form.identityStatement, icon: Brain,       color: "text-primary" },
    { label: "Target outcome",    value: form.targetOutcome,     icon: Target,      color: "text-chart-2" },
    { label: "Why it matters",    value: form.whyItMatters,      icon: Heart,       color: "text-chart-5" },
    { label: "Trigger",           value: form.triggerStatement,  icon: Zap,         color: "text-chart-3" },
    { label: "Minimum action",    value: form.minimumAction,     icon: Check,       color: "text-chart-4" },
    { label: "Reward plan",       value: form.rewardPlan,        icon: Trophy,      color: "text-chart-4" },
    { label: "Fallback plan",     value: form.fallbackPlan,      icon: ShieldCheck, color: "text-muted-foreground" },
  ].filter(f => f.value?.trim());

  return (
    <div className="p-5 md:p-6 max-w-screen-lg mx-auto">
      <div className="flex gap-8">
        {/* ── Left: Builder form ── */}
        <div className="flex-1 min-w-0 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/systems")} data-testid="button-back-systems">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight">{isEdit ? "Edit System" : "Build a New System"}</h1>
          <p className="text-muted-foreground text-sm">
            Step {step + 1} of {STEPS.length} · {currentStep.shortTitle}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">{pct}% done</Badge>
      </div>

      {/* Quick Start / Full Build mode toggle */}
      {!isEdit && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50 self-start">
          <button
            onClick={() => { setQuickMode(true); setStep(0); }}
            data-testid="button-mode-quick"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              quickMode
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Quick Start
            <span className="text-[10px] font-normal opacity-70">~60s</span>
          </button>
          <button
            onClick={() => { setQuickMode(false); setStep(0); }}
            data-testid="button-mode-full"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              !quickMode
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Full Build
          </button>
        </div>
      )}

      {/* Phase 5 — Screen reader announcement for wizard step changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Step {step + 1} of {STEPS.length}: {currentStep.shortTitle}
      </div>

      {/* Progress bar */}
      <div
        role="group"
        aria-label={`Wizard progress: step ${step + 1} of ${STEPS.length}`}
      >
        <div className="flex gap-1" role="list" aria-label="Wizard steps">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              role="listitem"
              onClick={() => i <= step && setStep(i)}
              title={s.shortTitle}
              aria-label={`${s.shortTitle} — ${i < step ? "completed" : i === step ? "current step" : "upcoming"}`}
              aria-current={i === step ? "step" : undefined}
              disabled={i > step}
              data-touch-target="compact"
              className={cn(
                "h-2 flex-1 rounded-full transition-all",
                i < step ? "bg-primary cursor-pointer" :
                i === step ? "bg-primary" :
                "bg-muted cursor-default",
              )}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">{currentStep.shortTitle}</span>
          <span className="text-xs text-muted-foreground">{STEPS.length - step - 1} steps remaining</span>
        </div>
      </div>

      {/* Template picker on identity step */}
      {currentStepId === "identity" && !isEdit && templates.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              Don't know where to start?
            </p>
            <p className="text-xs text-muted-foreground mb-3">Pick a template — it will fill in the fields for you. You can customize everything.</p>
            <div className="flex flex-wrap gap-2">
              {templates.slice(0, 6).map(t => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(t)}
                  className="text-xs h-7"
                  data-testid={`button-template-${t.id}`}
                >
                  {t.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CurrentIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-snug">{currentStep.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{currentStep.desc}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div key={step} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
          {/* Why this matters */}
          {currentStep.why && (
            <div className="flex gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5 uppercase tracking-wide">Why this matters</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentStep.why}</p>
              </div>
            </div>
          )}

          {/* ── Step 0: Identity ── */}
          {currentStepId === "identity" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-system-title" className="font-semibold">
                  Give your system a name <span className="text-destructive" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </Label>
                <p className="text-xs text-muted-foreground" id="hint-system-title">Something short and meaningful. You'll see this in your daily check-ins.</p>
                <Input
                  id="field-system-title"
                  aria-describedby="hint-system-title"
                  aria-required="true"
                  placeholder="e.g. Morning Movement, Daily Reading, Focus Block"
                  value={form.title}
                  onChange={e => update("title", e.target.value)}
                  data-testid="input-system-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-identity" className="font-semibold">Who are you becoming? <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <p className="text-xs text-muted-foreground" id="hint-identity">Start with "I am someone who…" to make this feel personal.</p>
                <Textarea
                  id="field-identity"
                  aria-describedby="hint-identity"
                  placeholder="I am someone who…"
                  value={form.identityStatement}
                  onChange={e => update("identityStatement", e.target.value)}
                  rows={3}
                  data-testid="input-identity"
                />
              </div>
              <ExamplesPanel examples={examples.identity} onSelect={v => update("identityStatement", v)} />
            </div>
          )}

          {/* ── Step 1: Outcome ── */}
          {currentStepId === "outcome" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">What does success look like?</Label>
                <p className="text-xs text-muted-foreground">Be specific. Instead of "get fit", try "do 20 pushups in a row by June".</p>
                <Input
                  placeholder="What does success look like in 90 days?"
                  value={form.targetOutcome}
                  onChange={e => update("targetOutcome", e.target.value)}
                  data-testid="input-target-outcome"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Why does this matter to you?</Label>
                <p className="text-xs text-muted-foreground">Your "why" is your fuel when motivation fades. Be honest with yourself.</p>
                <Textarea
                  placeholder="This matters to me because…"
                  value={form.whyItMatters}
                  onChange={e => update("whyItMatters", e.target.value)}
                  rows={3}
                  data-testid="input-why-matters"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">
                  Link to a goal <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground">Connect this system to one of your big goals for extra context.</p>
                <Select value={form.goalId || "none"} onValueChange={v => update("goalId", v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="select-linked-goal">
                    <SelectValue placeholder="Select a goal…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal linked</SelectItem>
                    {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Step 2: Trigger ── */}
          {currentStepId === "trigger" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">What type of cue will start this habit?</Label>
                <p className="text-xs text-muted-foreground">Choose the kind of trigger that fits your daily routine.</p>
                <Select value={form.triggerType} onValueChange={v => update("triggerType", v)}>
                  <SelectTrigger data-testid="select-trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time-based (e.g. "At 7am every morning")</SelectItem>
                    <SelectItem value="action">Action-based (e.g. "After I brush my teeth")</SelectItem>
                    <SelectItem value="location">Location-based (e.g. "When I sit at my desk")</SelectItem>
                    <SelectItem value="feeling">Feeling-based (e.g. "When I feel stressed")</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Describe your trigger</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                    onClick={() => handleAiSuggest("trigger")}
                    disabled={!form.title.trim() || !!aiSuggesting}
                    data-testid="button-ai-suggest-trigger"
                  >
                    {aiSuggesting === "trigger" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                    AI Suggest
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Write the exact situation. The more specific, the better it works.</p>
                <Textarea
                  placeholder="After I [existing habit]… / At [time] when I [context]…"
                  value={form.triggerStatement}
                  onChange={e => update("triggerStatement", e.target.value)}
                  rows={3}
                  data-testid="input-trigger"
                />
              </div>
              <ExamplesPanel examples={examples.trigger} onSelect={v => update("triggerStatement", v)} />
              <TriggerWarning value={form.triggerStatement} />
            </div>
          )}

          {/* ── Step 3: Action ── */}
          {currentStepId === "action" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">
                    What's the smallest version of this habit? <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                    onClick={() => handleAiSuggest("minimumAction")}
                    disabled={!form.title.trim() || !!aiSuggesting}
                    data-testid="button-ai-suggest-action"
                  >
                    {aiSuggesting === "minimumAction" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                    AI Suggest
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Think: what would you still do if you were sick, tired, or having the worst day? That's your minimum. Keep it tiny on purpose.
                </p>
                <Textarea
                  placeholder="The smallest possible thing that still counts as 'done'…"
                  value={form.minimumAction}
                  onChange={e => update("minimumAction", e.target.value)}
                  rows={3}
                  data-testid="input-minimum-action"
                />
              </div>
              <div className="p-3.5 rounded-xl bg-chart-3/8 border border-chart-3/15">
                <p className="text-xs font-semibold text-chart-3 mb-0.5 uppercase tracking-wide">Keep it simple</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Small actions done consistently beat big plans done rarely. Start with less than you think you need. You can always do more.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" /> How often?
                  </Label>
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
                  <Label className="font-semibold text-sm flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Best time?
                  </Label>
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
              <ExamplesPanel examples={examples.action} onSelect={v => update("minimumAction", v)} />
            </div>
          )}

          {/* ── Step 4: Reward ── */}
          {currentStepId === "reward" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">How will you celebrate right after completing this?</Label>
                <p className="text-xs text-muted-foreground">It doesn't have to be big — even a moment of satisfaction counts. Immediate rewards wire your brain to repeat the habit.</p>
                <Textarea
                  placeholder="Right after I complete this, I will…"
                  value={form.rewardPlan}
                  onChange={e => update("rewardPlan", e.target.value)}
                  rows={3}
                  data-testid="input-reward"
                />
              </div>
              <ExamplesPanel examples={examples.reward} onSelect={v => update("rewardPlan", v)} />
            </div>
          )}

          {/* ── Step 5: Fallback Plan ── */}
          {currentStepId === "fallback" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">On your worst day, what's the absolute minimum you'll still do?</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                    onClick={() => handleAiSuggest("fallbackPlan")}
                    disabled={!form.title.trim() || !!aiSuggesting}
                    data-testid="button-ai-suggest-fallback"
                  >
                    {aiSuggesting === "fallbackPlan" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                    AI Suggest
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is your safety net. It's not failure — it's commitment. Even 1 pushup beats 0 pushups. One sentence beats nothing.
                </p>
                <Textarea
                  placeholder="If I miss my trigger or feel terrible, I will still do at least…"
                  value={form.fallbackPlan}
                  onChange={e => update("fallbackPlan", e.target.value)}
                  rows={3}
                  data-testid="input-fallback"
                />
              </div>
              <ExamplesPanel examples={examples.fallback} onSelect={v => update("fallbackPlan", v)} />
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-xs font-semibold text-primary mb-0.5">Remember</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "On hard days, your backup plan keeps you moving. Missing one day is not failure. Getting back the next day is success."
                </p>
              </div>
            </div>
          )}

          {/* ── Step 6: Review ── */}
          {currentStepId === "review" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-chart-3/8 border border-chart-3/20 mb-2">
                <p className="text-sm font-semibold text-chart-3 mb-0.5">🎉 Your system is ready!</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Review what you've built below. Does the trigger feel reliable? Is the action small enough you'd do it on your worst day? If yes, save it!
                </p>
              </div>
              {[
                { label: "System Name",       value: form.title,             icon: Zap,         color: "text-foreground" },
                { label: "Who I'm becoming",  value: form.identityStatement, icon: Brain,       color: "text-primary" },
                { label: "What success looks like", value: form.targetOutcome, icon: Target,    color: "text-chart-2" },
                { label: "Why it matters",    value: form.whyItMatters,      icon: Heart,       color: "text-chart-5" },
                { label: "When it happens",   value: form.triggerStatement,  icon: Zap,         color: "text-chart-3" },
                { label: "Smallest action",   value: form.minimumAction,     icon: Check,       color: "text-chart-4" },
                { label: "My reward",         value: form.rewardPlan,        icon: Trophy,      color: "text-chart-4" },
                { label: "Backup plan",       value: form.fallbackPlan,      icon: ShieldCheck, color: "text-muted-foreground" },
                {
                  label: "Schedule",
                  value: form.frequency && form.preferredTime
                    ? `${form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)} · ${form.preferredTime}`
                    : null,
                  icon: Clock,
                  color: "text-muted-foreground",
                },
              ].filter(item => item.value).map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-3 items-start p-3.5 rounded-xl bg-muted/30 border border-border/40">
                    <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${item.color}`}>{item.label}</p>
                      <p className="text-sm leading-relaxed">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Validation hint */}
      {validationError() && (
        <div
          className="flex gap-2 p-3.5 rounded-xl text-amber-700 dark:text-amber-300 bg-amber-500/8 border border-amber-500/20"
          data-testid="text-validation-hint"
        >
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{validationError()}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2 pb-4">
        {step > 0 ? (
          <Button variant="outline" onClick={() => { setDirection(-1); setStep(s => s - 1); }} data-testid="button-step-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate("/systems")} data-testid="button-cancel">
            Cancel
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button onClick={() => { setDirection(1); setStep(s => s + 1); }} disabled={!canProceed()} data-testid="button-step-next">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="gradient-brand text-white border-0 min-w-[130px]"
            data-testid="button-save-system"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {isEdit ? "Save Changes" : quickMode ? "Activate System" : "Save System"}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Quick mode upsell to Full Build */}
      {quickMode && step === STEPS.length - 1 && (
        <p className="text-xs text-center text-muted-foreground -mt-1 pb-2">
          Want to add a reward, fallback plan, or link a goal?{" "}
          <button
            onClick={() => { setQuickMode(false); setStep(0); }}
            className="text-primary underline underline-offset-2 hover:no-underline"
            data-testid="button-switch-to-full"
          >
            Switch to Full Build
          </button>
        </p>
      )}
        </div>

        {/* ── Right: Coach tips sidebar ── */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Coach tip
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tips[currentStep.id] ?? "Keep going — you're building something that will actually stick."}
                </p>
              </CardContent>
            </Card>

            {previewFields.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    Your system so far
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {previewFields.map(f => {
                    const Icon = f.icon;
                    return (
                      <div key={f.label} className="flex gap-2 items-start">
                        <Icon className={`w-3 h-3 mt-1 flex-shrink-0 ${f.color}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground">{f.label}</p>
                          <p className="text-xs leading-relaxed line-clamp-2">{f.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
