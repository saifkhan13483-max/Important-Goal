import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, SkipForward, Pencil, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { createGoal } from "@/services/goals.service";
import { useAppStore } from "@/store/auth.store";

/* ─── Confetti Component ──────────────────────────────────────────── */
const CONFETTI_COLORS = [
  "#a78bfa", "#818cf8", "#34d399", "#fbbf24", "#f472b6",
  "#60a5fa", "#fb923c", "#e879f9", "#4ade80", "#f87171",
];

function Confetti({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 1.5,
      size: 6 + Math.random() * 7,
      rotate: Math.random() * 360,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }))
  ).current;

  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.shape === "rect" ? 0.5 : 1),
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Static data ────────────────────────────────────────────────── */
const focusAreas = [
  { value: "fitness",      label: "Fitness & Health",    icon: "💪" },
  { value: "study",        label: "Study & Learning",    icon: "📚" },
  { value: "career",       label: "Career Growth",       icon: "🚀" },
  { value: "business",     label: "Business",            icon: "💼" },
  { value: "relationship", label: "Relationships",       icon: "🤝" },
  { value: "mindset",      label: "Mindset & Well-being",icon: "🧠" },
  { value: "finance",      label: "Finance",             icon: "📈" },
  { value: "creativity",   label: "Creativity",          icon: "🎨" },
  { value: "custom",       label: "Something else…",     icon: "✨" },
];

const motivators = [
  { value: "achievement", label: "Achieving a goal",     icon: "🏆", sub: "I love crossing milestones off my list" },
  { value: "growth",      label: "Personal growth",      icon: "🌱", sub: "I want to become a better version of myself" },
  { value: "health",      label: "Feeling good",         icon: "✨", sub: "Energy, mood, and well-being matter most to me" },
  { value: "discipline",  label: "Building discipline",  icon: "🔥", sub: "I want strong routines I can rely on" },
  { value: "connection",  label: "Social accountability",icon: "🤝", sub: "I do better when others are counting on me" },
  { value: "curiosity",   label: "Curiosity & learning", icon: "💡", sub: "I'm driven by exploring and growing my skills" },
];

const experienceLevels = [
  {
    value: "beginner",
    label: "Beginner",
    icon: "🌱",
    sub: "I'm new to building habits — I need clear, simple guidance",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    icon: "⚡",
    sub: "I've tried habit-building before and know the basics",
  },
  {
    value: "advanced",
    label: "Advanced",
    icon: "🚀",
    sub: "I already have solid systems — I want deeper tools and insights",
  },
];

const routineTimes = [
  { value: "morning",   label: "Morning",   sub: "Before 12pm" },
  { value: "afternoon", label: "Afternoon", sub: "12pm – 5pm" },
  { value: "evening",   label: "Evening",   sub: "After 5pm" },
  { value: "flexible",  label: "Flexible",  sub: "It varies" },
];

const reminderHours = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
];

/* ─── Step definitions ───────────────────────────────────────────── */
interface OnboardingData {
  name: string;
  focusArea: string;
  customFocusArea: string;
  motivator: string;
  experience: string;
  goalTitle: string;
  goalDeadline: string;
  routineTime: string;
  remindersEnabled: boolean;
  reminderTime: string;
  preferredTheme: string;
  identityStatement: string;
}

const STEPS = [
  { id: "welcome",    title: "Welcome to SystemForge!",         skippable: false },
  { id: "name",       title: "What should we call you?",        skippable: false },
  { id: "identity",   title: "Who are you becoming?",           skippable: true  },
  { id: "focus",      title: "What's your primary focus?",      skippable: false },
  { id: "motivation", title: "What motivates you most?",        skippable: true  },
  { id: "experience", title: "How experienced are you?",        skippable: false },
  { id: "goal",       title: "Set your first goal",             skippable: true  },
  { id: "time",       title: "When do you like to work?",       skippable: true  },
  { id: "reminders",  title: "Would you like daily reminders?", skippable: true  },
  { id: "done",       title: "You're all set! 🎉",              skippable: false },
];

export default function Onboarding() {
  const { user, updateProfile, updatePending } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setTheme } = useAppStore();
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name:              user?.name || "",
    focusArea:         "",
    customFocusArea:   "",
    motivator:         "",
    experience:        "",
    goalTitle:         "",
    goalDeadline:      "",
    routineTime:       "",
    remindersEnabled:  false,
    reminderTime:      "08:00",
    preferredTheme:    "system",
    identityStatement: "",
  });

  const current = STEPS[step];
  const total   = STEPS.length;

  const effectiveFocusArea = data.focusArea === "custom"
    ? (data.customFocusArea.trim() || "")
    : data.focusArea;

  /* Trigger confetti when we land on the done step */
  useEffect(() => {
    if (current.id === "done") {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [current.id]);

  const canProceed = () => {
    if (current.id === "name")       return data.name.trim().length >= 2;
    if (current.id === "focus")      return !!data.focusArea && (data.focusArea !== "custom" || data.customFocusArea.trim().length >= 2);
    if (current.id === "experience") return !!data.experience;
    return true;
  };

  const handleSkip = () => setStep(s => s + 1);

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(s => s + 1);
      return;
    }

    try {
      await updateProfile({
        name:              data.name.trim() || user?.name,
        focusArea:         effectiveFocusArea || data.focusArea,
        routineTime:       data.routineTime || null,
        preferredTheme:    data.preferredTheme,
        identityStatement: data.identityStatement.trim() || null,
        onboardingCompleted: true,
      } as any);

      if (data.goalTitle.trim() && user?.id) {
        await createGoal(user.id, {
          title:       data.goalTitle.trim(),
          description: "",
          category:    effectiveFocusArea || "other",
          priority:    "high",
          status:      "active",
          deadline:    data.goalDeadline || undefined,
        });
      }

      navigate("/systems/new");
    } catch {
      toast({
        title:       "Error",
        description: "Failed to save preferences. Please try again.",
        variant:     "destructive",
      });
    }
  };

  const subtitleMap: Record<string, string> = {
    welcome:    user ? `Great to have you, ${(user.name || "there").split(" ")[0]}!` : "Let's get started",
    name:       "This is how we'll greet you in the app",
    identity:   "Your identity is the foundation of every system you build",
    focus:      "Choose the area where you want to build systems first",
    motivation: "This helps us tailor your daily prompts and check-in questions",
    experience: "Be honest — there's no wrong answer! We'll adjust the guidance to fit you",
    goal:       "What's one thing you want to achieve? (you can add more later)",
    time:       "Pick the time that fits your natural rhythm",
    reminders:  "A gentle daily nudge can make the difference between good intentions and real results",
    done:       "Your setup is complete. Let's build!",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Confetti active={showConfetti} />

      <div className="w-full max-w-lg">
        {/* Branding + Progress */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < step  ? "bg-primary w-5" :
                  i === step ? "bg-primary w-8" :
                  "bg-muted w-4"
                )}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-2">Step {step + 1} of {total}</p>
          <h1 className="text-2xl font-bold">{current.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitleMap[current.id]}</p>
        </div>

        <Card>
          <CardContent className="p-6">

            {/* Step 0 — Welcome */}
            {current.id === "welcome" && (
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed text-sm text-center">
                  SystemForge helps you turn vague goals into clear daily systems — a{" "}
                  <span className="font-medium text-foreground">system</span>{" "}
                  is a simple, repeatable action tied to your goal.
                  We'll guide you through setting up your identity, triggers, actions, and fallbacks.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { icon: "🎯", text: "Set clear goals" },
                    { icon: "⚡", text: "Build daily systems" },
                    { icon: "🔥", text: "Track your streaks" },
                    { icon: "📖", text: "Reflect and grow" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — Name */}
            {current.id === "name" && (
              <div className="space-y-3">
                <Label htmlFor="ob-name">Your name</Label>
                <Input
                  id="ob-name"
                  placeholder="e.g. Alex Johnson"
                  value={data.name}
                  onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  data-testid="input-onboarding-name"
                  autoFocus
                  className="text-base"
                  onKeyDown={e => { if (e.key === "Enter" && canProceed()) handleNext(); }}
                />
                {data.name.trim().length > 0 && data.name.trim().length < 2 && (
                  <p className="text-xs text-destructive">Name must be at least 2 characters</p>
                )}
              </div>
            )}

            {/* Step 2 — Identity Statement */}
            {current.id === "identity" && (
              <div className="space-y-5">
                <div className="bg-primary/8 rounded-xl p-4 border border-primary/20">
                  <p className="text-sm font-semibold text-primary mb-1">Why this matters</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Research shows that people who build habits around <strong className="text-foreground">identity</strong> — not just outcomes — are far more consistent. 
                    "I am a runner" outlasts "I want to run more."
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-identity" className="text-base font-semibold">
                    Complete this sentence:
                  </Label>
                  <p className="text-sm text-muted-foreground">I AM a person who ___</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm font-medium text-muted-foreground flex-shrink-0">I AM a person who</span>
                    <input
                      id="ob-identity"
                      placeholder="shows up every day, no matter what."
                      value={data.identityStatement}
                      onChange={e => setData(d => ({ ...d, identityStatement: e.target.value }))}
                      data-testid="input-onboarding-identity"
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground/50"
                      onKeyDown={e => { if (e.key === "Enter") handleNext(); }}
                    />
                  </div>
                </div>
                {data.identityStatement.trim() && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Your Identity Statement</p>
                    <p className="text-lg font-bold text-foreground leading-snug">
                      "I AM a person who {data.identityStatement.trim()}."
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Examples:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "exercises every morning, even if just for 5 minutes",
                      "reads every day and keeps learning",
                      "shows up consistently and follows through",
                      "takes care of their body and their mind",
                    ].map(example => (
                      <button
                        key={example}
                        onClick={() => setData(d => ({ ...d, identityStatement: example }))}
                        className="text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        "I AM a person who {example}."
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Focus area */}
            {current.id === "focus" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {focusAreas.map(area => (
                    <button
                      key={area.value}
                      onClick={() => setData(d => ({ ...d, focusArea: area.value }))}
                      data-testid={`button-focus-${area.value}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border text-left transition-all",
                        data.focusArea === area.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <span className="text-xl">{area.icon}</span>
                      <span className="text-sm font-medium">{area.label}</span>
                    </button>
                  ))}
                </div>
                {data.focusArea === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="ob-custom-focus" className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      Describe your focus area
                    </Label>
                    <Input
                      id="ob-custom-focus"
                      placeholder="e.g. Language learning, parenting, spirituality…"
                      value={data.customFocusArea}
                      onChange={e => setData(d => ({ ...d, customFocusArea: e.target.value }))}
                      data-testid="input-custom-focus-area"
                      autoFocus
                      className="text-base"
                      onKeyDown={e => { if (e.key === "Enter" && canProceed()) handleNext(); }}
                    />
                    {data.customFocusArea.trim().length > 0 && data.customFocusArea.trim().length < 2 && (
                      <p className="text-xs text-destructive">Please enter at least 2 characters</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Motivation */}
            {current.id === "motivation" && (
              <div className="grid grid-cols-1 gap-2">
                {motivators.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setData(d => ({ ...d, motivator: m.value }))}
                    data-testid={`button-motivator-${m.value}`}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all",
                      data.motivator === m.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl flex-shrink-0">{m.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
                    </div>
                    {data.motivator === m.value && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 4 — Experience level */}
            {current.id === "experience" && (
              <div className="space-y-3">
                {experienceLevels.map(lvl => (
                  <button
                    key={lvl.value}
                    onClick={() => setData(d => ({ ...d, experience: lvl.value }))}
                    data-testid={`button-experience-${lvl.value}`}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      data.experience === lvl.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    )}
                  >
                    <span className="text-3xl flex-shrink-0">{lvl.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{lvl.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{lvl.sub}</p>
                    </div>
                    {data.experience === lvl.value && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 5 — Primary goal */}
            {current.id === "goal" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-goal">What do you want to achieve?</Label>
                  <Input
                    id="ob-goal"
                    placeholder="e.g. Get fit and build strength"
                    value={data.goalTitle}
                    onChange={e => setData(d => ({ ...d, goalTitle: e.target.value }))}
                    data-testid="input-onboarding-goal"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-deadline">
                    Target deadline{" "}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="ob-deadline"
                    type="date"
                    value={data.goalDeadline}
                    onChange={e => setData(d => ({ ...d, goalDeadline: e.target.value }))}
                    data-testid="input-onboarding-deadline"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                  This will be saved as your first goal. You can edit it anytime from the Goals page.
                </p>
              </div>
            )}

            {/* Step 6 — Routine time */}
            {current.id === "time" && (
              <div className="grid grid-cols-2 gap-3">
                {routineTimes.map(time => (
                  <button
                    key={time.value}
                    onClick={() => setData(d => ({ ...d, routineTime: time.value }))}
                    data-testid={`button-time-${time.value}`}
                    className={cn(
                      "p-4 rounded-md border text-left transition-all",
                      data.routineTime === time.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    )}
                  >
                    <p className="text-sm font-medium">{time.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{time.sub}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 7 — Daily reminders */}
            {current.id === "reminders" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Enable daily reminders</p>
                      <p className="text-xs text-muted-foreground mt-0.5">We'll remind you to check in each day</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.remindersEnabled}
                    onCheckedChange={v => setData(d => ({ ...d, remindersEnabled: v }))}
                    data-testid="toggle-reminders"
                  />
                </div>

                {data.remindersEnabled && (
                  <div className="space-y-3">
                    <Label htmlFor="ob-reminder-time" className="text-sm font-medium">
                      What time should we remind you?
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {reminderHours.map(t => (
                        <button
                          key={t}
                          onClick={() => setData(d => ({ ...d, reminderTime: t }))}
                          data-testid={`button-reminder-${t}`}
                          className={cn(
                            "py-2 rounded-md border text-xs font-medium transition-all",
                            data.reminderTime === t
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-semibold text-foreground">{data.reminderTime}</span>
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground leading-relaxed">
                  💡 People who get daily reminders are <span className="font-semibold text-foreground">3× more likely</span> to maintain a streak for 30+ days.
                  You can change this anytime in Settings.
                </div>
              </div>
            )}

            {/* Step 8 — Done */}
            {current.id === "done" && (
              <div className="space-y-5 text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mx-auto shadow-lg">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-chart-3 flex items-center justify-center text-white text-sm left-1/2 translate-x-5">
                    ✨
                  </div>
                </div>

                <div>
                  <p className="font-bold text-xl">
                    You're ready, {(data.name || user?.name || "there").split(" ")[0]}!
                  </p>
                  <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                    Your profile is set. You're focused on{" "}
                    <span className="font-medium text-foreground capitalize">{effectiveFocusArea || "your goals"}</span>.
                    {data.goalTitle && (
                      <>
                        {" "}Your first goal —{" "}
                        <span className="font-medium text-foreground">"{data.goalTitle}"</span>{" "}
                        — has been saved.
                      </>
                    )}
                  </p>
                </div>

                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {data.experience && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                      {experienceLevels.find(e => e.value === data.experience)?.icon} {data.experience}
                    </span>
                  )}
                  {data.motivator && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-chart-2/10 text-chart-2 text-xs font-medium capitalize">
                      {motivators.find(m => m.value === data.motivator)?.icon} {motivators.find(m => m.value === data.motivator)?.label}
                    </span>
                  )}
                  {data.routineTime && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-chart-3/10 text-chart-3 text-xs font-medium capitalize">
                      🕐 {data.routineTime}
                    </span>
                  )}
                  {data.remindersEnabled && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-chart-4/10 text-chart-4 text-xs font-medium">
                      🔔 Reminders at {data.reminderTime}
                    </span>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
                  <p className="font-medium text-foreground">What happens next:</p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {[
                      "Build your first system around your goal",
                      "Set up a trigger and minimum action",
                      "Check in daily to build unstoppable momentum",
                    ].map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep(s => s - 1)}
                  data-testid="button-onboarding-back"
                  disabled={updatePending}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {current.skippable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={updatePending}
                    data-testid="button-onboarding-skip"
                    className="text-muted-foreground"
                  >
                    <SkipForward className="w-3.5 h-3.5 mr-1.5" />
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || updatePending}
                  data-testid="button-onboarding-next"
                >
                  {updatePending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {step === total - 1 ? "Build my first system" : "Continue"}
                  {step < total - 1 && !updatePending && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full skip */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Want to explore first?{" "}
          <button
            className="underline hover:text-foreground transition-colors"
            onClick={async () => {
              try {
                await updateProfile({ onboardingCompleted: true } as any);
                navigate("/dashboard");
              } catch {
                navigate("/dashboard");
              }
            }}
            data-testid="button-skip-all-onboarding"
          >
            Skip setup and go to dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
